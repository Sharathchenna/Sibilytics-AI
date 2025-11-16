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

// ============================================================================
// SVM CLASSIFICATION API FUNCTIONS
// ============================================================================

// Upload dataset for SVM classification
export const uploadSVMDataset = async (file: File): Promise<SVMUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/svm/upload-dataset`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
};

// Train SVM models
export const trainSVMModel = async (
  fileId: string,
  featureCol1: string,
  featureCol2: string,
  targetCol: string,
  testSizes?: string,
  kernels?: string,
  cValues?: string,
  gammaValues?: string,
  cvFolds?: number
): Promise<SVMTrainResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('feature_col_1', featureCol1);
  formData.append('feature_col_2', featureCol2);
  formData.append('target_col', targetCol);

  if (testSizes) formData.append('test_sizes', testSizes);
  if (kernels) formData.append('kernels', kernels);
  if (cValues) formData.append('c_values', cValues);
  if (gammaValues) formData.append('gamma_values', gammaValues);
  if (cvFolds) formData.append('cv_folds', cvFolds.toString());

  const response = await fetch(`${API_BASE_URL}/api/svm/train`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Training failed: ${response.statusText}`);
  }

  return response.json();
};

// Predict using trained SVM model
export const predictSVM = async (
  jobId: string,
  feature1: number,
  feature2: number
): Promise<SVMPredictResponse> => {
  const formData = new FormData();
  formData.append('job_id', jobId);
  formData.append('feature_1', feature1.toString());
  formData.append('feature_2', feature2.toString());

  const response = await fetch(`${API_BASE_URL}/api/svm/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Prediction failed: ${response.statusText}`);
  }

  return response.json();
};

// Download SVM results as Excel
export const downloadSVMResults = async (jobId: string): Promise<void> => {
  const formData = new FormData();
  formData.append('job_id', jobId);

  const response = await fetch(`${API_BASE_URL}/api/svm/download-results`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `svm_results_${jobId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// SVM Types
export interface SVMUploadResponse {
  file_id: string;
  filename: string;
  columns: string[];
  rows: number;
  sample_data: Record<string, any>[];
  status: string;
}

export interface SVMTrainResponse {
  job_id: string;
  results: {
    [testSize: string]: {
      kernels: {
        [kernel: string]: {
          best_params: Record<string, any>;
          auc_score: number;
          accuracy: number;
          precision: number;
          recall: number;
          f1_score: number;
          confusion_matrix: number[][];
        };
      };
      comparison: {
        Kernel: string[];
        Accuracy: number[];
        Precision: number[];
        Recall: number[];
        'F1 Score': number[];
        'AUC Score': number[];
        'Best C': number[];
        'Best Gamma': number[];
      };
      roc_data: {
        [kernel: string]: {
          fpr: number[];
          tpr: number[];
          auc: number;
        };
      };
    };
  };
  best_model: {
    kernel: string;
    test_size: number;
    params: Record<string, any>;
    auc: number;
  };
  plots: {
    [plotName: string]: string; // base64 encoded images
  };
  metadata: {
    total_time: string;
    num_test_sizes: number;
    num_kernels: number;
    feature_names: string[];
    target_name: string;
  };
}

export interface SVMPredictResponse {
  prediction: number;
  probabilities: Record<string, number>;
  feature_names: string[];
  model_info: {
    kernel: string;
    auc: number;
  };
}

