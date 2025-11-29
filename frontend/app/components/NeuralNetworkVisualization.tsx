'use client';

import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';

interface NeuralNetworkVisualizationProps {
  numInputs: number;
  numOutputs?: number;
  architecture: string;
  activation?: string;
  optimizer?: string;
}

export default function NeuralNetworkVisualization({
  numInputs,
  numOutputs = 1,
  architecture,
  activation = 'relu',
  optimizer = 'adam'
}: NeuralNetworkVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'neural_network_architecture.png';
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Parse architecture
    const hiddenLayers = architecture.split(',').map(n => parseInt(n.trim()));
    const layers = [numInputs, ...hiddenLayers, numOutputs];

    // Canvas dimensions - adjusted for better fit
    const width = canvas.width;
    const height = canvas.height;
    const padding = 100;
    const topPadding = 140; // Space for info box
    const bottomPadding = 80; // Space for labels

    // Calculate spacing
    const layerSpacing = (width - 2 * padding) / (layers.length - 1);
    const maxNeuronsToShow = 10; // Reduced for better fit

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#faf5ff');
    bgGradient.addColorStop(1, '#f3e8ff');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Enhanced colors
    const colors = {
      input: '#10b981',      // emerald-500
      hidden: '#8b5cf6',     // violet-500
      output: '#3b82f6',     // blue-500
      connection: 'rgba(139, 92, 246, 0.3)', // MUCH MORE VISIBLE - violet with opacity
      connectionStrong: 'rgba(139, 92, 246, 0.5)', // stronger connections
      text: '#1e293b',       // slate-800
      subtext: '#64748b'     // slate-500
    };

    // Helper function to draw connections between layers
    const drawConnections = (fromLayer: number, toLayer: number, fromNeurons: number, toNeurons: number) => {
      const fromX = padding + fromLayer * layerSpacing;
      const toX = padding + toLayer * layerSpacing;

      const fromNeuronsToShow = Math.min(fromNeurons, maxNeuronsToShow);
      const toNeuronsToShow = Math.min(toNeurons, maxNeuronsToShow);

      const availableHeight = height - topPadding - bottomPadding;
      const fromSpacing = availableHeight / Math.max(fromNeuronsToShow + 1, 2);
      const toSpacing = availableHeight / Math.max(toNeuronsToShow + 1, 2);

      // Draw MORE visible connections with thicker lines
      ctx.lineWidth = 2; // Thicker lines for visibility

      // Draw more connections for better visualization
      const fromSamples = Math.min(8, fromNeuronsToShow);
      const toSamples = Math.min(8, toNeuronsToShow);

      for (let i = 0; i < fromSamples; i++) {
        const fromIdx = Math.floor(i * (fromNeuronsToShow - 1) / Math.max(1, fromSamples - 1));
        const fromY = topPadding + (fromIdx + 0.5) * fromSpacing;

        for (let j = 0; j < toSamples; j++) {
          const toIdx = Math.floor(j * (toNeuronsToShow - 1) / Math.max(1, toSamples - 1));
          const toY = topPadding + (toIdx + 0.5) * toSpacing;

          // Make diagonal connections more visible
          const isMainConnection = (i === j || Math.abs(i - j) <= 1);
          ctx.strokeStyle = isMainConnection ? colors.connectionStrong : colors.connection;

          ctx.beginPath();
          ctx.moveTo(fromX + 15, fromY);
          ctx.lineTo(toX - 15, toY);
          ctx.stroke();
        }
      }
    };

    // Draw all connections first
    for (let l = 0; l < layers.length - 1; l++) {
      drawConnections(l, l + 1, layers[l], layers[l + 1]);
    }

    // Draw neurons and labels
    for (let l = 0; l < layers.length; l++) {
      const layerSize = layers[l];
      const neuronsToShow = Math.min(layerSize, maxNeuronsToShow);
      const x = padding + l * layerSpacing;

      const availableHeight = height - topPadding - bottomPadding;
      const neuronSpacing = availableHeight / Math.max(neuronsToShow + 1, 2);

      // Determine colors based on layer type
      let neuronColor = colors.hidden;

      if (l === 0) {
        neuronColor = colors.input;
      } else if (l === layers.length - 1) {
        neuronColor = colors.output;
      }

      // Draw neurons
      for (let i = 0; i < neuronsToShow; i++) {
        const y = topPadding + (i + 0.5) * neuronSpacing;

        // Neuron shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        // Draw neuron circle with gradient
        const gradient = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 15);
        gradient.addColorStop(0, neuronColor);
        gradient.addColorStop(1, neuronColor + 'cc');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, 2 * Math.PI);
        ctx.fill();

        // Neuron border
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw ellipsis if layer has more neurons than shown
      if (layerSize > maxNeuronsToShow) {
        const ellipsisY = topPadding + (neuronsToShow + 0.5) * neuronSpacing + 10;
        ctx.fillStyle = colors.subtext;
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'transparent';
        ctx.fillText('⋮', x, ellipsisY);
      }

      // Draw layer labels
      ctx.shadowColor = 'transparent';
      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'center';

      const labelY = height - 45;

      if (l === 0) {
        ctx.fillText('Input Layer', x, labelY);
        ctx.font = '14px system-ui';
        ctx.fillStyle = colors.subtext;
        ctx.fillText(`${layerSize} feature${layerSize > 1 ? 's' : ''}`, x, labelY + 20);
      } else if (l === layers.length - 1) {
        ctx.fillText('Output', x, labelY);
        ctx.font = '14px system-ui';
        ctx.fillStyle = colors.subtext;
        ctx.fillText(`${layerSize} neuron${layerSize > 1 ? 's' : ''}`, x, labelY + 20);
      } else {
        ctx.fillText(`Hidden ${l}`, x, labelY);
        ctx.font = '14px system-ui';
        ctx.fillStyle = colors.subtext;
        ctx.fillText(`${layerSize} neurons`, x, labelY + 20);
      }
    }

    // Draw title
    ctx.font = 'bold 22px system-ui';
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.fillText('Neural Network Architecture', width / 2, 35);

    // Draw architecture info box
    const infoBoxY = 55;
    const infoBoxHeight = 70;

    // Info box background with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#d8b4fe';
    ctx.lineWidth = 2;
    roundRect(ctx, 30, infoBoxY, width - 60, infoBoxHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Info text
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'left';

    const infoStartX = 50;
    const col2X = width / 2 + 40;

    ctx.fillText(`Architecture: [${layers.join(', ')}]`, infoStartX, infoBoxY + 25);
    ctx.fillText(`Activation: ${activation.toUpperCase()}`, infoStartX, infoBoxY + 50);
    ctx.fillText(`Optimizer: ${optimizer.toUpperCase()}`, col2X, infoBoxY + 50);
    ctx.fillText(`Total Layers: ${layers.length}`, col2X, infoBoxY + 25);

  }, [numInputs, numOutputs, architecture, activation, optimizer]);

  // Helper function to draw rounded rectangles
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 p-6 rounded-xl border-2 border-purple-300 shadow-xl">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <Download className="w-4 h-4" />
          Download Architecture
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={1100}
        height={550}
        className="w-full h-auto rounded-lg"
        style={{ maxWidth: '100%', display: 'block' }}
      />
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-emerald-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white shadow-lg flex-shrink-0"></div>
          <div>
            <div className="text-sm font-bold text-gray-800">Input Layer</div>
            <div className="text-xs text-gray-500">Feature inputs</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-violet-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 border-2 border-white shadow-lg flex-shrink-0"></div>
          <div>
            <div className="text-sm font-bold text-gray-800">Hidden Layers</div>
            <div className="text-xs text-gray-500">Processing units</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white shadow-lg flex-shrink-0"></div>
          <div>
            <div className="text-sm font-bold text-gray-800">Output Layer</div>
            <div className="text-xs text-gray-500">Prediction result</div>
          </div>
        </div>
      </div>
    </div>
  );
}
