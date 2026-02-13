'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, FlaskConical, Loader2, Play, Upload } from 'lucide-react';
import {
  type CurveFitResponse,
  type LinearRegressionResponse,
  type LogisticRegressionResponse,
  type PolynomialRegressionResponse,
  type RegressionUploadResponse,
  runCurveFit,
  runLinearRegression,
  runLogisticRegression,
  runPolynomialRegression,
  uploadRegressionDataset,
} from '@/lib/regression-api';

type RegressionMode = 'linear' | 'polynomial' | 'logistic' | 'curve-fit';
type RegressionResult =
  | LinearRegressionResponse
  | PolynomialRegressionResponse
  | LogisticRegressionResponse
  | CurveFitResponse;

const CURVE_OPTIONS = ['polynomial', 'exponential', 'logarithmic', 'power', 'custom'] as const;

function toggleValue(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((v) => v !== value);
  }
  return [...values, value];
}

export default function RegressionWorkbench() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<RegressionMode>('linear');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<RegressionUploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegressionResult | null>(null);

  const [xColumns, setXColumns] = useState<string[]>([]);
  const [yColumns, setYColumns] = useState<string[]>([]);
  const [featureColumns, setFeatureColumns] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState('');
  const [testSize, setTestSize] = useState(0.2);
  const [degree, setDegree] = useState(2);

  const [curveX, setCurveX] = useState('');
  const [curveY, setCurveY] = useState('');
  const [curveZ, setCurveZ] = useState('');
  const [curveModel, setCurveModel] = useState<(typeof CURVE_OPTIONS)[number]>('polynomial');
  const [customEquation, setCustomEquation] = useState('');

  const numericColumns = useMemo(() => uploadData?.numeric_columns ?? [], [uploadData]);
  const allColumns = useMemo(() => uploadData?.columns ?? [], [uploadData]);

  const resetSelections = () => {
    setXColumns([]);
    setYColumns([]);
    setFeatureColumns([]);
    setTargetColumn('');
    setCurveX('');
    setCurveY('');
    setCurveZ('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv', 'txt', 'lvm'].includes(ext)) {
      setSelectedFile(null);
      setError('Select a supported file: .xlsx, .xls, .csv, .txt, .lvm');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setError('');
    setStatus(`${file.name} selected`);
    setUploadData(null);
    setResult(null);
    resetSelections();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Select a dataset file first.');
      return;
    }

    setIsUploading(true);
    setError('');
    setResult(null);
    setStatus('Uploading dataset...');

    try {
      const response = await uploadRegressionDataset(selectedFile);
      setUploadData(response);
      setStatus(`Uploaded ${response.filename}: ${response.rows} rows, ${response.columns.length} columns`);
      const defaults = response.numeric_columns.slice(0, 3);
      setXColumns(defaults.length > 0 ? [defaults[0]] : []);
      setYColumns(defaults.length > 2 ? [defaults[2]] : defaults.length > 1 ? [defaults[1]] : []);
      setFeatureColumns(defaults.length > 1 ? defaults.slice(0, 2) : defaults);
      setTargetColumn(response.columns[response.columns.length - 1] || '');
      setCurveX(defaults[0] || '');
      setCurveY(defaults[1] || '');
      setCurveZ(defaults[2] || '');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Dataset upload failed.');
      setStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const runSelectedModel = async () => {
    if (!uploadData) {
      setError('Upload a dataset before running a model.');
      return;
    }

    setIsRunning(true);
    setError('');
    setResult(null);

    try {
      if (mode === 'linear') {
        if (!xColumns.length || !yColumns.length) {
          throw new Error('Select at least one X column and one Y column.');
        }
        const response = await runLinearRegression(uploadData.file_id, xColumns, yColumns, testSize);
        setResult(response);
        setStatus(`Linear regression completed. R2=${response.metrics.r2.toFixed(4)}`);
      } else if (mode === 'polynomial') {
        if (!xColumns.length || !yColumns.length) {
          throw new Error('Select at least one X column and one Y column.');
        }
        const response = await runPolynomialRegression(uploadData.file_id, xColumns, yColumns, degree, testSize);
        setResult(response);
        setStatus(`Polynomial regression completed. R2=${response.metrics.r2.toFixed(4)}`);
      } else if (mode === 'logistic') {
        if (!targetColumn || !featureColumns.length) {
          throw new Error('Select target and feature columns for logistic regression.');
        }
        if (featureColumns.includes(targetColumn)) {
          throw new Error('Feature columns cannot include the target column.');
        }
        const response = await runLogisticRegression(uploadData.file_id, targetColumn, featureColumns);
        setResult(response);
        setStatus(`Logistic regression completed. Accuracy=${response.best_accuracy.toFixed(4)}`);
      } else {
        if (!curveX || !curveY || !curveZ) {
          throw new Error('Select X, Y, and Z columns for curve fitting.');
        }
        const response = await runCurveFit(
          uploadData.file_id,
          curveX,
          curveY,
          curveZ,
          curveModel,
          degree,
          customEquation
        );
        setResult(response);
        setStatus(`Curve fitting completed. R2=${response.metrics.r2.toFixed(4)}`);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Regression execution failed.');
      setStatus('');
    } finally {
      setIsRunning(false);
    }
  };

  const renderMultiSelect = (
    title: string,
    columns: string[],
    selected: string[],
    setSelected: (values: string[]) => void
  ) => {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="font-semibold text-slate-800 mb-3">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
          {columns.map((col) => (
            <label key={`${title}-${col}`} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(col)}
                onChange={() => setSelected(toggleValue(selected, col))}
                className="rounded border-slate-300"
              />
              <span className="truncate">{col}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4">
            <FlaskConical className="w-4 h-4" />
            Classical Regression Lab
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Linear, Polynomial, Logistic, and Surface Curve Fitting
          </h2>
          <p className="text-slate-600 text-lg">
            Upload your dataset, select a regression workflow, and run it directly from the web app.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end mb-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Dataset File</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white"
                  accept=".xlsx,.xls,.csv,.txt,.lvm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? 'Uploading...' : 'Upload Dataset'}
            </button>
          </div>

          {uploadData && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="font-semibold mb-1">Dataset ready</div>
              <div>
                <FileSpreadsheet className="inline w-4 h-4 mr-1" />
                {uploadData.filename} | Rows: {uploadData.rows} | Columns: {uploadData.columns.length}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Regression Type</label>
              <select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as RegressionMode);
                  setResult(null);
                  setError('');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="linear">Linear Regression</option>
                <option value="polynomial">Polynomial Regression</option>
                <option value="logistic">Logistic Regression</option>
                <option value="curve-fit">Curve Fit (x, y -&gt; z)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Test Size</label>
              <input
                type="number"
                min={0.1}
                max={0.5}
                step={0.05}
                value={testSize}
                onChange={(event) => setTestSize(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                disabled={mode === 'curve-fit'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Polynomial Degree</label>
              <input
                type="number"
                min={1}
                max={6}
                step={1}
                value={degree}
                onChange={(event) => setDegree(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                disabled={mode === 'logistic' || mode === 'linear'}
              />
            </div>
          </div>

          {uploadData && (mode === 'linear' || mode === 'polynomial') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {renderMultiSelect('X Columns (inputs)', numericColumns, xColumns, setXColumns)}
              {renderMultiSelect('Y Columns (targets)', numericColumns, yColumns, setYColumns)}
            </div>
          )}

          {uploadData && mode === 'logistic' && (
            <div className="mb-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Column</label>
                <select
                  value={targetColumn}
                  onChange={(event) => {
                    const target = event.target.value;
                    setTargetColumn(target);
                    setFeatureColumns((prev) => prev.filter((f) => f !== target));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select target column</option>
                  {allColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              {renderMultiSelect(
                'Feature Columns',
                numericColumns.filter((col) => col !== targetColumn),
                featureColumns,
                setFeatureColumns
              )}
            </div>
          )}

          {uploadData && mode === 'curve-fit' && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">X Column</label>
                <select
                  value={curveX}
                  onChange={(event) => setCurveX(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select X</option>
                  {numericColumns.map((col) => (
                    <option key={`x-${col}`} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Y Column</label>
                <select
                  value={curveY}
                  onChange={(event) => setCurveY(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select Y</option>
                  {numericColumns.map((col) => (
                    <option key={`y-${col}`} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Z Column</label>
                <select
                  value={curveZ}
                  onChange={(event) => setCurveZ(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select Z</option>
                  {numericColumns.map((col) => (
                    <option key={`z-${col}`} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Curve Model</label>
                <select
                  value={curveModel}
                  onChange={(event) => setCurveModel(event.target.value as (typeof CURVE_OPTIONS)[number])}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {CURVE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {curveModel === 'custom' && (
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Custom Equation (use x, y, and params like a,b,c)
                  </label>
                  <input
                    value={customEquation}
                    onChange={(event) => setCustomEquation(event.target.value)}
                    placeholder="Example: a*(x^b)*(y^c)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={runSelectedModel}
            disabled={!uploadData || isRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running...' : 'Run Regression'}
          </button>

          {status && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              {status}
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              {'metrics' in result && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs text-slate-500 uppercase mb-1">R2 / Accuracy</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {'best_accuracy' in result
                        ? result.best_accuracy.toFixed(4)
                        : result.metrics.r2.toFixed(4)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs text-slate-500 uppercase mb-1">MSE</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {'best_accuracy' in result ? '-' : result.metrics.mse.toFixed(6)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs text-slate-500 uppercase mb-1">Rows Used</div>
                    <div className="text-2xl font-bold text-slate-900">{result.rows_used}</div>
                  </div>
                </div>
              )}
            </div>

            {'equations' in result && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Fitted Equations</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {result.equations.map((eq, idx) => (
                    <div key={`eq-${idx}`} className="rounded-lg bg-slate-50 p-3 break-all font-mono">
                      {eq}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {'plots' in result && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Actual vs Predicted</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(result.plots).map(([name, image]) => (
                    <div key={name} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <div className="px-3 py-2 text-sm font-medium text-slate-700 border-b border-slate-200">{name}</div>
                      <img
                        src={`data:image/png;base64,${image}`}
                        alt={name}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {'confusion_matrix_plot' in result && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Confusion Matrix</h3>
                  <img
                    src={`data:image/png;base64,${result.confusion_matrix_plot}`}
                    alt="Confusion matrix"
                    className="w-full h-auto rounded-lg border border-slate-200"
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Feature Importance</h3>
                  <img
                    src={`data:image/png;base64,${result.feature_importance_plot}`}
                    alt="Feature importance"
                    className="w-full h-auto rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            )}

            {'surface_plot' in result && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Surface Plot</h3>
                <p className="text-sm text-slate-700 mb-4 font-mono break-all">{result.equation}</p>
                <img
                  src={`data:image/png;base64,${result.surface_plot}`}
                  alt="Curve fit surface"
                  className="w-full h-auto rounded-lg border border-slate-200"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
