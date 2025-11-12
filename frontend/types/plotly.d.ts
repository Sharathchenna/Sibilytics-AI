declare module 'react-plotly.js' {
  import { Component } from 'react';
  import { PlotParams } from 'plotly.js';

  interface PlotProps extends Partial<PlotParams> {
    data: Partial<Plotly.Data>[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Partial<Plotly.Frame>[];
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    onInitialized?: (figure: Readonly<Plotly.Figure>, graphDiv: Readonly<HTMLElement>) => void;
    onUpdate?: (figure: Readonly<Plotly.Figure>, graphDiv: Readonly<HTMLElement>) => void;
    onPurge?: (figure: Readonly<Plotly.Figure>, graphDiv: Readonly<HTMLElement>) => void;
    onError?: (err: Readonly<Error>) => void;
    onHover?: (event: Readonly<Plotly.PlotHoverEvent>) => void;
    onUnhover?: (event: Readonly<Plotly.PlotMouseEvent>) => void;
    onClick?: (event: Readonly<Plotly.PlotMouseEvent>) => void;
    onSelected?: (event: Readonly<Plotly.PlotSelectionEvent>) => void;
    onRelayout?: (event: Readonly<Plotly.PlotRelayoutEvent>) => void;
    onRestyle?: (event: Readonly<Plotly.PlotRestyleEvent>) => void;
    onRedraw?: () => void;
    onAnimated?: () => void;
    onLegendClick?: (event: Readonly<Plotly.LegendClickEvent>) => boolean;
    onLegendDoubleClick?: (event: Readonly<Plotly.LegendClickEvent>) => boolean;
  }

  export default class Plot extends Component<PlotProps> {}
}

declare module 'plotly.js' {
  export function downloadImage(
    gd: HTMLElement,
    opts: {
      format: 'png' | 'jpeg' | 'webp' | 'svg';
      width?: number;
      height?: number;
      filename?: string;
    }
  ): Promise<string>;
}

