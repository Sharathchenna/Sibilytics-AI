# Backend API Documentation for Frontend

## Base URL
```
https://api.sibilytics-ai.in
```

**Local Development:**
```
http://localhost:8000
```

## Overview
This API provides signal processing capabilities using wavelet decomposition, FFT analysis, and statistical feature extraction. It's optimized for handling large datasets (up to 830k+ data points) with intelligent downsampling using the LTTB (Largest-Triangle-Three-Buckets) algorithm.

---

## Endpoints

### 1. Health Check

#### `GET /`
Check if the API is running.

**Response:**
```json
{
  "message": "Feature Extraction API",
  "status": "healthy"
}
```

---

### 2. File Upload (Basic)

#### `POST /api/upload`
Upload and parse a signal file to get basic information.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File): Tab-delimited text file

**Response:**
```json
{
  "filename": "signal_data.txt",
  "columns": 2,
  "rows": 830000,
  "status": "success"
}
```

---

### 3. File Upload with Progress (Recommended)

#### `POST /api/upload-with-progress`
Upload file with caching support and optional gzip compression. Returns a `file_id` that can be reused in subsequent requests to avoid re-uploading.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File): Tab-delimited text file (optionally gzip-compressed)

**Features:**
- Supports gzip compression for faster uploads (reduce bandwidth by 50-90%)
- Caches file server-side with unique `file_id`
- `file_id` can be reused in `/api/process` and `/api/plots/batch`

**Response:**
```json
{
  "filename": "signal_data.txt",
  "file_id": "abc123def456_signal_data.txt",
  "columns": 2,
  "rows": 830000,
  "status": "success",
  "message": "File uploaded and cached successfully",
  "upload_time": "2.45s",
  "compressed": true,
  "compression_method": "gzip",
  "compressed_size_mb": "12.50",
  "original_size_mb": "45.30",
  "compression_ratio": "3.62x",
  "size_reduction_percent": "72.4%",
  "bandwidth_saved_mb": "32.80",
  "decompress_time": "0.15s"
}
```

**Frontend Implementation (with gzip compression):**
```javascript
// Compress file using browser's CompressionStream
const compressFile = async (file) => {
  const stream = file.stream();
  const compressedStream = stream.pipeThrough(
    new CompressionStream('gzip')
  );
  const compressedBlob = await new Response(compressedStream).blob();
  return new File([compressedBlob], file.name + '.gz', { 
    type: 'application/gzip' 
  });
};

// Upload compressed file
const formData = new FormData();
const compressed = await compressFile(file);
formData.append('file', compressed);

const response = await fetch('/api/upload-with-progress', {
  method: 'POST',
  body: formData
});
const data = await response.json();
console.log('File ID:', data.file_id); // Save this for later use
```

---

### 4. Process Signal

#### `POST /api/process`
Process signal with wavelet decomposition and calculate statistical features.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, optional): Signal file (if not using cached file)
  - `file_id` (string, optional): Cached file ID from upload
  - `time_column` (int): Column index for time data (0-indexed)
  - `signal_column` (int): Column index for signal data (0-indexed)
  - `wavelet_type` (string): Wavelet family (e.g., `"db4"`, `"sym5"`, `"coif3"`)
  - `n_levels` (int): Number of decomposition levels (e.g., `5`)

**Note:** Either `file` or `file_id` must be provided. Using `file_id` is recommended for better performance.

**Response:**
```json
{
  "time": [0.0, 0.00005, 0.0001, ...],
  "raw_signal": [0.123, 0.456, ...],
  "denoised_signal": [0.120, 0.450, ...],
  "wavelet_coeffs": {
    "approximation": [0.15, 0.23, ...],
    "detail": [[0.01, 0.02, ...], [0.03, 0.04, ...]]
  },
  "statistics": {
    "Mean": 0.0012,
    "Median": 0.0010,
    "Mode": 0.0009,
    "Std Dev": 0.045,
    "Variance": 0.002,
    "Mean Square": 0.0021,
    "RMS": 0.046,
    "Max": 0.234,
    "Peak-to-Peak": 0.468,
    "Peak-to-RMS": 5.087,
    "Skewness": 0.123,
    "Kurtosis": 3.456,
    "Energy": 12.34,
    "Power": 5.67,
    "Crest Factor": 5.087,
    "Impulse Factor": 195.0,
    "Shape Factor": 38.33,
    "Shannon Entropy": 8.234,
    "Signal-to-Noise Ratio": 25.6,
    "Root Mean Square Error": 0.046,
    "Maximum Error": 0.234,
    "Mean Absolute Error": 0.032,
    "Peak Signal-to-Noise Ratio": 0.0,
    "Coefficient of Variation": 37.5
  },
  "filename": "signal_data.txt"
}
```

