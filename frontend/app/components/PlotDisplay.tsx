'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, TrendingUp, Activity, Waves, BarChart3, Image as ImageIcon } from 'lucide-react';
import type { BatchPlotsResponse } from '@/lib/api';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotDisplayProps {
  plotsData: BatchPlotsResponse;
}

type PlotType = 'signal_raw' | 'signal_denoised' | 'fft_raw' | 'fft_denoised' | 'fft_approx' | 'fft_detail' | 'wavelet_approx' | 'wavelet_detail' | 'wavelet_pearson_approx' | 'wavelet_pearson_detail' | 'spectrum_raw' | 'spectrum_denoised';

export default function PlotDisplay({ plotsData }: PlotDisplayProps) {
  const [isClient, setIsClient] = useState(false);
  const [signalType, setSignalType] = useState<'raw' | 'denoised'>('raw');
  const [fftType, setFftType] = useState<'raw' | 'denoised' | 'approx' | 'detail'>('raw');
  const [waveletType, setWaveletType] = useState<'approx' | 'detail' | 'pearson_approx' | 'pearson_detail'>('approx');
  const [spectrumType, setSpectrumType] = useState<'raw' | 'denoised'>('raw');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const allPlotCategories = [
    { id: 'signal_raw', label: 'Raw Signal', icon: Activity, color: 'blue' },
    { id: 'signal_denoised', label: 'Denoised Signal', icon: TrendingUp, color: 'green' },
    { id: 'fft_raw', label: 'FFT of Raw Signal', icon: BarChart3, color: 'blue' },
    { id: 'fft_denoised', label: 'FFT of Denoised Signal', icon: BarChart3, color: 'orange' },
    { id: 'fft_approx', label: 'FFT of Approx Coefficients', icon: BarChart3, color: 'green' },
    { id: 'fft_detail', label: 'FFT of Detail Coefficients', icon: BarChart3, color: 'purple' },
    { id: 'wavelet_approx', label: 'Wavelet Approximation Coefficients', icon: Waves, color: 'teal' },
    { id: 'wavelet_detail', label: 'Wavelet Detail Coefficients', icon: Waves, color: 'teal' },
    { id: 'wavelet_pearson_approx', label: 'Wavelet Pearson CC (Approx)', icon: Waves, color: 'purple' },
    { id: 'wavelet_pearson_detail', label: 'Wavelet Pearson CC (Detail)', icon: Waves, color: 'purple' },
    { id: 'spectrum_raw', label: 'Spectrogram (Raw)', icon: ImageIcon, color: 'orange' },
    { id: 'spectrum_denoised', label: 'Spectrogram (Denoised)', icon: ImageIcon, color: 'red' },
  ];

  const downloadPlot = async (plotType: PlotType) => {
    const plotDiv = document.querySelector(`[data-plot="${plotType}"] .js-plotly-plot`);
    if (!plotDiv) {
      console.error('Plot not found for:', plotType);
      return;
    }

    try {
      // Use Plotly's built-in download functionality
      const Plotly = await import('plotly.js-dist-min');
      await Plotly.downloadImage(plotDiv as HTMLElement, {
        format: 'png',
        width: 1920,
        height: 1080,
        filename: `${plotType}_plot`,
      });
    } catch (error) {
      console.error('Error downloading plot:', error);
    }
  };

  const downloadCSV = (plotType: PlotType) => {
    const plotData = plotsData.plots[plotType];
    if (!plotData) return;

    const { data, type } = plotData;
    let csvContent = '';

    if (type === 'scatter') {
      if (data.traces) {
        // Multiple traces (FFT, Wavelet)
        const headers = ['x', ...data.traces.map((t: any) => t.name)];
        csvContent = headers.join(',') + '\n';

        const maxLength = Math.max(...data.traces.map((t: any) => t.x.length));
        for (let i = 0; i < maxLength; i++) {
          const row = [data.traces[0].x[i]];
          data.traces.forEach((trace: any) => {
            row.push(trace.y[i] !== undefined ? trace.y[i] : '');
          });
          csvContent += row.join(',') + '\n';
        }
      } else {
        // Single trace (Signal)
        csvContent = 'x,y\n';
        for (let i = 0; i < data.x.length; i++) {
          csvContent += `${data.x[i]},${data.y[i]}\n`;
        }
      }
    } else if (type === 'bar') {
      const xData = data.traces?.[0]?.x || data.x;
      const yData = data.traces?.[0]?.y || data.y;
      csvContent = 'x,y\n';
      for (let i = 0; i < xData.length; i++) {
        csvContent += `${xData[i]},${yData[i]}\n`;
      }
    } else if (type === 'heatmap') {
      // For heatmap, export as x, y, z format
      csvContent = 'x,y,z\n';
      for (let i = 0; i < data.x.length; i++) {
        for (let j = 0; j < data.y.length; j++) {
          csvContent += `${data.x[i]},${data.y[j]},${data.z[j][i]}\n`;
        }
      }
    }

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${plotType}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllCSVs = () => {
    allPlotCategories.forEach((cat, index) => {
      setTimeout(() => downloadCSV(cat.id as PlotType), 300 * index);
    });
  };

  const getAxisLabels = (plotType: PlotType) => {
    switch (plotType) {
      case 'signal_raw':
      case 'signal_denoised':
        return {
          xaxis: 'Time (s)',
          yaxis: 'Amplitude',
        };
      case 'fft_raw':
      case 'fft_denoised':
      case 'fft_approx':
      case 'fft_detail':
        return {
          xaxis: 'Frequency (Hz)',
          yaxis: 'Amplitude',
        };
      case 'wavelet_approx':
      case 'wavelet_detail':
        return {
          xaxis: 'Index',
          yaxis: 'Coefficient Value',
        };
      case 'wavelet_pearson_approx':
      case 'wavelet_pearson_detail':
        return {
          xaxis: 'Coefficient Type',
          yaxis: 'Correlation Coefficient',
        };
      case 'spectrum_raw':
      case 'spectrum_denoised':
        return {
          xaxis: 'Time (s)',
          yaxis: 'Frequency (Hz)',
        };
      default:
        return {
          xaxis: '',
          yaxis: '',
        };
    }
  };

  const renderPlot = (plotType: PlotType) => {
    if (!isClient) return null;

    const plotData = plotsData.plots[plotType];
    if (!plotData) return null;

    const { data, layout, type } = plotData;
    const axisLabels = getAxisLabels(plotType);

    // Convert API data format to Plotly format
    let plotlyData: any[] = [];

    if (type === 'scatter') {
      if (data.traces) {
        // Multiple traces (FFT, Wavelet)
        plotlyData = data.traces.map((trace: any) => ({
          x: trace.x,
          y: trace.y,
          type: 'scatter',
          mode: 'lines',
          name: trace.name,
          line: { color: trace.color },
          hovertemplate: axisLabels.xaxis + ': %{x:.4f}<br>' +
                         axisLabels.yaxis + ': %{y:.4f}' +
                         '<extra></extra>',
        }));
      } else {
        // Single trace (Signal)
        plotlyData = [{
          x: data.x,
          y: data.y,
          type: 'scatter',
          mode: 'lines',
          name: data.name,
          line: { color: data.color },
          hovertemplate: axisLabels.xaxis + ': %{x:.4f}<br>' +
                         axisLabels.yaxis + ': %{y:.4f}' +
                         '<extra></extra>',
        }];
      }
    } else if (type === 'bar') {
      plotlyData = [{
        x: data.traces?.[0]?.x || data.x,
        y: data.traces?.[0]?.y || data.y,
        type: 'bar',
        name: data.traces?.[0]?.name || data.name,
        marker: { color: data.traces?.[0]?.color || data.color },
        hovertemplate: axisLabels.xaxis + ': %{x}<br>' +
                       axisLabels.yaxis + ': %{y:.4f}' +
                       '<extra></extra>',
      }];
    } else if (type === 'heatmap') {
      plotlyData = [{
        x: data.x,
        y: data.y,
        z: data.z,
        type: 'heatmap',
        colorscale: data.colorscale || 'Viridis',
        hovertemplate: axisLabels.xaxis + ': %{x:.4f}<br>' +
                       axisLabels.yaxis + ': %{y:.4f}<br>' +
                       'Intensity: %{z:.2f}' +
                       '<extra></extra>',
      }];
    }

    // Check if this is a spectrogram plot to add right-side y-axis
    const isSpectrogram = plotType === 'spectrum_raw' || plotType === 'spectrum_denoised';

    const plotLayout = {
      ...layout,
      autosize: true,
      font: { size: 14 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      hovermode: 'closest',
      hoverlabel: {
        bgcolor: 'white',
        bordercolor: 'black',
        font: { size: 14, color: 'black' },
      },
      xaxis: {
        ...layout.xaxis,
        title: {
          text: axisLabels.xaxis,
          font: { size: 16, color: '#1f2937', family: 'Arial, sans-serif', weight: 'bold' },
        },
        showline: true,
        linewidth: 2,
        linecolor: 'black',
        gridcolor: '#e5e7eb',
      },
      yaxis: {
        ...layout.yaxis,
        title: {
          text: axisLabels.yaxis,
          font: { size: 16, color: '#1f2937', family: 'Arial, sans-serif', weight: 'bold' },
        },
        showline: true,
        linewidth: 2,
        linecolor: 'black',
        gridcolor: '#e5e7eb',
      },
      ...(isSpectrogram && {
        yaxis2: {
          title: {
            text: axisLabels.yaxis,
            font: { size: 16, color: '#1f2937', family: 'Arial, sans-serif', weight: 'bold' },
          },
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          showline: true,
          linewidth: 2,
          linecolor: 'black',
          matches: 'y',
        },
      }),
      margin: { l: 80, r: isSpectrogram ? 80 : 40, t: 60, b: 80 },
    };

    return (
      <div data-plot={plotType} className="w-full">
        <Plot
          data={plotlyData}
          layout={plotLayout}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
          }}
          style={{ width: '100%', height: '600px' }}
        />
      </div>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">Visualizations</h3>
        <div className="text-sm text-gray-600">
          Processing Time: {plotsData.metadata.total_processing_time}
        </div>
      </div>

      {/* Source Signal Section with Dropdown */}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" />
              <h4 className="text-xl font-bold text-gray-800">Source Signal</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(`signal_${signalType}` as PlotType)}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={() => downloadPlot(`signal_${signalType}` as PlotType)}
                className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>

          {/* Dropdown for Signal Type */}
          <div className="mb-4">
            <label htmlFor="signal-select" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Signal Type:
            </label>
            <select
              id="signal-select"
              value={signalType}
              onChange={(e) => setSignalType(e.target.value as 'raw' | 'denoised')}
              className="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:border-blue-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              <option value="raw">Raw Signal</option>
              <option value="denoised">Denoised Signal</option>
            </select>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg">
            {renderPlot(`signal_${signalType}` as PlotType)}
          </div>
        </div>

        {/* FFT Analysis Section with Dropdown */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h4 className="text-xl font-bold text-gray-800">FFT Analysis</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(`fft_${fftType}` as PlotType)}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={() => downloadPlot(`fft_${fftType}` as PlotType)}
                className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>

          {/* Dropdown for FFT Type */}
          <div className="mb-4">
            <label htmlFor="fft-select" className="block text-sm font-semibold text-gray-700 mb-2">
              Select FFT Type:
            </label>
            <select
              id="fft-select"
              value={fftType}
              onChange={(e) => setFftType(e.target.value as 'raw' | 'denoised' | 'approx' | 'detail')}
              className="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:border-blue-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              <option value="raw">FFT of Raw Signal</option>
              <option value="denoised">FFT of Denoised Signal</option>
              <option value="approx">FFT of Approximation Coefficients</option>
              <option value="detail">FFT of Detail Coefficients</option>
            </select>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg">
            {renderPlot(`fft_${fftType}` as PlotType)}
          </div>
        </div>

        {/* Wavelet Coefficients Section with Dropdown */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Waves className="w-6 h-6 text-teal-600" />
              <h4 className="text-xl font-bold text-gray-800">Wavelet Coefficients</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(`wavelet_${waveletType}` as PlotType)}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={() => downloadPlot(`wavelet_${waveletType}` as PlotType)}
                className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>

          {/* Dropdown for Wavelet Type */}
          <div className="mb-4">
            <label htmlFor="wavelet-select" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Wavelet Type:
            </label>
            <select
              id="wavelet-select"
              value={waveletType}
              onChange={(e) => setWaveletType(e.target.value as 'approx' | 'detail' | 'pearson_approx' | 'pearson_detail')}
              className="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:border-blue-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              <option value="approx">Approximation Coefficients</option>
              <option value="detail">Detail Coefficients</option>
              <option value="pearson_approx">Pearson CC (Approximation)</option>
              <option value="pearson_detail">Pearson CC (Detail)</option>
            </select>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg">
            {renderPlot(`wavelet_${waveletType}` as PlotType)}
          </div>
        </div>

        {/* Time-Frequency Spectrum Section with Dropdown */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-orange-600" />
              <h4 className="text-xl font-bold text-gray-800">Time-Frequency Spectrum</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(`spectrum_${spectrumType}` as PlotType)}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={() => downloadPlot(`spectrum_${spectrumType}` as PlotType)}
                className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>

          {/* Dropdown for Spectrum Type */}
          <div className="mb-4">
            <label htmlFor="spectrum-select" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Spectrum Type:
            </label>
            <select
              id="spectrum-select"
              value={spectrumType}
              onChange={(e) => setSpectrumType(e.target.value as 'raw' | 'denoised')}
              className="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:border-blue-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              <option value="raw">Raw Signal</option>
              <option value="denoised">Denoised Signal</option>
            </select>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg">
            {renderPlot(`spectrum_${spectrumType}` as PlotType)}
          </div>
        </div>
      </div>

      {/* Download All Buttons */}
      <div className="mt-8 flex justify-center gap-4">
        
        <button
          onClick={() => {
            allPlotCategories.forEach((cat, index) => {
              setTimeout(() => downloadPlot(cat.id as PlotType), 500 * index);
            });
          }}
          className="bg-teal-600 text-white px-8 py-3 rounded font-semibold hover:bg-teal-700 transition inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <Download className="w-5 h-5" />
          Download All PNGs
        </button>
      </div>
    </div>
  );
}

