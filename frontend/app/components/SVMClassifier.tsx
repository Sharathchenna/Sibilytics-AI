'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Brain, Loader2, CheckCircle, AlertCircle, Download, Play, Target } from 'lucide-react';
import { uploadSVMDataset, trainSVMModel, predictSVM, downloadSVMResults, downloadSVMPlot, downloadAllSVMPlots, type SVMUploadResponse, type SVMTrainResponse, type SVMPredictResponse } from '@/lib/api';

export default function SVMClassifier() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<SVMUploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Column selection
  const [featureCol1, setFeatureCol1] = useState<string>('');
  const [featureCol2, setFeatureCol2] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('');

  // Advanced configuration
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testSizes, setTestSizes] = useState<string>('0.2,0.3');
  const [kernels, setKernels] = useState<string>('poly,rbf,linear,sigmoid');
  const [cValues, setCValues] = useState<string>('1,2,3,4,5,6,7,8,9');
  const [gammaValues, setGammaValues] = useState<string>('0.00001,0.0001,0.001,0.01,0.1');
  const [cvFolds, setCvFolds] = useState<number>(3);

  // Results
  const [trainResults, setTrainResults] = useState<SVMTrainResponse | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Prediction
  const [predFeature1, setPredFeature1] = useState<string>('');
  const [predFeature2, setPredFeature2] = useState<string>('');
  const [predResult, setPredResult] = useState<SVMPredictResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'xlsx' || fileExtension === 'csv') {
        setSelectedFile(file);
        setUploadStatus(`${file.name} selected`);
        setError('');
        setUploadData(null);
        setTrainResults(null);
        setShowResults(false);
      } else {
        setSelectedFile(null);
        setUploadStatus('');
        setError('Please select a valid .xlsx or .csv file');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');
    setUploadStatus('Uploading dataset...');

    try {
      const response = await uploadSVMDataset(selectedFile);
      setUploadData(response);
      
      // Create status message with header detection info
      let statusMessage = `Dataset uploaded successfully! ${response.rows} rows, ${response.columns.length} columns`;
      if (response.has_header === false) {
        statusMessage += ` (No headers detected - column names auto-generated)`;
      }
      setUploadStatus(statusMessage);

      // Auto-select first 2 columns as features and last column as target if available
      if (response.columns.length >= 3) {
        setFeatureCol1(response.columns[0]);
        setFeatureCol2(response.columns[1]);
        // For auto-generated columns, last column is likely the target (class)
        setTargetCol(response.columns[response.columns.length - 1]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTrain = async () => {
    if (!uploadData || !featureCol1 || !featureCol2 || !targetCol) {
      setError('Please select feature columns and target column');
      return;
    }

    // Validate target column has at least 2 classes
    if (uploadData.unique_values && uploadData.unique_values[targetCol]) {
      const classCount = uploadData.unique_values[targetCol].count;
      if (classCount < 2) {
        setError(`Target column "${targetCol}" only has ${classCount} unique class(es). SVM requires at least 2 classes. Please select a different target column.`);
        return;
      }
    }

    // Validate features are not the same as target
    if (featureCol1 === targetCol || featureCol2 === targetCol) {
      setError('Feature columns cannot be the same as the target column');
      return;
    }

    // Validate features are different from each other
    if (featureCol1 === featureCol2) {
      setError('Feature columns must be different from each other');
      return;
    }

    setIsTraining(true);
    setError('');
    setShowResults(false);

    try {
      const response = await trainSVMModel(
        uploadData.file_id,
        featureCol1,
        featureCol2,
        targetCol,
        testSizes,
        kernels,
        cValues,
        gammaValues,
        cvFolds
      );
      setTrainResults(response);
      setShowResults(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = async () => {
    if (!trainResults || !predFeature1 || !predFeature2) {
      setError('Please enter both feature values');
      return;
    }

    setIsPredicting(true);
    setError('');

    try {
      const response = await predictSVM(
        trainResults.job_id,
        parseFloat(predFeature1),
        parseFloat(predFeature2)
      );
      setPredResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleDownloadResults = async () => {
    if (!trainResults) return;

    try {
      await downloadSVMResults(trainResults.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <div id="svm-classification" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-block mb-4">
            <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">
              Machine Learning
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            SVM Classification
          </h2>
          <p className="text-slate-600 text-lg">
            Upload your feature dataset (xlsx/csv), select columns, and train Support Vector Machine models with automatic hyperparameter optimization
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          {/* Step 1: Upload Dataset */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Upload Dataset</h3>
            </div>

            <div className="ml-13">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="svm-file-upload"
              />
              <label
                htmlFor="svm-file-upload"
                className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Choose Dataset File (.xlsx or .csv)
              </label>

              {selectedFile && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium text-gray-800">{selectedFile.name}</span>
                      <span className="text-sm text-gray-500">
                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {uploadStatus && (
                <div className="mt-4 space-y-2">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">{uploadStatus}</span>
                  </div>
                  
                  {/* Header Detection Info */}
                  {uploadData && (
                    <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                      uploadData.has_header 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex-shrink-0">
                        {uploadData.has_header ? (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        {uploadData.has_header ? (
                          <span className="text-blue-800 text-sm">
                            <strong>Headers detected:</strong> Using column names from file
                          </span>
                        ) : (
                          <span className="text-amber-800 text-sm">
                            <strong>No headers detected:</strong> Auto-generated column names (Column_1, Column_2, etc.)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select Columns */}
          {uploadData && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-700 font-bold">2</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Select Features & Target</h3>
              </div>

              {/* Header Detection Info */}
              {uploadData.has_header === false && (
                <div className="ml-13 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800 mb-1">
                        Column Headers Auto-Generated
                      </p>
                      <p className="text-sm text-blue-700">
                        Your file doesn't have column headers. We've automatically generated column names (Column_1, Column_2, etc.) for easy selection.
                        The data remains unchanged.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="ml-13 grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feature 1 (X-axis)
                  </label>
                  <select
                    value={featureCol1}
                    onChange={(e) => setFeatureCol1(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Select column...</option>
                    {uploadData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feature 2 (Y-axis)
                  </label>
                  <select
                    value={featureCol2}
                    onChange={(e) => setFeatureCol2(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Select column...</option>
                    {uploadData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target (Class Labels)
                  </label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Select column...</option>
                    {uploadData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {/* Show unique class values when target is selected */}
                  {targetCol && uploadData.unique_values?.[targetCol] && (
                    <div className="mt-3 space-y-2">
                      <div className={`p-3 rounded-lg border ${
                        uploadData.unique_values[targetCol].count < 2 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="text-xs font-semibold text-gray-700 mb-2">
                          {uploadData.unique_values[targetCol].count} Unique Classes:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {uploadData.unique_values[targetCol].values.map((val: any, idx: number) => (
                            <span
                              key={idx}
                              className={`px-3 py-1 border rounded-full text-xs font-medium ${
                                uploadData.unique_values[targetCol].count < 2
                                  ? 'bg-white border-red-300 text-red-700'
                                  : 'bg-white border-blue-300 text-blue-700'
                              }`}
                            >
                              {String(val)}
                            </span>
                          ))}
                          {uploadData.unique_values[targetCol].count > uploadData.unique_values[targetCol].values.length && (
                            <span className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-xs text-gray-600">
                              +{uploadData.unique_values[targetCol].count - uploadData.unique_values[targetCol].values.length} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Warning for insufficient classes */}
                      {uploadData.unique_values[targetCol].count < 2 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-800">
                            <strong>Warning:</strong> SVM classification requires at least 2 different classes. 
                            This column only has {uploadData.unique_values[targetCol].count} unique value(s). 
                            Please select a different target column with multiple classes.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Data Preview */}
              {uploadData.sample_data.length > 0 && (
                <div className="ml-13 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Sample Data Preview</h4>
                    {!uploadData.has_header && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        Auto-generated columns
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className={uploadData.has_header ? 'bg-gray-50' : 'bg-amber-50'}>
                        <tr>
                          {uploadData.columns.map((col) => (
                            <th key={col} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              {col}
                              {!uploadData.has_header && (
                                <span className="ml-1 text-amber-600">*</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadData.sample_data.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            {uploadData.columns.map((col) => (
                              <td key={col} className="px-4 py-2 text-sm text-gray-600">
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Advanced Configuration */}
              <div className="ml-13 mt-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-2"
                >
                  {showAdvanced ? '▼' : '▶'} Advanced Configuration
                </button>

                {showAdvanced && (
                  <div className="mt-4 p-6 bg-gray-50 rounded-lg space-y-4 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Test Sizes (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={testSizes}
                          onChange={(e) => setTestSizes(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="0.2,0.3"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Kernels (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={kernels}
                          onChange={(e) => setKernels(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="poly,rbf,linear,sigmoid"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          C Values (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={cValues}
                          onChange={(e) => setCValues(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="1,2,3,4,5,6,7,8,9"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Gamma Values (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={gammaValues}
                          onChange={(e) => setGammaValues(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="0.00001,0.0001,0.001,0.01,0.1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Cross-Validation Folds
                        </label>
                        <input
                          type="number"
                          value={cvFolds}
                          onChange={(e) => setCvFolds(parseInt(e.target.value))}
                          min="2"
                          max="10"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Train Model */}
          {uploadData && featureCol1 && featureCol2 && targetCol && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-bold">3</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Train Models</h3>
              </div>

              <div className="ml-13">
                <button
                  onClick={handleTrain}
                  disabled={
                    isTraining || 
                    featureCol1 === featureCol2 || 
                    featureCol1 === targetCol || 
                    featureCol2 === targetCol ||
                    (uploadData.unique_values?.[targetCol]?.count || 0) < 2
                  }
                  className="px-8 py-4 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-3"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Training Models... (This may take 1-3 minutes)
                    </>
                  ) : (
                    <>
                      <Brain className="w-6 h-6" />
                      Train SVM Models
                    </>
                  )}
                </button>
                
                {/* Show why button is disabled */}
                {!isTraining && (
                  <>
                    {featureCol1 === featureCol2 && (
                      <div className="mt-3 text-sm text-amber-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Feature columns must be different from each other
                      </div>
                    )}
                    {(featureCol1 === targetCol || featureCol2 === targetCol) && (
                      <div className="mt-3 text-sm text-amber-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Feature columns cannot be the same as target column
                      </div>
                    )}
                    {(uploadData.unique_values?.[targetCol]?.count || 0) < 2 && (
                      <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Target column needs at least 2 different classes
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          )}

          {/* Results */}
          {showResults && trainResults && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Training Complete!</h3>
                </div>
                <button
                  onClick={handleDownloadResults}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download Excel Results
                </button>
              </div>

              {/* Best Model Info */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border-2 border-green-200 mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Best Model
                </h4>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Kernel</span>
                    <p className="text-xl font-bold text-gray-800">{trainResults.best_model.kernel}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">AUC Score</span>
                    <p className="text-xl font-bold text-green-600">{trainResults.best_model.auc.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Test Size</span>
                    <p className="text-xl font-bold text-gray-800">{trainResults.best_model.test_size}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Training Time</span>
                    <p className="text-xl font-bold text-gray-800">{trainResults.metadata.total_time}</p>
                  </div>
                </div>
              </div>

              {/* Plots */}
              <div className="space-y-6">
                <h4 className="text-xl font-bold text-gray-800">Visualization Results</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(trainResults.plots).map(([plotName, base64Image]) => (
                    <div key={plotName} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <h5 className="font-semibold text-gray-800 capitalize">
                          {plotName.replace(/_/g, ' ')}
                        </h5>
                        <button
                          onClick={() => downloadSVMPlot(trainResults.job_id, plotName)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-green-700 transition flex items-center gap-2 text-sm"
                          title="Download this plot"
                        >
                          <Download className="w-4 h-4" />
                          PNG
                        </button>
                      </div>
                      <div className="p-4">
                        <img
                          src={`data:image/png;base64,${base64Image}`}
                          alt={plotName}
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download All Plots Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => downloadAllSVMPlots(trainResults.job_id)}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Download All Plots ({Object.keys(trainResults.plots).length} plots as ZIP)
                  </button>
                </div>
              </div>

              {/* Prediction Interface */}
              <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  Make Predictions
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {featureCol1}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={predFeature1}
                      onChange={(e) => setPredFeature1(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter value"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {featureCol2}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={predFeature2}
                      onChange={(e) => setPredFeature2(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter value"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handlePredict}
                      disabled={isPredicting || !predFeature1 || !predFeature2}
                      className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isPredicting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Predicting...
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4" />
                          Predict
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {predResult && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Prediction</span>
                        <p className="text-2xl font-bold text-blue-600">Class {predResult.prediction}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Probabilities</span>
                        <div className="space-y-1 mt-1">
                          {Object.entries(predResult.probabilities).map(([cls, prob]) => (
                            <div key={cls} className="flex justify-between">
                              <span className="text-sm text-gray-700">Class {cls}:</span>
                              <span className="text-sm font-semibold text-gray-800">
                                {(prob * 100).toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