**Frontend Example:**
```javascript
const formData = new FormData();
formData.append('file_id', savedFileId); // Use cached file
formData.append('time_column', '0');
formData.append('signal_column', '1');
formData.append('wavelet_type', 'db4');
formData.append('n_levels', '5');

const response = await fetch('/api/process', {
  method: 'POST',
  body: formData
});
const data = await response.json();
```

---

### 5. Download Statistics

#### `POST /api/download-stats`
Download statistics as a CSV file.

**Request:**
- **Content-Type:** `application/json`
- **Body:** Statistics object from `/api/process` response

```json
{
  "Mean": 0.0012,
  "Median": 0.0010,
  ...
}
```

**Response:**
- **Content-Type:** `text/csv`
- CSV file with statistics

**Frontend Example:**
```javascript
const response = await fetch('/api/download-stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(statistics)
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'statistics.csv';
a.click();
```

---

### 6. Generate Signal Plot

#### `POST /api/plot/signal`
Generate signal plot data with LTTB downsampling (830k → 15k points).

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File): Signal file
  - `time_column` (int): Time column index
  - `signal_column` (int): Signal column index
  - `wavelet_type` (string): Wavelet family
  - `n_levels` (int): Decomposition levels
  - `signal_type` (string): `"raw"` or `"denoised"`

**Response:**
```json
{
  "type": "scatter",
  "data": {
    "x": [0.0, 0.00005, ...],
    "y": [0.123, 0.456, ...],
    "name": "Raw Signal",
    "color": "#1f77b4"
  },
  "layout": {
    "xaxis_title": "Time (s)",
    "yaxis_title": "Amplitude (V)",
    "title": "Raw Signal"
  },
  "metadata": {
    "original_points": 830000,
    "downsampled_points": 15000,
    "compression_ratio": "55.3x",
    "processing_time": "0.456s"
  }
}
```

---

### 7. Generate FFT Plot

#### `POST /api/plot/fft`
Generate FFT analysis plot data.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File): Signal file
  - `time_column` (int): Time column index
  - `signal_column` (int): Signal column index
  - `wavelet_type` (string): Wavelet family
  - `n_levels` (int): Decomposition levels
  - `fft_type` (string): `"raw"`, `"denoised"`, `"approx"`, or `"detail"`

**Response:**
```json
{
  "type": "scatter",
  "data": {
    "traces": [
      {
        "x": [100, 150, 200, ...],
        "y": [0.5, 1.2, 0.8, ...],
        "name": "FFT of Denoised Signal",
        "color": "#ff7f0e"
      }
    ]
  },
  "layout": {
    "xaxis_title": "Frequency (Hz)",
    "yaxis_title": "Amplitude (V)",
    "title": "FFT Analysis (denoised)"
  },
  "metadata": {
    "processing_time": "0.234s",
    "num_traces": 1
  }
}
```

---

### 8. Generate Wavelet Plot

#### `POST /api/plot/wavelet`
Generate wavelet coefficients or correlation plot.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File): Signal file
  - `time_column` (int): Time column index
  - `signal_column` (int): Signal column index
  - `wavelet_type` (string): Wavelet family
  - `n_levels` (int): Decomposition levels
  - `wavelet_option` (string): `"approx"`, `"detail"`, `"pearson_approx"`, or `"pearson_detail"`

**Response (for approx/detail):**
```json
{
  "type": "scatter",
  "data": {
    "traces": [
      {
        "x": [0, 1, 2, ...],
        "y": [0.15, 0.23, ...],
        "name": "Approximation Coefficients",
        "color": "#2ca02c"
      }
    ]
  },
  "layout": {
    "xaxis_title": "Index",
    "yaxis_title": "Coefficient Value (V)",
    "title": "Wavelet Analysis (approx)"
  },
  "metadata": {
    "processing_time": "0.189s",
    "num_traces": 1
  }
}
```

