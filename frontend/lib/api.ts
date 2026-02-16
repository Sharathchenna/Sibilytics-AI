// API Configuration and helper functions
// Automatically detect environment: use localhost:8000 for local development, production URL otherwise
import { createClient } from '@/lib/supabase/browser';

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

const nativeFetch = globalThis.fetch.bind(globalThis);

const getAccessToken = async (): Promise<string | null> => {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
};

const fetchWithAuth: typeof globalThis.fetch = async (input, init) => {
  const headers = new Headers(init?.headers ?? {});
  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return nativeFetch(input, {
    ...init,
    headers,
  });
};

const fetch = fetchWithAuth;

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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_error) {
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

      const accessToken = await getAccessToken();
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }

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
  allStats: Array<{ filename: string;[key: string]: number | string }>
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
  file_id: string;  // Required - both upload endpoints return it
  columns: string[];  // Array of column names
  rows: number;
  sample_data?: Record<string, unknown>[];  // Sample rows of data
  status: string;
  message?: string;
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
  data: Record<string, unknown>;
  layout: Record<string, unknown>;
  metadata?: Record<string, unknown>;
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

// Download individual SVM plot as PNG
export const downloadSVMPlot = async (jobId: string, plotName: string): Promise<void> => {
  const formData = new FormData();
  formData.append('job_id', jobId);
  formData.append('plot_name', plotName);

  const response = await fetch(`${API_BASE_URL}/api/svm/download-plot`, {
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
  a.download = `${plotName.replace(/\s+/g, '_').toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Download all SVM plots as ZIP
export const downloadAllSVMPlots = async (jobId: string): Promise<void> => {
  const formData = new FormData();
  formData.append('job_id', jobId);

  const response = await fetch(`${API_BASE_URL}/api/svm/download-all-plots`, {
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
  a.download = `svm_plots_${jobId}.zip`;
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
  sample_data: Record<string, unknown>[];
  unique_values?: {
    [column: string]: {
      values: (string | number | boolean | null)[];
      count: number;
      dtype: string;
    };
  };
  has_header: boolean; // NEW: indicates if original file had headers
  status: string;
}

export interface SVMTrainResponse {
  job_id: string;
  results: {
    [testSize: string]: {
      kernels: {
        [kernel: string]: {
          best_params: Record<string, string | number | boolean>;
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
    params: Record<string, string | number | boolean>;
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

// ============================================================================
// DATA VISUALIZATION & CLEANING API FUNCTIONS
// ============================================================================

// Upload dataset for data visualization
export const uploadDataVizDataset = async (file: File): Promise<DataVizUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/data-viz/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
};

// Generate scatter plot data
export const generateScatterPlot = async (
  fileId: string,
  xColumn: string,
  yColumn: string
): Promise<ScatterPlotResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('x_column', xColumn);
  formData.append('y_column', yColumn);

  const response = await fetch(`${API_BASE_URL}/api/data-viz/scatter-plot`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Scatter plot generation failed: ${response.statusText}`);
  }

  return response.json();
};

// Handle null values
export const handleNullValues = async (
  fileId: string,
  column: string,
  method: string
): Promise<HandleNullsResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('column', column);
  formData.append('method', method);

  const response = await fetch(`${API_BASE_URL}/api/data-viz/handle-nulls`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Null handling failed: ${response.statusText}`);
  }

  return response.json();
};

// Generate histogram data
export const generateHistogram = async (
  fileId: string,
  column: string,
  bins: number = 20
): Promise<HistogramResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('column', column);
  formData.append('bins', bins.toString());

  const response = await fetch(`${API_BASE_URL}/api/data-viz/histogram`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Histogram generation failed: ${response.statusText}`);
  }

  return response.json();
};

// Calculate correlation matrix
export const calculateCorrelation = async (
  fileId: string,
  threshold: number = 0.8
): Promise<CorrelationResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('threshold', threshold.toString());

  const response = await fetch(`${API_BASE_URL}/api/data-viz/correlation`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Correlation calculation failed: ${response.statusText}`);
  }

  return response.json();
};

// Remove correlated features
export const removeCorrelatedFeatures = async (
  fileId: string,
  columnsToRemove: string
): Promise<RemoveColumnsResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('columns_to_remove', columnsToRemove);

  const response = await fetch(`${API_BASE_URL}/api/data-viz/remove-correlated`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Column removal failed: ${response.statusText}`);
  }

  return response.json();
};

