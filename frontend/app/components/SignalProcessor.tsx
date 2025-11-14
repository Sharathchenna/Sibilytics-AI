'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Settings, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { uploadFile, processSignal, processSignalRaw, generateAllPlots, downloadAllStats, type UploadResponse, type ProcessResponse, type BatchPlotsResponse, type UploadProgress } from '@/lib/api';
import PlotDisplay from './PlotDisplay';

// Type for storing all file statistics
interface FileStatistics {
  filename: string;
  [key: string]: number | string;
}

// Type for uploaded file info
interface UploadedFileInfo {
  file: File;
  uploadResponse: UploadResponse;
}

export default function SignalProcessor() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [selectedFileForVisualization, setSelectedFileForVisualization] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Multi-file state management - separate for raw and denoised
  const [allStatsRaw, setAllStatsRaw] = useState<FileStatistics[]>([]);
  const [allStatsDenoised, setAllStatsDenoised] = useState<FileStatistics[]>([]);
  const [isDownloadingRaw, setIsDownloadingRaw] = useState(false);
  const [isDownloadingDenoised, setIsDownloadingDenoised] = useState(false);

  // Configuration
  const [columns, setColumns] = useState<number>(2);
  const [timeColumn, setTimeColumn] = useState<number>(0);
  const [signalColumn, setSignalColumn] = useState<number>(1);
  const [waveletType, setWaveletType] = useState<string>('bior1.3');
  const [nLevels, setNLevels] = useState<number>(1);

  // Results - store for each file
  const [processData, setProcessData] = useState<Map<number, ProcessResponse>>(new Map());
  const [plotsData, setPlotsData] = useState<Map<number, BatchPlotsResponse>>(new Map());
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current file upload response
  const currentUploadResponse = uploadedFiles[selectedFileForVisualization]?.uploadResponse || null;
  const currentProcessData = processData.get(selectedFileForVisualization) || null;
  const currentPlotsData = plotsData.get(selectedFileForVisualization) || null;

  const waveletOptions = [
    'bior1.3', 'bior1.5', 'bior2.2', 'bior2.4', 
    'bior2.6', 'bior3.1', 'bior3.3', 'bior3.5', 
    'bior3.7', 'bior3.9', 'bior4.4', 'bior5.5', 
    'bior6.8'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      Array.from(files).forEach(file => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'txt' || fileExtension === 'lvm' || fileExtension === 'csv' || fileExtension === 'xlsx') {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        setUploadStatus(`${validFiles.length} file(s) selected`);
        setError('');
        setShowConfig(false);
        setShowResults(false);

        if (invalidFiles.length > 0) {
          setError(`Skipped ${invalidFiles.length} invalid file(s). Only .txt, .lvm, .csv, and .xlsx files are allowed.`);
        }
      } else {
        setSelectedFiles([]);
        setUploadStatus('Please select valid files (.txt, .lvm, .csv, .xlsx)');
        setError('No valid files selected');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError('');
    setUploadProgress(null);

    try {
      const newUploadedFiles: UploadedFileInfo[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatus(`Uploading file ${i + 1}/${selectedFiles.length}: ${file.name}`);

        const response = await uploadFile(file, (progress) => {
          setUploadProgress(progress);

          // Update status message based on progress status
          if (progress.status === 'compressing') {
            setUploadStatus(`File ${i + 1}/${selectedFiles.length}: Compressing ${file.name}...`);
          } else if (progress.status === 'uploading') {
            setUploadStatus(`File ${i + 1}/${selectedFiles.length}: Uploading ${file.name}: ${progress.percentage}%`);
          } else if (progress.status === 'complete') {
            setUploadStatus(`File ${i + 1}/${selectedFiles.length}: Upload complete!`);
          }
        });

        newUploadedFiles.push({ file, uploadResponse: response });
      }

      setUploadedFiles(newUploadedFiles);
      setSelectedFileForVisualization(0);
      if (newUploadedFiles.length > 0) {
        setColumns(newUploadedFiles[0].uploadResponse.columns);
      }
      setUploadStatus(`${newUploadedFiles.length} file(s) uploaded successfully!`);
      setShowConfig(true);
      setUploadProgress(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      setUploadStatus('');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setError('');

    try {
      const newProcessData = new Map(processData);
      const newPlotsData = new Map(plotsData);

      for (let i = 0; i < uploadedFiles.length; i++) {
        const { uploadResponse } = uploadedFiles[i];
        setUploadStatus(`Processing file ${i + 1}/${uploadedFiles.length}: ${uploadResponse.filename}...`);

        // Process DENOISED signal to get statistics
        const processResponse = await processSignal(
          uploadResponse.file_id,
          timeColumn,
          signalColumn,
          waveletType,
          nLevels
        );
        newProcessData.set(i, processResponse);

        // Add denoised statistics
        const newStatsDenoised: FileStatistics = {
          filename: processResponse.filename,
          ...processResponse.statistics,
        };

        // Remove existing entry for this file and add new one
        setAllStatsDenoised((prevStats) => {
          const filtered = prevStats.filter((s) => s.filename !== processResponse.filename);
          return [...filtered, newStatsDenoised];
        });

        // Process RAW signal to get statistics (without denoising)
        setUploadStatus(`Processing raw signal for file ${i + 1}/${uploadedFiles.length}...`);
        const processRawResponse = await processSignalRaw(
          uploadResponse.file_id,
          timeColumn,
          signalColumn
        );

        // Add raw statistics
        const newStatsRaw: FileStatistics = {
          filename: processRawResponse.filename,
          ...processRawResponse.statistics,
        };

        setAllStatsRaw((prevStats) => {
          const filtered = prevStats.filter((s) => s.filename !== processRawResponse.filename);
          return [...filtered, newStatsRaw];
        });

        // Generate all plots
        setUploadStatus(`Generating visualizations for file ${i + 1}/${uploadedFiles.length}...`);
        const plotsResponse = await generateAllPlots(
          uploadResponse.file_id,
          timeColumn,
          signalColumn,
          waveletType,
          nLevels
        );
        newPlotsData.set(i, plotsResponse);
      }

      setProcessData(newProcessData);
      setPlotsData(newPlotsData);
      setUploadStatus(`Processing complete for ${uploadedFiles.length} file(s)!`);
      setShowResults(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMsg);
      setUploadStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadRawStats = async () => {
    if (allStatsRaw.length === 0) {
      setError('No raw statistics available to download');
      return;
    }

    setIsDownloadingRaw(true);
    setError('');

    try {
      await downloadAllStats(allStatsRaw);
      setUploadStatus(`Downloaded raw statistics for ${allStatsRaw.length} file(s)`);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed';
      setError(errorMsg);
    } finally {
      setIsDownloadingRaw(false);
    }
  };

  const handleDownloadDenoisedStats = async () => {
    if (allStatsDenoised.length === 0) {
      setError('No denoised statistics available to download');
      return;
    }

    setIsDownloadingDenoised(true);
    setError('');

    try {
      await downloadAllStats(allStatsDenoised);
      setUploadStatus(`Downloaded denoised statistics for ${allStatsDenoised.length} file(s)`);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed';
      setError(errorMsg);
    } finally {
      setIsDownloadingDenoised(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setUploadedFiles([]);
    setSelectedFileForVisualization(0);
    setUploadStatus('');
    setShowConfig(false);
    setShowResults(false);
    setProcessData(new Map());
    setPlotsData(new Map());
    setError('');
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div id="signal-processing" className="py-20 bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">Try It Now</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Signal Processing & Feature Extraction
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload your signal data and extract meaningful features using advanced wavelet decomposition techniques
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white p-8 rounded-2xl shadow-xl mb-6 border border-gray-100">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Upload className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Upload Signal Data</h3>
            </div>
            <p className="text-gray-600 text-sm flex flex-wrap items-center justify-center gap-2">
              <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium">.txt</span>
              <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium">.lvm</span>
              <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium">.csv</span>
              <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium">.xlsx</span>
              <span className="text-gray-500">Supported formats</span>
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all duration-300 group">
            <div className="mb-6">
              <FileText className="mx-auto h-16 w-16 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" />
            </div>
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 hover:scale-105 transition-all inline-block shadow-lg hover:shadow-xl">
                {selectedFiles.length > 0 ? '✓ Change Files' : '📁 Select Files'}
              </span>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".txt,.lvm,.csv,.xlsx"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="mt-4 text-sm text-gray-500">
              or drag and drop your files here (multiple files supported)
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Status */}
          {uploadStatus && !error && (
            <div className={`mt-6 p-4 rounded flex items-center gap-3 ${
              uploadStatus.includes('successfully') || uploadStatus.includes('complete')
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {isUploading || isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <p className="font-medium">{uploadStatus}</p>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadProgress && isUploading && (
            <div className="mt-6 bg-white p-6 rounded-lg border-2 border-blue-300 shadow-lg">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {uploadProgress.status === 'compressing' ? '🗜️ Compressing' : 
                     uploadProgress.status === 'uploading' ? '📤 Uploading' : 
                     uploadProgress.status === 'complete' ? '✅ Complete' : 
                     '❌ Error'}
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {uploadProgress.percentage}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                  <div
                    className={`h-full flex items-center justify-center text-xs font-semibold text-white transition-all duration-300 ${
                      uploadProgress.status === 'compressing' ? 'bg-yellow-500' :
                      uploadProgress.status === 'uploading' ? 'bg-blue-600' :
                      uploadProgress.status === 'complete' ? 'bg-green-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${uploadProgress.percentage}%` }}
                  >
                    {uploadProgress.percentage > 10 && `${uploadProgress.percentage}%`}
                  </div>
                </div>

                {/* MB Progress */}
                {uploadProgress.status === 'uploading' && (
                  <div className="mt-2 text-center">
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-blue-600">
                        {uploadProgress.uploadedMB.toFixed(2)} MB
                      </span>
                      {' / '}
                      <span className="font-semibold text-gray-800">
                        {uploadProgress.totalMB.toFixed(2)} MB
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 rounded flex items-center gap-3 bg-red-100 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Upload Button */}
          {selectedFiles.length > 0 && uploadedFiles.length === 0 && (
            <button
              onClick={handleFileUpload}
              disabled={isUploading}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>

        {/* Configuration Section */}
        {showConfig && uploadedFiles.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow-xl mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-green-600" />
              <h3 className="text-2xl font-bold text-gray-800">Processing Configuration</h3>
            </div>

            {/* File Selection Dropdown */}
            {uploadedFiles.length > 1 && (
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-emerald-50 p-4 rounded-lg border-2 border-emerald-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select File to Visualize
                </label>
                <select
                  value={selectedFileForVisualization}
                  onChange={(e) => setSelectedFileForVisualization(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                >
                  {uploadedFiles.map((fileInfo, idx) => (
                    <option key={idx} value={idx}>
                      {fileInfo.file.name} ({fileInfo.uploadResponse.rows.toLocaleString()} points)
                    </option>
                  ))}
                </select>
                {/* <p className="mt-2 text-sm text-gray-600">
                  All files will be processed, but you can choose which one to display visualizations for
                </p> */}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Column Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time Column
                </label>
                <select
                  value={timeColumn}
                  onChange={(e) => setTimeColumn(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-green-600"
                >
                  {Array.from({ length: columns }, (_, i) => (
                    <option key={i} value={i}>Column {i + 1}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Signal Column
                </label>
                <select
                  value={signalColumn}
                  onChange={(e) => setSignalColumn(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-green-600"
                >
                  {Array.from({ length: columns }, (_, i) => (
                    <option key={i} value={i}>Column {i + 1}</option>
                  ))}
                </select>
              </div>

              {/* Wavelet Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wavelet Type
                </label>
                <select
                  value={waveletType}
                  onChange={(e) => setWaveletType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-green-600"
                >
                  {waveletOptions.map((wavelet) => (
                    <option key={wavelet} value={wavelet}>{wavelet}</option>
                  ))}
                </select>
              </div>

              {/* Decomposition Levels */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Decomposition Levels: {nLevels}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={nLevels}
                  onChange={(e) => setNLevels(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5" />
                  Process Signal
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Section - Expandable */}
        {showResults && currentProcessData && currentPlotsData && (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => setShowResults(!showResults)}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between hover:from-green-700 hover:to-teal-700 transition"
            >
              <h3 className="text-2xl font-bold">Processing Results</h3>
              <span className="text-2xl">{showResults ? '−' : '+'}</span>
            </button>

            {showResults && (
              <div className="p-8">
                {/* Current File Display */}
                {/* {uploadedFiles.length > 1 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800">
                      Currently viewing: {uploadedFiles[selectedFileForVisualization].file.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Use the dropdown in Configuration section to switch between files
                    </p>
                  </div>
                )} */}

                {/* Plots Section */}
                <PlotDisplay plotsData={currentPlotsData} />

                {/* Download Features Section */}
                <div className="mt-12 bg-gradient-to-br from-blue-50 to-emerald-50 p-8 rounded-xl border-2 border-emerald-200">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Download Features</h3>

                  {uploadedFiles.length > 1 && (
                    <p className="text-center text-gray-700 mb-6 bg-white/50 py-3 px-4 rounded-lg">
                      <span className="font-semibold">Consolidated Download:</span> Features from all {uploadedFiles.length} files will be combined into a single CSV file
                    </p>
                  )}

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleDownloadRawStats}
                      disabled={isDownloadingRaw || allStatsRaw.length === 0}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl"
                    >
                      {isDownloadingRaw ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-6 h-6" />
                          Raw Signal Features
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadDenoisedStats}
                      disabled={isDownloadingDenoised || allStatsDenoised.length === 0}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl"
                    >
                      {isDownloadingDenoised ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-6 h-6" />
                          Denoised Signal Features
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Reset Button */}
                <div className="mt-8 text-center">
                  <button
                    onClick={resetForm}
                    className="bg-gray-600 text-white px-8 py-3 rounded font-semibold hover:bg-gray-700 transition"
                  >
                    Process Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