**Response (for pearson_detail):**
```json
{
  "type": "bar",
  "data": {
    "traces": [
      {
        "x": ["Detail 1", "Detail 2", "Detail 3", ...],
        "y": [0.85, 0.72, 0.65, ...],
        "name": "Pearson CC",
        "color": "#9467bd"
      }
    ]
  },
  "layout": {
    "xaxis_title": "Coefficient Type",
    "yaxis_title": "Correlation Coefficient",
    "title": "Wavelet Analysis (pearson_detail)"
  },
  "metadata": {
    "processing_time": "0.312s",
    "num_traces": 1
  }
}
```

---

### 9. Generate Spectrogram

#### `POST /api/plot/spectrum`
Generate time-frequency spectrogram (heatmap).

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File): Signal file
  - `time_column` (int): Time column index
  - `signal_column` (int): Signal column index
  - `wavelet_type` (string): Wavelet family
  - `n_levels` (int): Decomposition levels
  - `spectrum_type` (string): `"raw"` or `"denoised"`

**Response:**
```json
{
  "type": "heatmap",
  "data": {
    "x": [0.0, 0.1, 0.2, ...],
    "y": [0, 50, 100, ...],
    "z": [[0.5, 1.2, ...], [0.8, 1.5, ...], ...],
    "colorscale": "Viridis"
  },
  "layout": {
    "xaxis_title": "Time (s)",
    "yaxis_title": "Frequency (Hz)",
    "title": "Spectrogram (raw)"
  },
  "metadata": {
    "processing_time": "0.567s",
    "shape": [200, 500],
    "data_points": 100000
  }
}
```

---

### 10. Batch Plot Generation (Recommended)

#### `POST /api/plots/batch` or `POST /api/plot/all`
Generate all plots at once for maximum efficiency. This endpoint processes the signal once and returns all visualization data in a single response.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, optional): Signal file (if not using cached file)
  - `file_id` (string, optional): Cached file ID from upload
  - `time_column` (int): Time column index
  - `signal_column` (int): Signal column index
  - `wavelet_type` (string): Wavelet family
  - `n_levels` (int): Decomposition levels

**Note:** Either `file` or `file_id` must be provided. Using `file_id` is recommended.

**Response:**
```json
{
  "plots": {
    "signal_raw": {
      "type": "scatter",
      "data": { "x": [...], "y": [...], "name": "Raw Signal", "color": "#1f77b4" },
      "layout": { "xaxis_title": "Time (s)", "yaxis_title": "Amplitude (V)", "title": "Raw Signal" }
    },
    "signal_denoised": {
      "type": "scatter",
      "data": { "x": [...], "y": [...], "name": "Denoised Signal", "color": "#ff7f0e" },
      "layout": { "xaxis_title": "Time (s)", "yaxis_title": "Amplitude (V)", "title": "Denoised Signal" }
    },
    "fft": {
      "type": "scatter",
      "data": {
        "traces": [{ "x": [...], "y": [...], "name": "FFT of Denoised Signal", "color": "#ff7f0e" }]
      },
      "layout": { "xaxis_title": "Frequency (Hz)", "yaxis_title": "Amplitude (V)", "title": "FFT Analysis" }
    },
    "wavelet": {
      "type": "scatter",
      "data": {
        "traces": [{ "x": [...], "y": [...], "name": "Approximation Coefficients", "color": "#2ca02c" }]
      },
      "layout": { "xaxis_title": "Index", "yaxis_title": "Coefficient Value (V)", "title": "Wavelet Coefficients" }
    },
    "spectrum_raw": {
      "type": "heatmap",
      "data": { "x": [...], "y": [...], "z": [[...]], "colorscale": "Viridis" },
      "layout": { "xaxis_title": "Time (s)", "yaxis_title": "Frequency (Hz)", "title": "Spectrogram (Raw)" }
    },
    "spectrum_denoised": {
      "type": "heatmap",
      "data": { "x": [...], "y": [...], "z": [[...]], "colorscale": "Plasma" },
      "layout": { "xaxis_title": "Time (s)", "yaxis_title": "Frequency (Hz)", "title": "Spectrogram (Denoised)" }
    }
  },
  "metadata": {
    "original_points": 830000,
    "total_processing_time": "3.456s",
    "compression_ratio": "55.3x",
    "plots_generated": 6
  }
}
```

