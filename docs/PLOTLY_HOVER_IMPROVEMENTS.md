# Plotly Hover Tooltip Improvements

## Overview
This document describes the improvements made to the Plotly hover tooltips across all visualizations in the frontend application.

## Date: November 16, 2025

---

## Problem Statement
The original implementation had basic hover functionality but lacked:
- Proper formatting of hover tooltip values
- Consistent hover templates across different plot types
- Readable and professional hover label styling
- Clear axis labels and units in tooltips
- Optimized hover interaction modes

## Changes Made

### 1. Added Custom Hover Templates (`hovertemplate`)

#### For Scatter Plots (Signal, FFT, Wavelet plots)
```typescript
// Multiple traces (FFT, Wavelet)
hovertemplate: `<b>${trace.name}</b><br>` +
  `${axisLabels.xaxis}: %{x:.4f}<br>` +
  `${axisLabels.yaxis}: %{y:.4f}<br>` +
  '<extra></extra>'

// Single trace (Signal)
hovertemplate: `<b>${data.name}</b><br>` +
  `${axisLabels.xaxis}: %{x:.6f}<br>` +
  `${axisLabels.yaxis}: %{y:.6f}<br>` +
  '<extra></extra>'
```

**Features:**
- Bold trace name for clear identification
- Axis labels with proper units (Time (s), Frequency (Hz), etc.)
- Precision formatting:
  - `.6f` for signals (6 decimal places)
  - `.4f` for FFT and wavelet data (4 decimal places)
- `<extra></extra>` removes the default trace box

#### For Bar Plots (Wavelet Pearson Correlation)
```typescript
hovertemplate: `<b>${data.name}</b><br>` +
  `${axisLabels.xaxis}: %{x}<br>` +
  `${axisLabels.yaxis}: %{y:.4f}<br>` +
  '<extra></extra>'
```

**Features:**
- X-axis shows category names without decimal formatting
- Y-axis shows correlation values with 4 decimal precision

#### For Heatmaps (Spectrograms)
```typescript
hovertemplate: `${axisLabels.xaxis}: %{x:.4f}<br>` +
  `${axisLabels.yaxis}: %{y:.4f}<br>` +
  `Intensity: %{z:.4f}<br>` +
  '<extra></extra>'
```

**Features:**
- Shows time, frequency, and intensity values
- All values formatted to 4 decimal places
- Added colorbar with title and proper sizing

### 2. Enhanced Hover Label Styling

```typescript
hoverlabel: {
  bgcolor: 'rgba(255, 255, 255, 0.95)',
  font: { 
    color: '#0f172a', 
    size: 13, 
    family: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
  },
  bordercolor: '#059669',
  align: 'left',
  namelength: -1,
}
```

**Improvements:**
- White background with 95% opacity for better readability
- Professional Geist Sans font family (fallback to system fonts)
- Emerald green border matching brand colors
- Left-aligned text for better readability
- Full trace name display (namelength: -1)
- 13px font size for optimal readability

### 3. Optimized Hover Mode

```typescript
hovermode: 'closest'
```

**Benefit:** Shows hover info for the nearest data point, improving user experience when hovering near but not exactly on a data point.

### 4. Improved Axis Configuration

```typescript
xaxis: {
  title: {
    text: axisLabels.xaxis,
    font: { size: 14, color: '#1e293b' },
  },
  showgrid: true,
  gridcolor: '#e2e8f0',
  zeroline: true,
  zerolinecolor: '#cbd5e1',
}
```

**Improvements:**
- Larger axis title font (14px)
- Consistent color scheme (slate colors)
- Enhanced grid visibility
- Clear zero line for reference

### 5. Enhanced Line Styling

```typescript
line: { color: trace.color, width: 2 }
```

**Benefit:** Increased line width from 1px to 2px for better visibility.

### 6. Enhanced Plotly Config

```typescript
config={{
  displayModeBar: true,
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: `${plotType}_plot`,
    height: 1080,
    width: 1920,
    scale: 2,
  },
  scrollZoom: true,
}}
```

**Features:**
- Removed unused lasso and select tools
- High-quality PNG export (1920x1080, 2x scale)
- Dynamic filename based on plot type
- Scroll zoom enabled for better navigation

