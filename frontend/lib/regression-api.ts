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

export interface RegressionUploadResponse {
  status: string;
  file_id: string;
  filename: string;
  rows: number;
  columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  sample_data: Record<string, unknown>[];
}

export interface LinearRegressionResponse {
  status: string;
  model: string;
  metrics: { r2: number; mse: number };
  x_columns: string[];
  y_columns: string[];
  coefficients: number[][];
  intercepts: number[];
  equations: string[];
  plots: Record<string, string>;
  rows_used: number;
}

export interface PolynomialRegressionResponse {
  status: string;
  model: string;
  metrics: { r2: number; mse: number };
  degree: number;
  x_columns: string[];
  y_columns: string[];
  equations: string[];
  feature_terms: string[];
  plots: Record<string, string>;
  rows_used: number;
}

export interface LogisticRegressionResponse {
  status: string;
  model: string;
  target_column: string;
  feature_columns: string[];
  expanded_feature_columns: string[];
  num_classes: number;
  best_accuracy: number;
  best_params: Record<string, string | number>;
  best_split: number;
  classification_report: Record<string, unknown>;
  confusion_matrix: number[][];
  confusion_matrix_plot: string;
  feature_importance: Record<string, number>;
  feature_importance_plot: string;
  equations: string[];
  class_mapping: Record<string, string> | null;
  rows_used: number;
}

export interface CurveFitResponse {
  status: string;
  model: string;
  curve_model: string;
  metrics: { r2: number; mse: number };
  parameters: number[];
  equation: string;
  surface_plot: string;
  rows_used: number;
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { detail?: string };
    return payload.detail || fallback;
  } catch {
    return fallback;
  }
}

export async function uploadRegressionDataset(file: File): Promise<RegressionUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/regression/upload-dataset`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Regression dataset upload failed'));
  }

  return response.json();
}

export async function runLinearRegression(
  fileId: string,
  xColumns: string[],
  yColumns: string[],
  testSize: number = 0.2
): Promise<LinearRegressionResponse> {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('x_columns', xColumns.join(','));
  formData.append('y_columns', yColumns.join(','));
  formData.append('test_size', testSize.toString());

  const response = await fetch(`${API_BASE_URL}/api/regression/linear`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Linear regression failed'));
  }

  return response.json();
}

export async function runPolynomialRegression(
  fileId: string,
  xColumns: string[],
  yColumns: string[],
  degree: number,
  testSize: number = 0.2
): Promise<PolynomialRegressionResponse> {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('x_columns', xColumns.join(','));
  formData.append('y_columns', yColumns.join(','));
  formData.append('degree', degree.toString());
  formData.append('test_size', testSize.toString());

  const response = await fetch(`${API_BASE_URL}/api/regression/polynomial`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Polynomial regression failed'));
  }

  return response.json();
}

export async function runLogisticRegression(
  fileId: string,
  targetColumn: string,
  featureColumns: string[]
): Promise<LogisticRegressionResponse> {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('target_column', targetColumn);
  formData.append('feature_columns', featureColumns.join(','));

  const response = await fetch(`${API_BASE_URL}/api/regression/logistic`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Logistic regression failed'));
  }

  return response.json();
}

export async function runCurveFit(
  fileId: string,
  xColumn: string,
  yColumn: string,
  zColumn: string,
  curveModel: string,
  degree: number,
  customEquation: string
): Promise<CurveFitResponse> {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('x_column', xColumn);
  formData.append('y_column', yColumn);
  formData.append('z_column', zColumn);
  formData.append('curve_model', curveModel);
  formData.append('degree', degree.toString());
  if (customEquation.trim()) {
    formData.append('custom_equation', customEquation.trim());
  }

  const response = await fetch(`${API_BASE_URL}/api/regression/curve-fit`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Curve fitting failed'));
  }

  return response.json();
}