**Frontend Example:**
```javascript
const formData = new FormData();
formData.append('file_id', savedFileId); // Use cached file from upload
formData.append('time_column', '0');
formData.append('signal_column', '1');
formData.append('wavelet_type', 'db4');
formData.append('n_levels', '5');

const response = await fetch('/api/plots/batch', {
  method: 'POST',
  body: formData
});
const data = await response.json();

// All plots are now available in data.plots
console.log(data.plots.signal_raw);
console.log(data.plots.fft);
console.log(data.plots.wavelet);
```

---

## Recommended Workflow

### Option 1: Using Cached Files (Recommended)
```javascript
// Step 1: Upload file with caching
const uploadFormData = new FormData();
const compressedFile = await compressFile(file); // Optional gzip compression
uploadFormData.append('file', compressedFile);

const uploadResponse = await fetch('/api/upload-with-progress', {
  method: 'POST',
  body: uploadFormData
});
const { file_id } = await uploadResponse.json();

// Step 2: Process signal
const processFormData = new FormData();
processFormData.append('file_id', file_id);
processFormData.append('time_column', '0');
processFormData.append('signal_column', '1');
processFormData.append('wavelet_type', 'db4');
processFormData.append('n_levels', '5');

const processResponse = await fetch('/api/process', {
  method: 'POST',
  body: processFormData
});
const { statistics } = await processResponse.json();

// Step 3: Generate all plots
const plotsFormData = new FormData();
plotsFormData.append('file_id', file_id);
plotsFormData.append('time_column', '0');
plotsFormData.append('signal_column', '1');
plotsFormData.append('wavelet_type', 'db4');
plotsFormData.append('n_levels', '5');

const plotsResponse = await fetch('/api/plots/batch', {
  method: 'POST',
  body: plotsFormData
});
const { plots } = await plotsResponse.json();
```

### Option 2: Without Caching (Simple)
```javascript
// Single request with file upload
const formData = new FormData();
formData.append('file', file);
formData.append('time_column', '0');
formData.append('signal_column', '1');
formData.append('wavelet_type', 'db4');
formData.append('n_levels', '5');

const response = await fetch('/api/process', {
  method: 'POST',
  body: formData
});
const data = await response.json();
```

---

## Wavelet Types

Common wavelet families supported:
- **Daubechies:** `db1`, `db2`, `db3`, `db4`, `db5`, ..., `db20`
- **Symlets:** `sym2`, `sym3`, `sym4`, ..., `sym20`
- **Coiflets:** `coif1`, `coif2`, `coif3`, `coif4`, `coif5`
- **Biorthogonal:** `bior1.1`, `bior1.3`, `bior2.2`, `bior3.3`
- **Haar:** `haar`

---

## Error Responses

All endpoints return standard HTTP error codes:

**400 Bad Request:**
```json
{
  "detail": "Error parsing file: <error_message>"
}
```

**404 Not Found:**
```json
{
  "detail": "Cached file not found: <file_id>"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Processing error: <error_message>"
}
```

---

## Performance Considerations

1. **File Compression:** Use gzip compression for uploads (saves 50-90% bandwidth)
2. **Caching:** Use `file_id` from upload to avoid re-uploading for multiple operations
3. **Batch Processing:** Use `/api/plots/batch` to generate all plots at once (3-5x faster than individual requests)
4. **Downsampling:** All plot data is automatically downsampled using LTTB algorithm (15k points for optimal browser performance)
5. **CORS:** CORS is enabled for all origins (configure in production)

---

## Data Format Requirements

### Input File Format
- **Delimiter:** Tab-delimited (TSV)
- **Header:** No header row
- **Columns:** At least 2 columns (time and signal)
- **Example:**
```
0.00000	0.123
0.00005	0.456
0.00010	0.789
```

### Sample Rate
- Default sample rate assumed: **20,000 Hz** (used for FFT and spectrogram calculations)
- Adjust frontend if using different sample rates

---

## Notes

- All numerical values are sanitized to avoid `inf` and `nan` values
- Statistical calculations match the original Streamlit implementation
- Plot data is optimized for Plotly.js rendering
- Maximum data points per plot: 15,000 (for optimal browser performance)
- File cache is stored in `/tmp/upload_cache` and persists across requests

---

## Contact & Support

For issues or questions, refer to the backend logs or contact the development team.