// Filter data by X interval
export const filterByInterval = async (
  fileId: string,
  xColumn: string,
  yColumn: string,
  xMin: number,
  xMax: number
): Promise<FilterIntervalResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('x_column', xColumn);
  formData.append('y_column', yColumn);
  formData.append('x_min', xMin.toString());
  formData.append('x_max', xMax.toString());

  const response = await fetch(`${API_BASE_URL}/api/data-viz/filter-interval`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Interval filtering failed: ${response.statusText}`);
  }

  return response.json();
};

// Generate surface plot data
export const generateSurfacePlot = async (
  fileId: string,
  xColumn: string,
  yColumn: string,
  zColumn: string
): Promise<SurfacePlotResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('x_column', xColumn);
  formData.append('y_column', yColumn);
  formData.append('z_column', zColumn);

  const response = await fetch(`${API_BASE_URL}/api/data-viz/surface-plot`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Surface plot generation failed: ${response.statusText}`);
  }

  return response.json();
};

// Encode categorical column
export const encodeCategorical = async (
  fileId: string,
  column: string,
  method: string
): Promise<EncodeCategoricalResponse> => {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('column', column);
  formData.append('method', method);

  const response = await fetch(`${API_BASE_URL}/api/data-viz/encode-categorical`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Categorical encoding failed: ${response.statusText}`);
  }

  return response.json();
};

// Download cleaned dataset
export const downloadCleanedDataset = async (fileId: string): Promise<void> => {
  console.log('[Download] Starting download for file_id:', fileId);
  console.log('[Download] API URL:', `${API_BASE_URL}/api/data-viz/download-cleaned`);

  const formData = new FormData();
  formData.append('file_id', fileId);

  console.log('[Download] Sending POST request...');
  const response = await fetch(`${API_BASE_URL}/api/data-viz/download-cleaned`, {
    method: 'POST',
    body: formData,
  });

  console.log('[Download] Response status:', response.status);
  console.log('[Download] Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Download Error] Status:', response.status);
    console.error('[Download Error] Response:', errorText);
    throw new Error(`Download failed (${response.status}): ${errorText || response.statusText}`);
  }

  const blob = await response.blob();
  console.log('[Download] Blob size:', blob.size, 'bytes');

  // Parse Content-Disposition header more robustly
  let filename = 'cleaned_data.csv';
  const contentDisposition = response.headers.get('Content-Disposition');
  console.log('[Download] Content-Disposition header:', contentDisposition);

  if (contentDisposition) {
    // Try to extract filename from header
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
      console.log('[Download] Extracted filename:', filename);
    }
  }

  console.log('[Download] Creating download link with filename:', filename);

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  console.log('[Download] Triggering download...');
  a.click();

  // Cleanup
  setTimeout(() => {
    console.log('[Download] Cleaning up download link');
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  console.log('[Download] Download completed successfully');
};

// Data Viz Types
export interface DataVizUploadResponse {
  file_id: string;
  filename: string;
  rows: number;
  columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  null_summary: {
    [column: string]: {
      null_count: number;
      null_percentage: number;
      dtype: string;
    };
  };
  stats_summary: {
    [column: string]: {
      mean: number | null;
      median: number | null;
      std: number | null;
      min: number | null;
      max: number | null;
    };
  };
  sample_data: Record<string, unknown>[];
  status: string;
}

export interface ScatterPlotResponse {
  x: number[];
  y: number[];
  x_label: string;
  y_label: string;
  points_count: number;
  status: string;
}

export interface HandleNullsResponse {
  message: string;
  new_row_count: number;
  null_summary: {
    [column: string]: {
      null_count: number;
      null_percentage: number;
      dtype: string;
    };
  };
  status: string;
}

export interface HistogramResponse {
  hist: number[];
  bin_edges: number[];
  stats: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    skewness: number;
    kurtosis: number;
  };
  column: string;
  status: string;
}

export interface CorrelationResponse {
  correlation_matrix: { [key: string]: { [key: string]: number } };
  columns: string[];
  highly_correlated: Array<{
    column1: string;
    column2: string;
    correlation: number;
  }>;
  threshold: number;
  status: string;
}

export interface RemoveColumnsResponse {
  message: string;
  removed_columns: string[];
  remaining_columns: string[];
  status: string;
}

export interface FilterIntervalResponse {
  x_values: number[];
  y_values: number[];
  filtered_count: number;
  x_column: string;
  y_column: string;
  x_range: [number, number];
  status: string;
}

export interface SurfacePlotResponse {
  x: number[];
  y: number[];
  z: number[];
  x_label: string;
  y_label: string;
  z_label: string;
  points_count: number;
  status: string;
}

export interface EncodeCategoricalResponse {
  message: string;
  mapping: { [key: string]: number };
  new_columns: string[];
  status: string;
}