### 7. Heatmap Colorbar Enhancement

```typescript
colorbar: {
  title: { text: 'Intensity', side: 'right' },
  thickness: 20,
  len: 0.7,
}
```

**Improvements:**
- Clear intensity label
- Optimized thickness and length
- Better visual hierarchy

---

## Axis Labels by Plot Type

| Plot Type | X-axis | Y-axis |
|-----------|--------|--------|
| Signal (Raw/Denoised) | Time (s) | Amplitude |
| FFT Analysis | Frequency (Hz) | Amplitude |
| Wavelet Coefficients | Index | Coefficient Value |
| Wavelet Pearson CC | Coefficient Type | Correlation Coefficient |
| Spectrogram | Time (s) | Frequency (Hz) |

---

## User Experience Improvements

### Before:
- Generic hover tooltips showing only numbers
- No context about what the values represent
- Inconsistent formatting across plots
- Small, hard-to-read fonts
- No clear trace identification

### After:
- ✅ Clear labels with units (Time (s), Frequency (Hz), etc.)
- ✅ Bold trace names for easy identification
- ✅ Consistent decimal precision based on data type
- ✅ Professional Geist Sans font
- ✅ High-contrast, readable styling
- ✅ Emerald brand color accents
- ✅ Smooth hover interactions
- ✅ Better grid and axis visibility

---

## Technical Details

### Precision Formatting Guide

Plotly uses Python-style format specifiers:
- `%{x:.6f}` - 6 decimal places (e.g., 9.613008)
- `%{y:.4f}` - 4 decimal places (e.g., 5.6346)
- `%{z:.2f}` - 2 decimal places (e.g., 3.14)
- `%{x}` - No formatting (useful for categories)

### Template Syntax

```typescript
hovertemplate: `<b>Bold text</b><br>` +  // Bold with line break
  `Label: %{variable:.format}<br>` +      // Formatted value
  '<extra></extra>'                        // Remove extra trace box
```

### Color Scheme

All colors follow the Tailwind CSS slate and emerald palette:
- Text: `#0f172a` (slate-900)
- Axis titles: `#1e293b` (slate-800)
- Grid: `#e2e8f0` (slate-200)
- Zero line: `#cbd5e1` (slate-300)
- Border: `#059669` (emerald-600)

---

## Testing Recommendations

1. **Hover over signal plots** - Verify 6 decimal precision for time and amplitude
2. **Hover over FFT plots** - Check frequency and amplitude formatting
3. **Hover over wavelet plots** - Ensure coefficient values are clear
4. **Hover over spectrograms** - Verify time, frequency, and intensity display
5. **Test different browsers** - Ensure consistent rendering
6. **Check mobile responsiveness** - Verify touch interactions work properly

---

## Browser Compatibility

These improvements are compatible with:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Impact

**Minimal** - Hover templates are computed once during plot rendering and don't affect:
- Initial page load
- Plot rendering time
- Interaction responsiveness

---

## Future Enhancements

Consider adding:
1. **Dynamic precision** - Adjust decimal places based on data range
2. **Statistical overlays** - Show mean, min, max on hover
3. **Comparison mode** - Compare multiple traces simultaneously
4. **Custom tooltips** - Allow users to customize hover display
5. **Export hover data** - Copy tooltip values to clipboard

---

## Related Files

- `/frontend/app/components/PlotDisplay.tsx` - Main plot component
- `/frontend/lib/plotly-theme.ts` - Plotly theme configuration
- `/frontend/app/components/SignalProcessor.tsx` - Signal processing component
- `/frontend/app/components/SVMClassifier.tsx` - SVM classifier component

---

## Rollback Instructions

If issues arise, revert the following sections in `PlotDisplay.tsx`:

1. Remove `hovertemplate` from all trace objects
2. Revert `hoverlabel` configuration to basic settings
3. Remove `hovermode: 'closest'`
4. Restore original axis configuration

---

## Questions or Issues?

For any questions about these improvements, please refer to:
- Plotly.js documentation: https://plotly.com/javascript/
- Hover template reference: https://plotly.com/javascript/hover-text-and-formatting/
- Project documentation: `/docs/`

---

**Last Updated:** November 16, 2025  
**Author:** AI Assistant  
**Status:** ✅ Implemented and Tested

