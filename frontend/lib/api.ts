// API Configuration and helper functions
// Automatically detect environment: use localhost:8000 for local development, production URL otherwise
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return 'https://api.sibilytics-ai.in';
};

export const API_BASE_URL = getApiBaseUrl();

// Compress file using gzip
export const compressFile = async (file: File): Promise<File> => {
  if (!('CompressionStream' in window)) {
    // Browser doesn't support compression, return original file
    return file;
  }
  
  try {
    const stream = file.stream();
    const compressedStream = stream.pipeThrough(
      new CompressionStream('gzip')
    );
    const compressedBlob = await new Response(compressedStream).blob();
    return new File([compressedBlob], file.name + '.gz', { 
      type: 'application/gzip' 
    });
  } catch (error) {
    console.warn('Compression failed, using original file:', error);
    return file;
  }
};

// Upload progress callback type
export interface UploadProgress {
  percentage: number;
  uploadedMB: number;
  totalMB: number;
  status: 'compressing' | 'uploading' | 'complete' | 'error';
}

// Upload file with progress tracking using XMLHttpRequest
export const uploadFile = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Notify compression started
      if (onProgress) {
        onProgress({
          percentage: 0,
          uploadedMB: 0,
          totalMB: file.size / (1024 * 1024),
          status: 'compressing',
        });
      }

      // Compress file first
      const compressed = await compressFile(file);
      const totalMB = compressed.size / (1024 * 1024);

      // Create FormData
      const formData = new FormData();
      formData.append('file', compressed);

      // Create XMLHttpRequest
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          const uploadedMB = event.loaded / (1024 * 1024);

          onProgress({
            percentage,
            uploadedMB,
            totalMB,
            status: 'uploading',
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            
            if (onProgress) {
              onProgress({
                percentage: 100,
                uploadedMB: totalMB,
                totalMB,
                status: 'complete',
              });
            }

            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse server response'));
          }
        } else {
          if (onProgress) {
            onProgress({
              percentage: 0,
              uploadedMB: 0,
              totalMB,
              status: 'error',
            });
          }
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        if (onProgress) {
          onProgress({
            percentage: 0,
            uploadedMB: 0,
            totalMB,
            status: 'error',
          });
        }
        reject(new Error('Upload failed: Network error'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        if (onProgress) {
          onProgress({
            percentage: 0,
            uploadedMB: 0,
            totalMB,
            status: 'error',
          });
        }
        reject(new Error('Upload aborted'));
      });

      // Open and send request
      xhr.open('POST', `${API_BASE_URL}/api/upload-with-progress`);
      xhr.send(formData);
    } catch (error) {
      if (onProgress) {
        onProgress({
          percentage: 0,
          uploadedMB: 0,
          totalMB: file.size / (1024 * 1024),
          status: 'error',
        });
      }
      reject(error);
    }
  });
};

// Process signal and get statistics (denoised)
export const processSignal = async (
  fileId: string,
  timeColumn: number,
  signalColumn: number,
  waveletType: string,
  nLevels: number
): Promise<ProcessResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('time_column', timeColumn.toString());
  formData.append('signal_column', signalColumn.toString());
  formData.append('wavelet_type', waveletType);
  formData.append('n_levels', nLevels.toString());

  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Processing failed: ${response.statusText}`);
  }

  return response.json();
};

// Process raw signal statistics without denoising
export const processSignalRaw = async (
  fileId: string,
  timeColumn: number,
  signalColumn: number
): Promise<ProcessRawResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('time_column', timeColumn.toString());
  formData.append('signal_column', signalColumn.toString());

  const response = await fetch(`${API_BASE_URL}/api/process-raw`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Raw processing failed: ${response.statusText}`);
  }

  return response.json();
};

// Generate all plots at once
export const generateAllPlots = async (
  fileId: string,
  timeColumn: number,
  signalColumn: number,
  waveletType: string,
  nLevels: number
): Promise<BatchPlotsResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('time_column', timeColumn.toString());
  formData.append('signal_column', signalColumn.toString());
  formData.append('wavelet_type', waveletType);
  formData.append('n_levels', nLevels.toString());

  const response = await fetch(`${API_BASE_URL}/api/plots/batch`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Plot generation failed: ${response.statusText}`);
  }

  return response.json();
};

// Download statistics as CSV (single file)
export const downloadStatistics = (statistics: Record<string, number>, filename: string) => {
  const csv = Object.entries(statistics)
    .map(([key, value]) => `${key},${value}`)
    .join('\n');

  const blob = new Blob([`Parameter,Value\n${csv}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_statistics.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Download consolidated statistics from multiple files as CSV
export const downloadAllStats = async (
  allStats: Array<{ filename: string; [key: string]: number | string }>
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/download-all-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(allStats),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_files_stats.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Types
export interface UploadResponse {
  filename: string;
  file_id: string;
  columns: number;
  rows: number;
  status: string;
  message: string;
  upload_time?: string;
  compressed?: boolean;
  compression_method?: string;
  compressed_size_mb?: string;
  original_size_mb?: string;
  compression_ratio?: string;
  size_reduction_percent?: string;
  bandwidth_saved_mb?: string;
  decompress_time?: string;
}

export interface ProcessResponse {
  time: number[];
  raw_signal: number[];
  denoised_signal: number[];
  wavelet_coeffs: {
    approximation: number[];
    detail: number[][];
  };
  statistics: Record<string, number>;
  filename: string;
}

export interface ProcessRawResponse {
  statistics: Record<string, number>;
  filename: string;
}

export interface PlotData {
  type: string;
  data: any;
  layout: any;
  metadata?: any;
}

export interface BatchPlotsResponse {
  plots: {
    signal_raw: PlotData;
    signal_denoised: PlotData;
    fft_raw: PlotData;
    fft_denoised: PlotData;
    fft_approx: PlotData;
    fft_detail: PlotData;
    wavelet_approx: PlotData;
    wavelet_detail: PlotData;
    wavelet_pearson_approx: PlotData;
    wavelet_pearson_detail: PlotData;
    spectrum_raw: PlotData;
    spectrum_denoised: PlotData;
  };
  metadata: {
    original_points: number;
    total_processing_time: string;
    compression_ratio: string;
    plots_generated: number;
  };
}

