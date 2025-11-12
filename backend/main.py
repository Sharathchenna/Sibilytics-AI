from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
import pandas as pd
import numpy as np
import pywt
from scipy.signal import spectrogram
from scipy.stats import skew, kurtosis, entropy
from sklearn.metrics import mean_squared_error
from io import StringIO, BytesIO
import base64
from typing import Dict, List, Optional
import json
import math
from functools import lru_cache
import time
import hashlib
import os
from pathlib import Path
import gzip
import openpyxl

# File cache directory
CACHE_DIR = Path("/tmp/upload_cache")
CACHE_DIR.mkdir(exist_ok=True)

def parse_file_content(contents: bytes, filename: str) -> pd.DataFrame:
    """
    Parse file content based on file extension.
    Supports: .txt, .lvm (tab-delimited), .csv (comma-delimited), .xlsx (Excel)
    """
    file_ext = filename.lower().split('.')[-1]

    try:
        if file_ext in ['txt', 'lvm']:
            # Tab-delimited files
            df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        elif file_ext == 'csv':
            # CSV files - try to auto-detect delimiter
            content_str = contents.decode('utf-8')
            # Try comma first, then tab, then semicolon
            for delimiter in [',', '\t', ';']:
                try:
                    df = pd.read_csv(StringIO(content_str), delimiter=delimiter, header=None)
                    # Check if we got more than 1 column
                    if df.shape[1] > 1:
                        break
                except:
                    continue
            else:
                # If all fail, default to comma
                df = pd.read_csv(StringIO(content_str), delimiter=',', header=None)
        elif file_ext == 'xlsx':
            # Excel files
            df = pd.read_excel(BytesIO(contents), header=None, engine='openpyxl')
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Remove any completely empty rows/columns
        df = df.dropna(how='all', axis=0).dropna(how='all', axis=1)

        return df
    except Exception as e:
        raise ValueError(f"Error parsing {file_ext} file: {str(e)}")

def json_encoder(obj):
    """Custom JSON encoder to handle inf and nan"""
    if isinstance(obj, float):
        if math.isnan(obj):
            return None
        elif math.isinf(obj):
            return None
    return obj

# Monkey patch JSON encoder
json._default_encoder = json.JSONEncoder(default=json_encoder)

# ============================================================================
# LTTB Downsampling Algorithm (Largest-Triangle-Three-Buckets)
# ============================================================================
def lttb_downsample(x_data, y_data, target_points=15000):
    """
    Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
    Intelligently reduces data points while preserving visual features.
    
    Reference: https://github.com/sveinn-steinarsson/flot-downsample
    
    Args:
        x_data: X-axis data (e.g., time)
        y_data: Y-axis data (e.g., amplitude)
        target_points: Target number of points (default: 15000 for optimal Plotly performance)
    
    Returns:
        downsampled_x, downsampled_y: Downsampled arrays
    """
    data_length = len(x_data)
    
    # If already below target, return as-is
    if data_length <= target_points:
        return x_data, y_data
    
    # Convert to numpy arrays for efficiency
    x_data = np.asarray(x_data)
    y_data = np.asarray(y_data)
    
    # Always keep first and last points
    sampled_x = [x_data[0]]
    sampled_y = [y_data[0]]
    
    # Calculate bucket size
    bucket_size = (data_length - 2) / (target_points - 2)
    
    a = 0  # Initially a is the first point in the triangle
    
    for i in range(target_points - 2):
        # Calculate point average for next bucket (for triangle apex)
        avg_x = 0.0
        avg_y = 0.0
        avg_range_start = int(np.floor((i + 1) * bucket_size) + 1)
        avg_range_end = int(np.floor((i + 2) * bucket_size) + 1)
        avg_range_end = min(avg_range_end, data_length)
        
        avg_range_length = avg_range_end - avg_range_start
        
        for j in range(avg_range_start, avg_range_end):
            avg_x += x_data[j]
            avg_y += y_data[j]
        
        if avg_range_length > 0:
            avg_x /= avg_range_length
            avg_y /= avg_range_length
        
        # Get the range for this bucket
        range_offs = int(np.floor((i + 0) * bucket_size) + 1)
        range_to = int(np.floor((i + 1) * bucket_size) + 1)
        
        # Point a (previous selected point)
        point_a_x = x_data[a]
        point_a_y = y_data[a]
        
        max_area = -1.0
        next_a = range_offs
        
        for j in range(range_offs, range_to):
            # Calculate triangle area over three buckets
            area = abs(
                (point_a_x - avg_x) * (y_data[j] - point_a_y) -
                (point_a_x - x_data[j]) * (avg_y - point_a_y)
            ) * 0.5
            
            if area > max_area:
                max_area = area
                next_a = j
        
        sampled_x.append(x_data[next_a])
        sampled_y.append(y_data[next_a])
        a = next_a  # This point is the next a (chosen point)
    
    # Always add the last point
    sampled_x.append(x_data[-1])
    sampled_y.append(y_data[-1])
    
    return np.array(sampled_x), np.array(sampled_y)

