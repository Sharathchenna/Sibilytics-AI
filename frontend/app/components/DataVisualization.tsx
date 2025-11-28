'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Download, BarChart3, Trash2, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  uploadDataVizDataset,
  generateScatterPlot,
  handleNullValues,
  generateHistogram,
  calculateCorrelation,
  removeCorrelatedFeatures,
  filterByInterval,
  generateSurfacePlot,
  encodeCategorical,
  downloadCleanedDataset,
  type DataVizUploadResponse,
  type ScatterPlotResponse,
  type HistogramResponse,
  type CorrelationResponse,
  type FilterIntervalResponse,
  type SurfacePlotResponse,
} from '@/lib/api';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function DataVisualization() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<DataVizUploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Visualization state
  const [scatterData, setScatterData] = useState<ScatterPlotResponse | null>(null);
  const [histogramData, setHistogramData] = useState<HistogramResponse | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationResponse | null>(null);
  const [filterData, setFilterData] = useState<FilterIntervalResponse | null>(null);
  const [surfaceData, setSurfaceData] = useState<SurfacePlotResponse | null>(null);

  // Loading states
  const [isGeneratingScatter, setIsGeneratingScatter] = useState(false);
  const [isHandlingNulls, setIsHandlingNulls] = useState(false);
  const [isGeneratingHistogram, setIsGeneratingHistogram] = useState(false);
  const [isCalculatingCorrelation, setIsCalculatingCorrelation] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isGeneratingSurface, setIsGeneratingSurface] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);

  // Form inputs
  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');
  const [zColumn, setZColumn] = useState<string>('');
  const [histColumn, setHistColumn] = useState<string>('');
  const [corrThreshold, setCorrThreshold] = useState<number>(0.8);
  const [xMin, setXMin] = useState<string>('');
  const [xMax, setXMax] = useState<string>('');
  const [encodeColumn, setEncodeColumn] = useState<string>('');
  const [encodeMethod, setEncodeMethod] = useState<string>('label');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DataViz] File change event triggered');
    const file = e.target.files?.[0];
    console.log('[DataViz] Selected file:', file?.name);
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      console.log('[DataViz] File extension:', fileExtension);
      if (fileExtension === 'xlsx' || fileExtension === 'csv') {
        setSelectedFile(file);
        setUploadStatus(`${file.name} selected`);
        setError('');
        setUploadData(null);
        // Reset all visualization data
        setScatterData(null);
        setHistogramData(null);
        setCorrelationData(null);
        setFilterData(null);
        setSurfaceData(null);
        console.log('[DataViz] File set successfully');
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
    console.log('[DataViz] Upload button clicked');
    console.log('[DataViz] Selected file:', selectedFile);
    
    if (!selectedFile) {
      console.log('[DataViz] No file selected, returning');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadStatus('Uploading dataset...');
    console.log('[DataViz] Starting upload...');

    try {
      const response = await uploadDataVizDataset(selectedFile);
      console.log('[DataViz] Upload response:', response);
      setUploadData(response);
      setUploadStatus(`Dataset uploaded successfully! ${response.rows} rows, ${response.columns.length} columns`);
      
      // Auto-select first numeric columns
      if (response.numeric_columns.length >= 2) {
        setXColumn(response.numeric_columns[0]);
        setYColumn(response.numeric_columns[1]);
        setHistColumn(response.numeric_columns[0]);
        if (response.numeric_columns.length >= 3) {
          setZColumn(response.numeric_columns[2]);
        }
      }
      
      // Auto-select first categorical column for encoding
      if (response.categorical_columns.length > 0) {
        setEncodeColumn(response.categorical_columns[0]);
      }
      console.log('[DataViz] Upload complete!');
    } catch (err) {
      console.error('[DataViz] Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateScatter = async () => {
    if (!uploadData || !xColumn || !yColumn) return;

    setIsGeneratingScatter(true);
    setError('');

    try {
      const response = await generateScatterPlot(uploadData.file_id, xColumn, yColumn);
      setScatterData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scatter plot generation failed');
    } finally {
      setIsGeneratingScatter(false);
    }
  };

  const handleNullValueAction = async (column: string, method: string) => {
    if (!uploadData) return;

    setIsHandlingNulls(true);
    setError('');

    try {
      const response = await handleNullValues(uploadData.file_id, column, method);
      
      // Refresh upload data
      const updatedData = { ...uploadData };
      updatedData.null_summary = response.null_summary;
      updatedData.rows = response.new_row_count;
      setUploadData(updatedData);
      
      setUploadStatus(response.message);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Null handling failed');
    } finally {
      setIsHandlingNulls(false);
    }
  };

  const handleGenerateHistogram = async () => {
    if (!uploadData || !histColumn) return;

    setIsGeneratingHistogram(true);
    setError('');

    try {
      const response = await generateHistogram(uploadData.file_id, histColumn, 20);
      setHistogramData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Histogram generation failed');
    } finally {
      setIsGeneratingHistogram(false);
    }
  };

  const handleCalculateCorrelation = async () => {
    if (!uploadData) return;

    setIsCalculatingCorrelation(true);
    setError('');

    try {
      const response = await calculateCorrelation(uploadData.file_id, corrThreshold);
      setCorrelationData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Correlation calculation failed');
    } finally {
      setIsCalculatingCorrelation(false);
    }
  };

  const handleRemoveCorrelatedColumns = async (columns: string[]) => {
    if (!uploadData || columns.length === 0) return;

    setIsCalculatingCorrelation(true);
    setError('');

    try {
      await removeCorrelatedFeatures(uploadData.file_id, columns.join(','));
      
      // Refresh correlation data
      const response = await calculateCorrelation(uploadData.file_id, corrThreshold);
      setCorrelationData(response);
      
      setUploadStatus(`Removed ${columns.length} column(s)`);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Column removal failed');
    } finally {
      setIsCalculatingCorrelation(false);
    }
  };

  const handleFilterInterval = async () => {
    if (!uploadData || !xColumn || !yColumn || !xMin || !xMax) return;

    setIsFiltering(true);
    setError('');

    try {
      const response = await filterByInterval(
        uploadData.file_id,
        xColumn,
        yColumn,
        parseFloat(xMin),
        parseFloat(xMax)
      );
      setFilterData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filtering failed');
    } finally {
      setIsFiltering(false);
    }
  };

  const handleGenerateSurface = async () => {
    if (!uploadData || !xColumn || !yColumn || !zColumn) return;

    setIsGeneratingSurface(true);
    setError('');

    try {
      const response = await generateSurfacePlot(uploadData.file_id, xColumn, yColumn, zColumn);
      setSurfaceData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Surface plot generation failed');
    } finally {
      setIsGeneratingSurface(false);
    }
  };

  const handleEncodeCategorical = async () => {
    if (!uploadData || !encodeColumn) return;

    setIsEncoding(true);
    setError('');

    try {
      const response = await encodeCategorical(uploadData.file_id, encodeColumn, encodeMethod);
      setUploadStatus(response.message);
      setTimeout(() => setUploadStatus(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encoding failed');
    } finally {
      setIsEncoding(false);
    }
  };

  const handleDownload = async () => {
    if (!uploadData) return;

    try {
      await downloadCleanedDataset(uploadData.file_id);
      setUploadStatus('Dataset downloaded successfully!');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  // Download plot as PNG
  const downloadPlotAsPNG = (plotId: string, filename: string) => {
    const plotElement = document.querySelector(`#${plotId} .plotly`) as any;
    if (plotElement && plotElement._fullLayout) {
      import('plotly.js-dist-min').then((Plotly) => {
        Plotly.downloadImage(plotElement, {
          format: 'png',
          width: 1920,
          height: 1080,
          filename: filename
        });
      });
    }
  };

  // Download filtered data as CSV
  const downloadFilteredData = () => {
    if (!filterData) return;

    const csvContent = [
      `${filterData.x_column},${filterData.y_column}`,
      ...filterData.x_values.map((x, i) => `${x},${filterData.y_values[i]}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered_data_${filterData.x_column}_${filterData.y_column}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="data-analysis" className="py-20 bg-white relative z-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-block mb-4">
            <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">
              Data Mining
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Data Visualization & Cleaning
          </h2>
          <p className="text-slate-600 text-lg">
            Upload your dataset, visualize patterns, clean data, and analyze correlations with interactive tools
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
                id="data-viz-file-upload"
              />
              <label
                htmlFor="data-viz-file-upload"
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

              {uploadStatus && !error && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">{uploadStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          )}

          {/* Data Preview & Null Summary */}
          {uploadData && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-bold">2</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Data Preview & Null Values</h3>
              </div>

              <div className="ml-13 space-y-6">
                {/* Data Info */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-semibold mb-1">Total Rows</div>
                    <div className="text-2xl font-bold text-blue-900">{uploadData.rows.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-semibold mb-1">Numeric Columns</div>
                    <div className="text-2xl font-bold text-green-900">{uploadData.numeric_columns.length}</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-semibold mb-1">Categorical Columns</div>
                    <div className="text-2xl font-bold text-purple-900">{uploadData.categorical_columns.length}</div>
                  </div>
                </div>

                {/* Null Summary Table */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-3">Null Values Summary</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Column</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Null Count</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Null %</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(uploadData.null_summary).map(([col, info]) => (
                          <tr key={col} className={info.null_count > 0 ? 'bg-red-50' : ''}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{col}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{info.dtype}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{info.null_count}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{info.null_percentage}%</td>
                            <td className="px-4 py-3 text-sm">
                              {info.null_count > 0 ? (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleNullValueAction(col, e.target.value);
                                      e.target.value = ''; // Reset select
                                    }
                                  }}
                                  className="px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  disabled={isHandlingNulls}
                                >
                                  <option value="">Choose action...</option>
                                  <option value="mean">Replace with Mean</option>
                                  <option value="median">Replace with Median</option>
                                  <option value="mode">Replace with Mode</option>
                                  <option value="std">Replace with Std</option>
                                  <option value="max">Replace with Max</option>
                                  <option value="min">Replace with Min</option>
                                  <option value="delete_row">Delete Rows</option>
                                  <option value="delete_column">Delete Column</option>
                                </select>
                              ) : (
                                <span className="text-green-600 font-medium">✓ Clean</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Data Preview */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-3">Sample Data (First 10 Rows)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          {uploadData.columns.map((col) => (
                            <th key={col} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadData.sample_data.map((row, idx) => (
                          <tr key={idx}>
                            {uploadData.columns.map((col) => (
                              <td key={col} className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualization Tabs */}
          {uploadData && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-700 font-bold">3</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Visualizations & Analysis</h3>
              </div>

              <div className="ml-13 space-y-8">
                {/* Scatter Plot */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Scatter Plot (Column vs Column)
                  </h4>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">X-Axis Column</label>
                      <select
                        value={xColumn}
                        onChange={(e) => setXColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Y-Axis Column</label>
                      <select
                        value={yColumn}
                        onChange={(e) => setYColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleGenerateScatter}
                        disabled={!xColumn || !yColumn || isGeneratingScatter}
                        className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isGeneratingScatter ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4" />
                            Generate
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {scatterData && (
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => downloadPlotAsPNG('scatter-plot', `scatter_${scatterData.x_label}_vs_${scatterData.y_label}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 text-sm"
                          title="Download plot as PNG"
                        >
                          <Download className="w-4 h-4" />
                          Download PNG
                        </button>
                      </div>
                      <div id="scatter-plot">
                        <Plot
                          data={[
                            {
                              x: scatterData.x,
                              y: scatterData.y,
                              type: 'scatter',
                              mode: 'markers',
                              marker: { color: '#3b82f6', size: 8 },
                              name: `${scatterData.x_label} vs ${scatterData.y_label}`,
                            },
                          ]}
                          layout={{
                            title: { text: `${scatterData.x_label} vs ${scatterData.y_label}` },
                            xaxis: { title: { text: scatterData.x_label } },
                            yaxis: { title: { text: scatterData.y_label } },
                            autosize: true,
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '500px' }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        {scatterData.points_count.toLocaleString()} data points
                      </p>
                    </div>
                  )}
                </div>

                {/* Histogram */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    Histogram Analysis
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Column</label>
                      <select
                        value={histColumn}
                        onChange={(e) => setHistColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleGenerateHistogram}
                        disabled={!histColumn || isGeneratingHistogram}
                        className="w-full px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isGeneratingHistogram ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4" />
                            Generate Histogram
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {histogramData && (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() => downloadPlotAsPNG('histogram-plot', `histogram_${histogramData.column}`)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 text-sm"
                            title="Download plot as PNG"
                          >
                            <Download className="w-4 h-4" />
                            Download PNG
                          </button>
                        </div>
                        <div id="histogram-plot">
                          <Plot
                            data={[
                              {
                                x: histogramData.bin_edges.slice(0, -1).map((edge, i) => 
                                  (edge + histogramData.bin_edges[i + 1]) / 2
                                ),
                                y: histogramData.hist,
                                type: 'bar',
                                marker: { color: '#10b981' },
                                name: 'Frequency',
                              },
                            ]}
                            layout={{
                              title: { text: `Distribution of ${histogramData.column}` },
                              xaxis: { title: { text: histogramData.column } },
                              yaxis: { title: { text: 'Frequency' } },
                              autosize: true,
                            }}
                            config={{ responsive: true }}
                            style={{ width: '100%', height: '400px' }}
                          />
                        </div>
                      </div>
                      
                      {/* Statistics */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                          <div className="text-xs text-gray-600 mb-1">Mean</div>
                          <div className="text-lg font-bold text-gray-900">{histogramData.stats.mean.toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                          <div className="text-xs text-gray-600 mb-1">Median</div>
                          <div className="text-lg font-bold text-gray-900">{histogramData.stats.median.toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                          <div className="text-xs text-gray-600 mb-1">Std Dev</div>
                          <div className="text-lg font-bold text-gray-900">{histogramData.stats.std.toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                          <div className="text-xs text-gray-600 mb-1">Skewness</div>
                          <div className="text-lg font-bold text-gray-900">{histogramData.stats.skewness.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Correlation Analysis - Continued in next message due to length */}
                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Correlation Analysis
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Correlation Threshold: {corrThreshold}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={corrThreshold}
                        onChange={(e) => setCorrThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5</span>
                        <span>1.0</span>
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleCalculateCorrelation}
                        disabled={isCalculatingCorrelation}
                        className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isCalculatingCorrelation ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4" />
                            Calculate Correlation
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {correlationData && (
                    <div className="space-y-4">
                      {/* Highly Correlated Pairs */}
                      {correlationData.highly_correlated.length > 0 && (
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <h5 className="text-md font-bold text-gray-800 mb-3">
                            Highly Correlated Pairs (|correlation| ≥ {corrThreshold})
                          </h5>
                          <div className="space-y-2">
                            {correlationData.highly_correlated.map((pair, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-gray-800">{pair.column1}</span>
                                  <span className="text-gray-500">↔</span>
                                  <span className="font-semibold text-gray-800">{pair.column2}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    Math.abs(pair.correlation) >= 0.9 ? 'bg-red-100 text-red-700' :
                                    Math.abs(pair.correlation) >= 0.8 ? 'bg-orange-100 text-orange-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {pair.correlation.toFixed(3)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRemoveCorrelatedColumns([pair.column2])}
                                  className="px-3 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600 transition flex items-center gap-1"
                                  title="Remove this column"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {correlationData.highly_correlated.length === 0 && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-green-800 font-medium">
                            ✓ No highly correlated features found above the threshold
                          </p>
                        </div>
                      )}

                      {/* Correlation Heatmap */}
                      <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() => downloadPlotAsPNG('correlation-heatmap', 'correlation_heatmap')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 text-sm"
                            title="Download heatmap as PNG"
                          >
                            <Download className="w-4 h-4" />
                            Download PNG
                          </button>
                        </div>
                        <div id="correlation-heatmap">
                          <Plot
                            data={[
                              {
                                z: correlationData.columns.map(col1 =>
                                  correlationData.columns.map(col2 =>
                                    correlationData.correlation_matrix[col1][col2]
                                  )
                                ),
                                x: correlationData.columns,
                                y: correlationData.columns,
                                type: 'heatmap',
                                colorscale: [
                                  [0, '#b91c1c'],      // Strong negative (red)
                                  [0.25, '#f87171'],   // Weak negative (light red)
                                  [0.5, '#ffffff'],    // No correlation (white)
                                  [0.75, '#93c5fd'],   // Weak positive (light blue)
                                  [1, '#1e3a8a']       // Strong positive (dark blue)
                                ],
                                zmin: -1,
                                zmax: 1,
                                colorbar: {
                                  title: {
                                    text: 'Correlation',
                                    side: 'right'
                                  },
                                  tickmode: 'linear',
                                  tick0: -1,
                                  dtick: 0.5
                                },
                                hovertemplate: '<b>%{y}</b> vs <b>%{x}</b><br>Correlation: %{z:.3f}<extra></extra>',
                                text: correlationData.columns.map(col1 =>
                                  correlationData.columns.map(col2 =>
                                    correlationData.correlation_matrix[col1][col2]?.toFixed(2) || ''
                                  )
                                ),
                                texttemplate: '%{text}',
                                textfont: {
                                  size: 10
                                },
                                showscale: true,
                              } as any,
                            ]}
                            layout={{
                              title: { 
                                text: 'Correlation Heatmap',
                                font: { size: 18 }
                              },
                              xaxis: { 
                                title: { text: '' },
                                tickangle: -45,
                                side: 'bottom'
                              },
                              yaxis: { 
                                title: { text: '' },
                                autorange: 'reversed'
                              },
                              autosize: true,
                              margin: { l: 100, r: 100, t: 100, b: 150 },
                            }}
                            config={{ responsive: true }}
                            style={{ width: '100%', height: '700px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter by X Interval */}
                <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    Filter Data by X Interval
                  </h4>
                  
                  <div className="grid md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">X Column</label>
                      <select
                        value={xColumn}
                        onChange={(e) => setXColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Y Column</label>
                      <select
                        value={yColumn}
                        onChange={(e) => setYColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">X Min</label>
                      <input
                        type="number"
                        step="any"
                        value={xMin}
                        onChange={(e) => setXMin(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Min value"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">X Max</label>
                      <input
                        type="number"
                        step="any"
                        value={xMax}
                        onChange={(e) => setXMax(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Max value"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleFilterInterval}
                        disabled={!xColumn || !yColumn || !xMin || !xMax || isFiltering}
                        className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isFiltering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Filtering...
                          </>
                        ) : (
                          'Filter'
                        )}
                      </button>
                    </div>
                  </div>

                  {filterData && (
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-600">
                          Found {filterData.filtered_count} data points where {filterData.x_column} is between {filterData.x_range[0]} and {filterData.x_range[1]}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={downloadFilteredData}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2 text-sm"
                            title="Download filtered data as CSV"
                          >
                            <Download className="w-4 h-4" />
                            Download CSV
                          </button>
                          <button
                            onClick={() => downloadPlotAsPNG('filtered-plot', `filtered_${filterData.x_column}_vs_${filterData.y_column}`)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2 text-sm"
                            title="Download plot as PNG"
                          >
                            <Download className="w-4 h-4" />
                            Download PNG
                          </button>
                        </div>
                      </div>
                      <div id="filtered-plot">
                        <Plot
                          data={[
                            {
                              x: filterData.x_values,
                              y: filterData.y_values,
                              type: 'scatter',
                              mode: 'markers',
                              marker: { color: '#f97316', size: 8 },
                              name: 'Filtered Data',
                            },
                          ]}
                          layout={{
                            title: { text: `Filtered: ${filterData.x_column} vs ${filterData.y_column}` },
                            xaxis: { title: { text: filterData.x_column } },
                            yaxis: { title: { text: filterData.y_column } },
                            autosize: true,
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '400px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D Surface Plot */}
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    3D Surface Plot
                  </h4>
                  
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">X Column</label>
                      <select
                        value={xColumn}
                        onChange={(e) => setXColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Y Column</label>
                      <select
                        value={yColumn}
                        onChange={(e) => setYColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Z Column</label>
                      <select
                        value={zColumn}
                        onChange={(e) => setZColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.numeric_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleGenerateSurface}
                        disabled={!xColumn || !yColumn || !zColumn || isGeneratingSurface}
                        className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isGeneratingSurface ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate 3D'
                        )}
                      </button>
                    </div>
                  </div>

                  {surfaceData && (
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => downloadPlotAsPNG('surface-plot', `3d_${surfaceData.x_label}_${surfaceData.y_label}_${surfaceData.z_label}`)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2 text-sm"
                          title="Download 3D plot as PNG"
                        >
                          <Download className="w-4 h-4" />
                          Download PNG
                        </button>
                      </div>
                      <div id="surface-plot">
                        <Plot
                          data={[
                            {
                              x: surfaceData.x,
                              y: surfaceData.y,
                              z: surfaceData.z,
                              type: 'scatter3d',
                              mode: 'markers',
                              marker: {
                                size: 4,
                                color: surfaceData.z,
                                colorscale: 'Viridis',
                                showscale: true,
                                colorbar: {
                                  title: {
                                    text: surfaceData.z_label,
                                    side: 'right'
                                  }
                                }
                              },
                            },
                          ]}
                          layout={{
                            title: { text: `3D Plot: ${surfaceData.x_label} vs ${surfaceData.y_label} vs ${surfaceData.z_label}` },
                            scene: {
                              xaxis: { title: { text: surfaceData.x_label } },
                              yaxis: { title: { text: surfaceData.y_label } },
                              zaxis: { title: { text: surfaceData.z_label } },
                            },
                            autosize: true,
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '600px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Text to Numerical Encoding */}
                <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-teal-600" />
                    Convert Text to Numerical
                  </h4>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Categorical Column</label>
                      <select
                        value={encodeColumn}
                        onChange={(e) => setEncodeColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select...</option>
                        {uploadData.categorical_columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Encoding Method</label>
                      <select
                        value={encodeMethod}
                        onChange={(e) => setEncodeMethod(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="label">Label Encoding (0, 1, 2...)</option>
                        <option value="onehot">One-Hot Encoding</option>
                        <option value="frequency">Frequency Encoding</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleEncodeCategorical}
                        disabled={!encodeColumn || isEncoding}
                        className="w-full px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isEncoding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Encoding...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Encode
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Encoding will convert text categories to numbers. Original column will be preserved as {encodeColumn}_original
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Download Section */}
          {uploadData && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-700 font-bold">4</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Download Cleaned Data</h3>
              </div>

              <div className="ml-13">
                <button
                  onClick={handleDownload}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-3"
                >
                  <Download className="w-6 h-6" />
                  Download Cleaned Dataset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
