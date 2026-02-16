/**
 * ANN (Artificial Neural Network) API functions
 */

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

const API_BASE_URL = getApiBaseUrl();

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

export interface ANNUploadResponse {
  file_id: string;
  filename: string;
  columns: string[];
  rows: number;
  sample_data: Record<string, unknown>[];
  column_stats: Record<string, unknown>;
  has_header: boolean;
  status: string;
}

export interface ANNTrainResponse {
  model_id: string;
  metrics: {
    mae: number;
    mse: number;
    rmse: number;
    r2: number;
    train_samples: number;
    test_samples: number;
  };
  training_history: {
    epochs: number[];
    train_loss: number[];
    val_loss: number[];
  };
  loss_plot: string;
  predicted_vs_actual_plot: string;
  residual_plot: string;
  residual_histogram: string;
  feature_columns: string[];
  target_columns: string[]; // Now supports multiple outputs
  n_outputs: number; // Number of output columns
  input_bounds: number[][];
  architecture: string; // e.g., "30,10,8"
  activation: string; // e.g., "relu"
  optimizer: string; // e.g., "adam"
  status: string;
}

export interface ANNPredictResponse {
  predictions: Record<string, number>; // Changed to support multiple outputs
  input_values: Record<string, number>;
  status: string;
}

export interface ANNInverseResponse {
  desired_output: number;
  predicted_output: number;
  error: number;
  final_loss: number;
  [key: string]: string | number | boolean | unknown[] | undefined; // For found_cr, found_cf, etc.
  optimization_history: unknown[];
  convergence_plot: string;
  optimization_time: string;
  status: string;
}

export async function uploadANNDataset(file: File): Promise<ANNUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/ann/upload-dataset`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json() as { detail?: string };
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

export async function trainANNModel(
  fileId: string,
  featureColumns: string,
  targetColumns: string, // Changed to support multiple outputs
  testSize: number = 0.1,
  epochs: number = 350,
  batchSize: number = 4,
  architecture: string = '30,10,8',
  validationSplit: number = 0.2,
  activation: string = 'relu',
  optimizer: string = 'adam',
  useBounds: boolean = false
): Promise<ANNTrainResponse> {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('feature_columns', featureColumns);
  formData.append('target_columns', targetColumns); // Changed parameter name
  formData.append('test_size', testSize.toString());
  formData.append('epochs', epochs.toString());
  formData.append('batch_size', batchSize.toString());
  formData.append('architecture', architecture);
  formData.append('validation_split', validationSplit.toString());
  formData.append('activation', activation);
  formData.append('optimizer', optimizer);
  formData.append('use_bounds', useBounds.toString());

  const response = await fetch(`${API_BASE_URL}/api/ann/train`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json() as { detail?: string };
    throw new Error(error.detail || 'Training failed');
  }

  return response.json();
}

export async function predictANN(
  modelId: string,
  inputValues: Record<string, number>
): Promise<ANNPredictResponse> {
  const formData = new FormData();
  formData.append('model_id', modelId);
  formData.append('input_values', JSON.stringify(inputValues));

  const response = await fetch(`${API_BASE_URL}/api/ann/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json() as { detail?: string };
    throw new Error(error.detail || 'Prediction failed');
  }

  return response.json();
}

export async function inverseSolveANN(
  modelId: string,
  desiredOutput: number,
  optimizationSteps: number = 200,
  learningRate: number = 0.1
): Promise<ANNInverseResponse> {
  const formData = new FormData();
  formData.append('model_id', modelId);
  formData.append('desired_output', desiredOutput.toString());
  formData.append('steps', optimizationSteps.toString());
  formData.append('learning_rate', learningRate.toString());

  const response = await fetch(`${API_BASE_URL}/api/ann/inverse-solve`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json() as { detail?: string };
    throw new Error(error.detail || 'Inverse solve failed');
  }

  return response.json();
}

export async function listANNModels() {
  const response = await fetch(`${API_BASE_URL}/api/ann/models`);

  if (!response.ok) {
    const error = await response.json() as { detail?: string };
    throw new Error(error.detail || 'Failed to list models');
  }

  return response.json();
}
