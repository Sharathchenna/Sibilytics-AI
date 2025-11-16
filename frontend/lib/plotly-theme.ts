/**
 * Custom Plotly Theme for Sibilytics AI
 * Modern & Clean Design with Emerald Brand Colors
 */

type Layout = Partial<Plotly.Layout>;
type Config = Partial<Plotly.Config>;

// Brand Colors - Emerald Theme
export const colors = {
  primary: '#059669',      // emerald-600
  primaryLight: '#10b981', // emerald-500
  primaryDark: '#047857',  // emerald-700
  secondary: '#64748b',    // slate-500
  accent: '#3b82f6',       // blue-500
  success: '#10b981',      // green-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444',        // red-500
  text: '#0f172a',         // slate-900
  textSecondary: '#475569', // slate-600
  background: '#ffffff',   // white
  gridColor: '#e2e8f0',    // slate-200
  borderColor: '#cbd5e1',  // slate-300
};

// Color palette for multiple traces
export const colorway = [
  colors.primary,       // emerald-600 (main)
  colors.accent,        // blue-500
  colors.secondary,     // slate-500
  colors.warning,       // amber-500
  colors.success,       // green-500
  colors.error,         // red-500
  colors.primaryLight,  // emerald-500
  colors.primaryDark,   // emerald-700
];

/**
 * Custom Plotly Layout Template
 * Applies professional styling with emerald theme
 */
export const customLayout: Layout = {
  // Font Configuration - Geist Sans
  font: {
    family: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    size: 13,
    color: colors.text,
  },

  // Title Styling
  title: {
    font: {
      family: "'Geist Sans', sans-serif",
      size: 18,
      color: colors.text,
    },
    x: 0.5, // Center title
    xanchor: 'center',
  },

  // Paper & Plot Background
  paper_bgcolor: colors.background,
  plot_bgcolor: colors.background,

  // Color Scheme
  colorway: colorway,

  // Axis Configuration
  xaxis: {
    gridcolor: colors.gridColor,
    linecolor: colors.borderColor,
    zerolinecolor: colors.borderColor,
    tickfont: {
      size: 12,
      color: colors.textSecondary,
    },
    title: {
      font: {
        size: 13,
        color: colors.text,
      },
    },
    showgrid: true,
    showline: true,
    zeroline: true,
  },

  yaxis: {
    gridcolor: colors.gridColor,
    linecolor: colors.borderColor,
    zerolinecolor: colors.borderColor,
    tickfont: {
      size: 12,
      color: colors.textSecondary,
    },
    title: {
      font: {
        size: 13,
        color: colors.text,
      },
    },
    showgrid: true,
    showline: true,
    zeroline: true,
  },

  // Legend Configuration
  legend: {
    bgcolor: 'rgba(255, 255, 255, 0.9)',
    bordercolor: colors.borderColor,
    borderwidth: 1,
    font: {
      size: 12,
      color: colors.text,
    },
  },

  // Hover Label Styling
  hoverlabel: {
    bgcolor: 'rgba(255, 255, 255, 0.98)', // White background with high opacity
    bordercolor: '#059669', // Emerald border
    font: {
      family: "'Geist Sans', sans-serif",
      size: 13,
      color: '#0f172a', // Dark slate text
    },
    align: 'left',
    namelength: -1, // Show full trace name
  },

  // Modebar (toolbar) Styling
  modebar: {
    bgcolor: 'rgba(255, 255, 255, 0.8)',
    color: colors.secondary,
    activecolor: colors.primary,
  },

  // Margins
  margin: {
    l: 60,
    r: 40,
    t: 60,
    b: 60,
  },

  // Auto-sizing
  autosize: true,
};

/**
 * Plotly Configuration
 * Controls interaction and display options
 */
export const customConfig: Config = {
  // Display Mode Bar
  displayModeBar: true,

  // Mode Bar Buttons
  modeBarButtonsToRemove: [
    'sendDataToCloud',
    'lasso2d',
    'select2d',
  ],

  // Display Logo
  displaylogo: false,

  // Responsive
  responsive: true,

  // Locale
  locale: 'en',

  // Editable
  editable: false,

  // Scrollzoom
  scrollZoom: true,
};

/**
 * Apply custom theme to Plotly layout
 * Merges custom layout with user-provided layout
 */
export function applyCustomTheme(userLayout?: Layout): Layout {
  return {
    ...customLayout,
    ...userLayout,
    // Deep merge for nested objects
    font: {
      ...customLayout.font,
      ...userLayout?.font,
    },
    xaxis: {
      ...customLayout.xaxis,
      ...userLayout?.xaxis,
    },
    yaxis: {
      ...customLayout.yaxis,
      ...userLayout?.yaxis,
    },
    legend: {
      ...customLayout.legend,
      ...userLayout?.legend,
    },
    hoverlabel: {
      ...customLayout.hoverlabel,
      ...userLayout?.hoverlabel,
      font: {
        ...customLayout.hoverlabel?.font,
        ...userLayout?.hoverlabel?.font,
      },
    },
  };
}

/**
 * Create styled trace with emerald theme
 * Applies consistent styling to individual traces
 */
export function createStyledTrace(data: any, overrides?: any) {
  return {
    ...data,
    line: {
      color: colors.primary,
      width: 2,
      ...data.line,
      ...overrides?.line,
    },
    marker: {
      color: colors.primary,
      size: 6,
      line: {
        color: colors.background,
        width: 1,
      },
      ...data.marker,
      ...overrides?.marker,
    },
    ...overrides,
  };
}

/**
 * Heatmap color scale - Emerald theme
 */
export const heatmapColorscale: [number, string][] = [
  [0, '#f0fdf4'],    // emerald-50
  [0.2, '#d1fae5'],  // emerald-100
  [0.4, '#6ee7b7'],  // emerald-300
  [0.6, '#10b981'],  // emerald-500
  [0.8, '#059669'],  // emerald-600
  [1, '#047857'],    // emerald-700
];

/**
 * Contour color scale - Professional blue-emerald
 */
export const contourColorscale: [number, string][] = [
  [0, '#dbeafe'],    // blue-100
  [0.25, '#93c5fd'], // blue-300
  [0.5, '#3b82f6'],  // blue-500
  [0.75, '#10b981'], // emerald-500
  [1, '#059669'],    // emerald-600
];

export default {
  layout: customLayout,
  config: customConfig,
  colors,
  colorway,
  applyCustomTheme,
  createStyledTrace,
  heatmapColorscale,
  contourColorscale,
};