app = FastAPI(title="Feature Extraction API", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://sibilytics-ai.in",
        "https://www.sibilytics-ai.in",
        "https://app.sibilytics-ai.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_float(value):
    """Convert value to float, handling inf and nan"""
    try:
        fval = float(value)
        if not np.isfinite(fval):  # Checks for both inf and nan
            return 0.0
        return fval
    except (ValueError, TypeError):
        return 0.0

def calculate_statistical_data(reconstructed_signal, noise, original_signal):
    """Calculate statistical parameters from signal - CORRECTED PSNR calculation"""
    params = {}

    try:
        params["Mean"] = safe_float(np.mean(reconstructed_signal))
        params["Median"] = safe_float(np.median(reconstructed_signal))
        mode_val = pd.Series(reconstructed_signal).mode()
        params["Mode"] = safe_float(mode_val[0] if len(mode_val) > 0 else np.mean(reconstructed_signal))
        params["Std Dev"] = safe_float(np.std(reconstructed_signal))
        params["Variance"] = safe_float(np.var(reconstructed_signal))
        params["Mean Square"] = safe_float(np.mean(reconstructed_signal**2))
        params["RMS"] = safe_float(np.sqrt(np.mean(reconstructed_signal**2)))
        params["Max"] = safe_float(np.max(reconstructed_signal))
        params["Peak-to-Peak"] = safe_float(np.ptp(reconstructed_signal))

        # Peak-to-RMS
        rms_val = np.sqrt(np.mean(reconstructed_signal**2))
        params["Peak-to-RMS"] = safe_float(np.max(reconstructed_signal) / rms_val) if rms_val != 0 else 0.0

        params["Skewness"] = safe_float(skew(reconstructed_signal))
        params["Kurtosis"] = safe_float(kurtosis(reconstructed_signal))
        params["Energy"] = safe_float(np.trapz(reconstructed_signal**2, np.arange(len(reconstructed_signal))))
        params["Power"] = safe_float(np.trapz(reconstructed_signal**2, np.arange(len(reconstructed_signal))) / (2 * (1 / 20000)))

        # Crest Factor
        params["Crest Factor"] = safe_float(np.max(reconstructed_signal) / rms_val) if rms_val != 0 else 0.0

        # Impulse Factor
        mean_val = np.mean(reconstructed_signal)
        params["Impulse Factor"] = safe_float(np.max(reconstructed_signal) / mean_val) if mean_val != 0 else 0.0

        # Shape Factor
        params["Shape Factor"] = safe_float(rms_val / mean_val) if mean_val != 0 else 0.0

        params["Shannon Entropy"] = safe_float(entropy(np.abs(reconstructed_signal)))

        # Signal-to-Noise Ratio
        noise_sum_sq = np.sum(noise**2)
        if noise_sum_sq != 0:
            params["Signal-to-Noise Ratio"] = safe_float(10 * np.log10(np.sum(reconstructed_signal**2) / noise_sum_sq))
        else:
            params["Signal-to-Noise Ratio"] = 0.0

        # Root Mean Square Error (comparing original vs reconstructed)
        params["Root Mean Square Error"] = safe_float(np.sqrt(mean_squared_error(original_signal, reconstructed_signal)))

        # Maximum Error (comparing original vs reconstructed)
        params["Maximum Error"] = safe_float(np.max(np.abs(original_signal - reconstructed_signal)))

        # Mean Absolute Error (comparing original vs reconstructed)
        params["Mean Absolute Error"] = safe_float(np.mean(np.abs(original_signal - reconstructed_signal)))

        # Peak Signal-to-Noise Ratio (CORRECTED: uses original signal max)
        max_signal = np.max(np.abs(original_signal))
        rms_error = params["Root Mean Square Error"]
        if rms_error > 0 and max_signal > 0:
            params["Peak Signal-to-Noise Ratio"] = safe_float(20 * np.log10(max_signal / rms_error))
        else:
            params["Peak Signal-to-Noise Ratio"] = 0.0

        # Coefficient of Variation
        std_val = np.std(reconstructed_signal)
        params["Coefficient of Variation"] = safe_float(std_val / mean_val) if mean_val != 0 else 0.0
        
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        # Return safe defaults if anything fails
        for key in ["Mean", "Median", "Mode", "Std Dev", "Variance", "Mean Square", "RMS", "Max", 
                   "Peak-to-Peak", "Peak-to-RMS", "Skewness", "Kurtosis", "Energy", "Power",
                   "Crest Factor", "Impulse Factor", "Shape Factor", "Shannon Entropy",
                   "Signal-to-Noise Ratio", "Root Mean Square Error", "Maximum Error",
                   "Mean Absolute Error", "Peak Signal-to-Noise Ratio", "Coefficient of Variation"]:
            if key not in params:
                params[key] = 0.0
    
    return params

@app.get("/")
async def root():
    return {"message": "Feature Extraction API", "status": "healthy"}

@app.options("/api/upload-with-progress")
async def options_upload_with_progress():
    return {}

@app.options("/api/process")
async def options_process():
    return {}

@app.options("/api/process-raw")
async def options_process_raw():
    return {}

@app.options("/api/plot/all")
async def options_plot_all():
    return {}

@app.options("/api/plots/batch")
async def options_plots_batch():
    return {}

@app.options("/api/download-all-stats")
async def options_download_all_stats():
    return {}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse signal file"""
    try:
        # Read file content
        contents = await file.read()
        
        # Parse as CSV with tab delimiter
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        # Return column count for frontend to create selectors
        return {
            "filename": file.filename,
            "columns": df.shape[1],
            "rows": df.shape[0],
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.post("/api/upload-with-progress")
async def upload_file_with_progress(file: UploadFile = File(...)):
    """
    Upload and parse signal file with progress tracking support.
    Supports gzip-compressed uploads for faster transfer.
    Caches file to avoid re-uploading for subsequent operations.
    Returns file_id for reuse in /process and /plot endpoints.
    """
    try:
        start_time = time.time()
        print(f"[UPLOAD] Starting upload: {file.filename}")

        # Stream file content in chunks to avoid memory issues
        chunks = []
        chunk_size = 1024 * 1024  # 1MB chunks
        total_bytes = 0

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            chunks.append(chunk)
            total_bytes += len(chunk)

        compressed_data = b''.join(chunks)
        upload_time = time.time() - start_time
        print(f"[UPLOAD] Received {total_bytes / (1024*1024):.2f} MB in {upload_time:.2f}s")

        # Detect and decompress gzip if needed
        decompress_start = time.time()
        is_compressed = False
        compression_method = "none"

        # Check for gzip magic bytes (0x1f 0x8b) - Works with CompressionStream('gzip')
        if len(compressed_data) > 2 and compressed_data[0] == 0x1f and compressed_data[1] == 0x8b:
            is_compressed = True
            compression_method = "gzip"
            print(f"[UPLOAD] ✓ Detected gzip compression (native CompressionStream compatible)")

            try:
                contents = gzip.decompress(compressed_data)
                decompress_time = time.time() - decompress_start
                original_size = len(contents) / (1024*1024)
                compressed_size = total_bytes / (1024*1024)
                compression_ratio = len(contents) / total_bytes

                print(f"[UPLOAD] ✓ Decompressed {compressed_size:.2f} MB → {original_size:.2f} MB in {decompress_time:.2f}s")
                print(f"[UPLOAD] ✓ Compression ratio: {compression_ratio:.2f}x ({(1 - 1/compression_ratio)*100:.1f}% reduction)")
                print(f"[UPLOAD] ✓ Bandwidth saved: {(original_size - compressed_size):.2f} MB")

            except Exception as decompress_error:
                print(f"[UPLOAD] ⚠️  Decompression failed: {str(decompress_error)}")
                print(f"[UPLOAD] ⚠️  Falling back to raw data")
                contents = compressed_data
                is_compressed = False
                compression_method = "failed"
        else:
            contents = compressed_data
            print(f"[UPLOAD] No compression detected, using raw data ({total_bytes / (1024*1024):.2f} MB)")

        # Generate file ID based on content hash
        file_hash = hashlib.sha256(contents).hexdigest()[:16]
        file_id = f"{file_hash}_{file.filename}"
        cache_path = CACHE_DIR / file_id

        # Save to cache
        cache_path.write_bytes(contents)
        print(f"[UPLOAD] Cached file as: {file_id}")

        # Parse as CSV with tab delimiter
        parse_start = time.time()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        print(f"[UPLOAD] Parsed CSV in {time.time() - parse_start:.2f}s")

        # Prepare response with compression stats
        response_data = {
            "filename": file.filename,
            "file_id": file_id,
            "columns": df.shape[1],
            "rows": df.shape[0],
            "status": "success",
            "message": "File uploaded and cached successfully",
            "upload_time": f"{time.time() - start_time:.2f}s",
            "compressed": is_compressed,
            "compression_method": compression_method
        }

        if is_compressed and compression_method == "gzip":
            # Include compression statistics
            original_size_mb = len(contents) / (1024*1024)
            compressed_size_mb = total_bytes / (1024*1024)
            ratio = len(contents) / total_bytes
            bandwidth_saved_mb = original_size_mb - compressed_size_mb

            response_data.update({
                "compressed_size_mb": f"{compressed_size_mb:.2f}",
                "original_size_mb": f"{original_size_mb:.2f}",
                "compression_ratio": f"{ratio:.2f}x",
                "size_reduction_percent": f"{(1 - 1/ratio)*100:.1f}%",
                "bandwidth_saved_mb": f"{bandwidth_saved_mb:.2f}",
                "decompress_time": f"{decompress_time:.2f}s"
            })
        else:
            response_data["file_size_mb"] = f"{total_bytes / (1024*1024):.2f}"

        return response_data
    except Exception as e:
        print(f"[UPLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.post("/api/process")
async def process_signal(
    file: UploadFile = File(None),
    file_id: Optional[str] = Form(None),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...)
):
    """Process signal with wavelet decomposition. Supports cached files via file_id."""
    start_time = time.time()
    try:
        # Use cached file if file_id provided, otherwise read uploaded file
        if file_id:
            cache_path = CACHE_DIR / file_id
            if not cache_path.exists():
                raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")
            contents = cache_path.read_bytes()
            print(f"[PROCESS] Using cached file: {file_id}")
        elif file:
            contents = await file.read()
            print(f"[PROCESS] Processing uploaded file: {file.filename}")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'file_id' must be provided")

        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)

        # Extract time and signal columns
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        print(f"Processing signal of length: {len(Signal)}")
        t1 = time.time()

        # Wavelet decomposition and denoising (EXACT Streamlit logic)
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
        denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
        denoised_signal = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]

        print(f"Wavelet processing took: {time.time() - t1:.2f}s")
        t1 = time.time()

        noise = Signal - denoised_signal

        # Calculate statistics (passing original Signal for PSNR calculation)
        stats = calculate_statistical_data(denoised_signal, noise, Signal)
        print(f"Statistics calculation took: {time.time() - t1:.2f}s")

        # Limit data size for response (downsample if too large)
        # Note: Plotly.js performs well with 10k-15k points. Higher values may cause browser issues.
        max_points = 15000
        if len(time_data) > max_points:
            step = len(time_data) // max_points
            time_subset = time_data[::step].tolist()
            raw_subset = Signal[::step].tolist()
            denoised_subset = denoised_signal[::step].tolist()
        else:
            time_subset = time_data.tolist()
            raw_subset = Signal.tolist()
            denoised_subset = denoised_signal.tolist()

        # Limit wavelet coefficients size
        approx_limit = min(len(coeffs[0]), 1000)
        detail_limit = min(max(len(c) for c in coeffs[1:]), 1000)

        # Extract filename from file or file_id
        filename = file.filename if file else file_id.split('_', 1)[1] if file_id else "unknown"

        # Prepare response data
        result = {
            "time": time_subset,
            "raw_signal": raw_subset,
            "denoised_signal": denoised_subset,
            "wavelet_coeffs": {
                "approximation": coeffs[0][:approx_limit].tolist() if len(coeffs[0]) > approx_limit else coeffs[0].tolist(),
                "detail": [(coeff[:detail_limit] if len(coeff) > detail_limit else coeff).tolist() for coeff in coeffs[1:]]
            },
            "statistics": stats,
            "filename": filename
        }

        print(f"Total processing time: {time.time() - start_time:.2f}s")
        return result

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/api/process-raw")
async def process_signal_raw(
    file: UploadFile = File(None),
    file_id: Optional[str] = Form(None),
    time_column: int = Form(...),
    signal_column: int = Form(...)
):
    """Process raw signal statistics without denoising. Supports cached files via file_id."""
    start_time = time.time()
    try:
        # Use cached file if file_id provided, otherwise read uploaded file
        if file_id:
            cache_path = CACHE_DIR / file_id
            if not cache_path.exists():
                raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")
            contents = cache_path.read_bytes()
            print(f"[PROCESS-RAW] Using cached file: {file_id}")
        elif file:
            contents = await file.read()
            print(f"[PROCESS-RAW] Processing uploaded file: {file.filename}")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'file_id' must be provided")

        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)

        # Extract time and signal columns
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        print(f"Processing raw signal of length: {len(Signal)}")
        t1 = time.time()

        # Calculate noise as zero (no denoising applied)
        noise = np.zeros_like(Signal)

        # Calculate statistics on RAW signal (Signal is both original and reconstructed)
        stats = calculate_statistical_data(Signal, noise, Signal)
        print(f"Statistics calculation took: {time.time() - t1:.2f}s")

        # Extract filename from file or file_id
        filename = file.filename if file else file_id.split('_', 1)[1] if file_id else "unknown"

        # Prepare response data
        result = {
            "statistics": stats,
            "filename": filename
        }

        print(f"Total processing time: {time.time() - start_time:.2f}s")
        return result

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/api/download-stats")
async def download_stats(stats: Dict):
    """Download statistics as CSV - single file"""
    try:
        stats_df = pd.DataFrame([stats])

        # Convert to CSV
        output = BytesIO()
        stats_df.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=statistics.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.post("/api/download-all-stats")
async def download_all_stats(all_stats: List[Dict]):
    """
    Download consolidated statistics from multiple files as CSV.
    Similar to Streamlit's 'Download All Files Stats' functionality.

    Expects a list of dictionaries with structure:
    [
        {"filename": "file1.lvm", "Mean": 0.5, "Std Dev": 0.1, ...},
        {"filename": "file2.lvm", "Mean": 0.6, "Std Dev": 0.2, ...},
        ...
    ]
    """
    try:
        if not all_stats or len(all_stats) == 0:
            raise HTTPException(status_code=400, detail="No statistics provided")

        # Convert list of stats to DataFrame
        # Use filename as index if available, similar to Streamlit version
        stats_df = pd.DataFrame(all_stats)

        # If 'filename' column exists, set it as index
        if 'filename' in stats_df.columns:
            stats_df = stats_df.set_index('filename')

        # Convert to CSV with index
        output = BytesIO()
        stats_df.to_csv(output, index=True)
        output.seek(0)

        print(f"[DOWNLOAD] Generated consolidated CSV for {len(all_stats)} files")

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=all_files_stats.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DOWNLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.post("/api/plot/signal")
async def generate_signal_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    signal_type: str = Form(...)  # 'raw' or 'denoised'
):
    """
    Generate signal plot data with LTTB downsampling for efficient transfer.
    Returns raw data for client-side rendering instead of Plotly JSON.
    """
    try:
        start_time = time.time()
        
        # Read and parse file
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        # Extract time and signal columns
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values
        
        print(f"[SIGNAL PLOT] Processing {len(Signal):,} points ({signal_type})")
        
        # If denoised, perform wavelet processing
        if signal_type == 'denoised':
            coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
            threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
            denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
            signal_data = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]
            name = 'Denoised Signal'
            color = '#ff7f0e'
        else:
            signal_data = Signal
            name = 'Raw Signal'
            color = '#1f77b4'
        
        # Apply LTTB downsampling (830k → 15k points)
        downsampled_x, downsampled_y = lttb_downsample(time_data, signal_data, target_points=15000)
        
        print(f"[SIGNAL PLOT] Downsampled: {len(Signal):,} → {len(downsampled_x):,} points")
        print(f"[SIGNAL PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        # Return raw data for client-side rendering
        return {
            "type": "scatter",
            "data": {
                "x": downsampled_x.tolist(),
                "y": downsampled_y.tolist(),
                "name": name,
                "color": color
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Amplitude (V)",
                "title": name
            },
            "metadata": {
                "original_points": len(Signal),
                "downsampled_points": len(downsampled_x),
                "compression_ratio": f"{len(Signal) / len(downsampled_x):.1f}x",
                "processing_time": f"{time.time() - start_time:.3f}s"
            }
        }
        
    except Exception as e:
        print(f"Plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Plot generation error: {str(e)}")

@app.post("/api/plot/fft")
async def generate_fft_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    fft_type: str = Form(...)  # 'raw', 'denoised', 'approx', 'detail'
):
    """
    Generate FFT plot data with LTTB downsampling.
    Returns raw data for client-side rendering.
    """
    try:
        start_time = time.time()
        
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        print(f"[FFT PLOT] Processing {len(Signal):,} points ({fft_type})")

        # Calculate sampling frequency (matching Streamlit)
        tf = time_data[2] - time_data[1]
        fs = 1 / tf

        # Wavelet processing
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
        denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
        denoised_signal = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]

        traces = []

        if fft_type == 'raw':
            # FFT with zero-padding and normalization (matching Streamlit)
            NFFT = 2 ** int(np.ceil(np.log2(len(Signal))))
            fft_data = np.abs(np.fft.fft(Signal, NFFT)) / len(Signal)
            fft_freqs = fs * np.arange(0, NFFT // 2 + 1) / NFFT
            fft_data = fft_data[:len(fft_freqs)]
            x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "FFT of Raw Signal",
                "color": "#1f77b4"
            })
        elif fft_type == 'denoised':
            # FFT without normalization for denoised (matching Streamlit)
            fft_data = np.abs(np.fft.fft(denoised_signal))[:len(Signal) // 2]
            fft_freqs = fs * np.arange(0, len(fft_data)) / len(Signal)
            x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "FFT of Denoised Signal",
                "color": "#ff7f0e"
            })
        elif fft_type == 'approx':
            # FFT of approximation coefficients (matching Streamlit)
            fft_data = np.abs(np.fft.fft(coeffs[0]))[:len(coeffs[0]) // 2]
            fft_freqs = np.linspace(100, fs / 2, len(fft_data))
            x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "FFT of Approx Coefficients",
                "color": "#2ca02c"
            })
        else:  # detail
            # FFT of detail coefficients (matching Streamlit)
            for i, coeff in enumerate(coeffs[1:]):
                fft_data = np.abs(np.fft.fft(coeff))[:len(coeff) // 2]
                fft_freqs = np.linspace(100, fs / 2, len(fft_data))
                x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=5000)  # Less per trace
                traces.append({
                    "x": x_down.tolist(),
                    "y": y_down.tolist(),
                    "name": f"FFT of Detail Coefficients {i + 1}",
                    "color": None  # Let client choose
                })
        
        print(f"[FFT PLOT] Generated {len(traces)} trace(s)")
        print(f"[FFT PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        return {
            "type": "scatter",
            "data": {
                "traces": traces
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": f"FFT Analysis ({fft_type})"
            },
            "metadata": {
                "processing_time": f"{time.time() - start_time:.3f}s",
                "num_traces": len(traces)
            }
        }
        
    except Exception as e:
        print(f"FFT plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"FFT plot error: {str(e)}")

@app.post("/api/plot/wavelet")
async def generate_wavelet_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    wavelet_option: str = Form(...)  # 'approx', 'detail', 'pearson_approx', 'pearson_detail'
):
    """
    Generate wavelet plot data with downsampling.
    Returns raw data for client-side rendering.
    """
    try:
        start_time = time.time()
        
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        Signal = df.iloc[:, signal_column].values
        
        print(f"[WAVELET PLOT] Processing {len(Signal):,} points ({wavelet_option})")
        
        # Wavelet decomposition
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        
        plot_type = "scatter"
        traces = []
        x_title = "Index"
        y_title = "Coefficient Value (V)"
        
        if wavelet_option == 'approx':
            x_data = np.arange(len(coeffs[0]))
            x_down, y_down = lttb_downsample(x_data, coeffs[0], target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "Approximation Coefficients",
                "color": "#2ca02c"
            })
        elif wavelet_option == 'detail':
            for i, coeff in enumerate(coeffs[1:]):
                x_data = np.arange(len(coeff))
                x_down, y_down = lttb_downsample(x_data, coeff, target_points=5000)  # Less per trace
                traces.append({
                    "x": x_down.tolist(),
                    "y": y_down.tolist(),
                    "name": f"Detail Coefficients {i + 1}",
                    "color": None
                })
        elif wavelet_option == 'pearson_approx':
            plot_type = "bar"
            x_title = "Coefficient Type"
            y_title = "Correlation Coefficient"
            correlation = np.corrcoef(Signal[:len(coeffs[0])], coeffs[0])[0, 1]
            traces.append({
                "x": ["Approx Coefficients"],
                "y": [float(correlation)],
                "name": "Pearson CC",
                "color": "#9467bd"
            })
        else:  # pearson_detail
            plot_type = "bar"
            x_title = "Coefficient Type"
            y_title = "Correlation Coefficient"
            correlations = [np.corrcoef(Signal[:len(coeff)], coeff)[0, 1] for coeff in coeffs[1:]]
            traces.append({
                "x": [f"Detail {i + 1}" for i in range(len(correlations))],
                "y": [float(c) for c in correlations],
                "name": "Pearson CC",
                "color": "#9467bd"
            })
        
        print(f"[WAVELET PLOT] Generated {len(traces)} trace(s)")
        print(f"[WAVELET PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        return {
            "type": plot_type,
            "data": {
                "traces": traces
            },
            "layout": {
                "xaxis_title": x_title,
                "yaxis_title": y_title,
                "title": f"Wavelet Analysis ({wavelet_option})"
            },
            "metadata": {
                "processing_time": f"{time.time() - start_time:.3f}s",
                "num_traces": len(traces)
            }
        }
        
    except Exception as e:
        print(f"Wavelet plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Wavelet plot error: {str(e)}")

@app.post("/api/plot/spectrum")
async def generate_spectrum_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    spectrum_type: str = Form(...)  # 'raw' or 'denoised'
):
    """
    Generate time-frequency spectrum (spectrogram) plot data.
    Returns raw heatmap data for client-side rendering.
    """
    try:
        start_time = time.time()
        
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        Signal = df.iloc[:, signal_column].values
        
        print(f"[SPECTRUM PLOT] Processing {len(Signal):,} points ({spectrum_type})")
        
        if spectrum_type == 'denoised':
            coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
            threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
            denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
            signal_data = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]
            colorscale = 'Plasma'
        else:
            signal_data = Signal
            colorscale = 'Viridis'
        
        # Calculate spectrogram
        f, t, Sxx = spectrogram(signal_data, 20000)
        
        # Convert to dB scale
        z_data = 10 * np.log10(Sxx + 1e-10)  # Add small value to avoid log(0)
        
        print(f"[SPECTRUM PLOT] Spectrogram shape: {z_data.shape}")
        print(f"[SPECTRUM PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        # Return raw heatmap data
        return {
            "type": "heatmap",
            "data": {
                "x": t.tolist(),  # Time axis
                "y": f.tolist(),  # Frequency axis
                "z": z_data.tolist(),  # 2D array of intensity values
                "colorscale": colorscale
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Frequency (Hz)",
                "title": f"Spectrogram ({spectrum_type})"
            },
            "metadata": {
                "processing_time": f"{time.time() - start_time:.3f}s",
                "shape": z_data.shape,
                "data_points": z_data.size
            }
        }
        
    except Exception as e:
        print(f"Spectrum plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Spectrum plot error: {str(e)}")

@app.post("/api/plots/batch")
@app.post("/api/plot/all")  # Alias for frontend compatibility
async def generate_all_plots(
    file: UploadFile = File(None),
    file_id: Optional[str] = Form(None),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...)
):
    """
    Generate all plots at once for maximum efficiency.
    Supports cached files via file_id to avoid re-uploading.
    Processes signal once and generates all plot data with LTTB downsampling.
    Returns all plots in a single response for optimal network transfer.
    """
    try:
        batch_start = time.time()

        # Use cached file if file_id provided, otherwise read uploaded file
        if file_id:
            cache_path = CACHE_DIR / file_id
            if not cache_path.exists():
                raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")
            contents = cache_path.read_bytes()
            print(f"[BATCH] Using cached file: {file_id}")
        elif file:
            contents = await file.read()
            print(f"[BATCH] Processing uploaded file: {file.filename}")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'file_id' must be provided")

        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        # Extract data
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values
        
        print(f"\n{'='*70}")
        print(f"[BATCH] Processing {len(Signal):,} points")
        print(f"{'='*70}")
        
        plots = {}
        
        # 1. Raw Signal Plot
        t1 = time.time()
        x_down, y_down = lttb_downsample(time_data, Signal, target_points=15000)
        plots['signal_raw'] = {
            "type": "scatter",
            "data": {
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "Raw Signal",
                "color": "#1f77b4"
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Amplitude (V)",
                "title": "Raw Signal"
            }
        }
        print(f"[BATCH] ✓ Raw signal: {time.time() - t1:.3f}s")
        
        # Process wavelet decomposition once for all plots
        t1 = time.time()
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
        denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
        denoised_signal = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]
        print(f"[BATCH] ✓ Wavelet processing: {time.time() - t1:.3f}s")
        
        # 2. Denoised Signal Plot
        t1 = time.time()
        x_down, y_down = lttb_downsample(time_data, denoised_signal, target_points=15000)
        plots['signal_denoised'] = {
            "type": "scatter",
            "data": {
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "Denoised Signal",
                "color": "#ff7f0e"
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Amplitude (V)",
                "title": "Denoised Signal"
            }
        }
        print(f"[BATCH] ✓ Denoised signal: {time.time() - t1:.3f}s")
        
        # Calculate sampling frequency from time data (matching Streamlit)
        tf = time_data[2] - time_data[1]  # Time step
        fs = 1 / tf  # Sampling frequency

        # 3. FFT Plots - Generate ALL 4 types (MATCHING STREAMLIT IMPLEMENTATION)
        t1 = time.time()

        # 3a. FFT of Raw Signal (with zero-padding and normalization like Streamlit)
        NFFT = 2 ** int(np.ceil(np.log2(len(Signal))))  # Next power of 2
        fft_raw = np.abs(np.fft.fft(Signal, NFFT)) / len(Signal)  # FFT with zero-padding & normalization
        fft_freqs_raw = fs * np.arange(0, NFFT // 2 + 1) / NFFT  # Proper frequency array
        # Take only positive frequencies
        fft_raw = fft_raw[:len(fft_freqs_raw)]
        x_down_raw, y_down_raw = lttb_downsample(fft_freqs_raw, fft_raw, target_points=15000)

        plots['fft_raw'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down_raw.tolist(),
                    "y": y_down_raw.tolist(),
                    "name": "FFT of Raw Signal",
                    "color": "#1f77b4"
                }]
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Raw Signal"
            }
        }

        # 3b. FFT of Denoised Signal (matching Streamlit - no normalization for denoised)
        fft_denoised = np.abs(np.fft.fft(denoised_signal))[:len(Signal) // 2]
        fft_freqs_denoised = fs * np.arange(0, len(fft_denoised)) / len(Signal)  # Proper frequency array
        x_down_denoised, y_down_denoised = lttb_downsample(fft_freqs_denoised, fft_denoised, target_points=15000)

        plots['fft_denoised'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down_denoised.tolist(),
                    "y": y_down_denoised.tolist(),
                    "name": "FFT of Denoised Signal",
                    "color": "#ff7f0e"
                }]
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Denoised Signal"
            }
        }

        # 3c. FFT of Approx Coefficients (matching Streamlit)
        fft_approx = np.abs(np.fft.fft(coeffs[0]))[:len(coeffs[0]) // 2]
        fft_freqs_approx = np.linspace(100, fs / 2, len(fft_approx))  # Streamlit uses linspace for coeffs
        x_down_approx, y_down_approx = lttb_downsample(fft_freqs_approx, fft_approx, target_points=15000)

        plots['fft_approx'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down_approx.tolist(),
                    "y": y_down_approx.tolist(),
                    "name": "FFT of Approx Coefficients",
                    "color": "#2ca02c"
                }]
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Approx Coefficients"
            }
        }

        # 3d. FFT of Detail Coefficients (matching Streamlit)
        detail_traces = []
        for i, coeff in enumerate(coeffs[1:]):
            fft_detail = np.abs(np.fft.fft(coeff))[:len(coeff) // 2]
            fft_freqs_detail = np.linspace(100, fs / 2, len(fft_detail))  # Streamlit uses linspace for coeffs
            x_down_detail, y_down_detail = lttb_downsample(fft_freqs_detail, fft_detail, target_points=5000)
            detail_traces.append({
                "x": x_down_detail.tolist(),
                "y": y_down_detail.tolist(),
                "name": f"FFT Detail {i + 1}",
                "color": None  # Let Plotly auto-assign colors
            })

        plots['fft_detail'] = {
            "type": "scatter",
            "data": {
                "traces": detail_traces
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Detail Coefficients"
            }
        }

        print(f"[BATCH] ✓ All 4 FFT plots: {time.time() - t1:.3f}s")
        
        # 4. Wavelet Coefficients Plots - Generate all 4 types
        t1 = time.time()

        # 4a. Approximation Coefficients
        x_data = np.arange(len(coeffs[0]))
        x_down, y_down = lttb_downsample(x_data, coeffs[0], target_points=15000)
        plots['wavelet_approx'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down.tolist(),
                    "y": y_down.tolist(),
                    "name": "Approximation Coefficients",
                    "color": "#2ca02c"
                }]
            },
            "layout": {
                "xaxis_title": "Index",
                "yaxis_title": "Coefficient Value (V)",
                "title": "Wavelet Approximation Coefficients"
            }
        }

        # 4b. Detail Coefficients
        detail_traces = []
        for i, coeff in enumerate(coeffs[1:]):
            x_data = np.arange(len(coeff))
            x_down, y_down = lttb_downsample(x_data, coeff, target_points=5000)
            detail_traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": f"Detail Coefficients {i + 1}",
                "color": None
            })
        plots['wavelet_detail'] = {
            "type": "scatter",
            "data": {
                "traces": detail_traces
            },
            "layout": {
                "xaxis_title": "Index",
                "yaxis_title": "Coefficient Value (V)",
                "title": "Wavelet Detail Coefficients"
            }
        }

        # 4c. Pearson CC (Approximation)
        correlation_approx = np.corrcoef(Signal[:len(coeffs[0])], coeffs[0])[0, 1]
        plots['wavelet_pearson_approx'] = {
            "type": "bar",
            "data": {
                "traces": [{
                    "x": ["Approx Coefficients"],
                    "y": [float(correlation_approx)],
                    "name": "Pearson CC",
                    "color": "#9467bd"
                }]
            },
            "layout": {
                "xaxis_title": "Coefficient Type",
                "yaxis_title": "Correlation Coefficient",
                "title": "Pearson CC (Approximation)"
            }
        }

        # 4d. Pearson CC (Detail)
        correlations_detail = [np.corrcoef(Signal[:len(coeff)], coeff)[0, 1] for coeff in coeffs[1:]]
        plots['wavelet_pearson_detail'] = {
            "type": "bar",
            "data": {
                "traces": [{
                    "x": [f"Detail {i + 1}" for i in range(len(correlations_detail))],
                    "y": [float(c) for c in correlations_detail],
                    "name": "Pearson CC",
                    "color": "#9467bd"
                }]
            },
            "layout": {
                "xaxis_title": "Coefficient Type",
                "yaxis_title": "Correlation Coefficient",
                "title": "Pearson CC (Detail)"
            }
        }

        print(f"[BATCH] ✓ All 4 Wavelet plots: {time.time() - t1:.3f}s")
        
        # 5. Spectrograms - Generate both raw and denoised
        t1 = time.time()

        # Helper function to generate and downsample spectrogram
        def generate_spectrogram(signal, name, colorscale):
            f, t, Sxx = spectrogram(signal, 20000)
            z_data = 10 * np.log10(Sxx + 1e-10)

            # Downsample if too large
            max_freq_bins = 200
            max_time_bins = 500

            if len(f) > max_freq_bins or len(t) > max_time_bins:
                freq_step = max(1, len(f) // max_freq_bins)
                time_step = max(1, len(t) // max_time_bins)
                f_down = f[::freq_step]
                t_down = t[::time_step]
                z_down = z_data[::freq_step, ::time_step]
            else:
                f_down, t_down, z_down = f, t, z_data

            return {
                "type": "heatmap",
                "data": {
                    "x": t_down.tolist(),
                    "y": f_down.tolist(),
                    "z": z_down.tolist(),
                    "colorscale": colorscale
                },
                "layout": {
                    "xaxis_title": "Time (s)",
                    "yaxis_title": "Frequency (Hz)",
                    "title": f"Spectrogram ({name})"
                },
                "metadata": {
                    "shape": list(z_down.shape),
                    "data_points": z_down.size
                }
            }

        # Generate raw spectrum
        plots['spectrum_raw'] = generate_spectrogram(Signal, "Raw", "Viridis")

        # Generate denoised spectrum
        plots['spectrum_denoised'] = generate_spectrogram(denoised_signal, "Denoised", "Plasma")

        print(f"[BATCH] ✓ Spectrograms (raw + denoised): {time.time() - t1:.3f}s")
        
        total_time = time.time() - batch_start
        print(f"{'='*70}")
        print(f"[BATCH] ✅ All plots generated in {total_time:.3f}s")
        print(f"{'='*70}\n")
        
        return {
            "plots": plots,
            "metadata": {
                "original_points": len(Signal),
                "total_processing_time": f"{total_time:.3f}s",
                "compression_ratio": f"{len(Signal) / 15000:.1f}x",
                "plots_generated": len(plots)
            }
        }
        
    except Exception as e:
        print(f"Batch plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch plot generation error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

