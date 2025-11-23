# Data Visualization Null Handling & TypeScript Fixes

## Summary
Fixed multiple issues preventing the Data Visualization & Cleaning module from working properly and deploying successfully.

## Issues Fixed

### 1. ⚠️ JSON Serialization Error with NaN Values
**Problem**: Backend was returning `NaN` (Not a Number) values which cannot be serialized to JSON.

**Error**:
```
ValueError: Out of range float values are not JSON compliant: nan
```

**Fix**: Updated backend to replace `NaN` with `None` (which becomes `null` in JSON):

#### Changes in `/backend/data_viz.py`:

**Line 108** - Upload endpoint sample data:
```python
# Before
sample_data = df.head(10).to_dict('records')

# After
sample_data = df.head(10).replace({np.nan: None}).to_dict('records')
```

**Lines 93-105** - Upload endpoint statistics:
```python
# Before
stats_summary[col] = {
    "mean": float(df[col].mean()) if not df[col].isnull().all() else None,
    # ...
}

# After
mean_val = df[col].mean()
stats_summary[col] = {
    "mean": None if pd.isna(mean_val) else float(mean_val),
    # ...
}
```

**Line 363** - Correlation endpoint:
```python
# Before
"correlation_matrix": corr_matrix.to_dict(),

# After
corr_matrix_dict = corr_matrix.replace({np.nan: None}).to_dict()
"correlation_matrix": corr_matrix_dict,
```

**Lines 456-457** - Filter interval endpoint:
```python
# Before
"x_values": filtered_df[x_column].tolist(),
"y_values": filtered_df[y_column].tolist(),

# After
x_values = filtered_df[x_column].replace({np.nan: None}).tolist()
y_values = filtered_df[y_column].replace({np.nan: None}).tolist()
```

### 2. ⚠️ TypeScript Type Mismatch - Missing `dtype` Field
**Problem**: The `handle-nulls` endpoint returned `null_summary` without the `dtype` field, but the upload endpoint included it. This caused a TypeScript compilation error when trying to update the `uploadData` state.

**Error**:
```
Type error: Property 'dtype' is missing in type '{ null_count: number; null_percentage: number; }' 
but required in type '{ null_count: number; null_percentage: number; dtype: string; }'.
```

**Fix**:

#### Backend (`/backend/data_viz.py` lines 246-250):
```python
# Before
null_summary[col] = {
    "null_count": null_count,
    "null_percentage": round((null_count / len(df)) * 100, 2) if len(df) > 0 else 0
}

# After
null_summary[col] = {
    "null_count": null_count,
    "null_percentage": round((null_count / len(df)) * 100, 2) if len(df) > 0 else 0,
    "dtype": str(df[col].dtype)  # Added dtype to match upload response
}
```

#### Frontend (`/frontend/lib/api.ts`):
```typescript
// Before
export interface HandleNullsResponse {
  null_summary: {
    [column: string]: {
      null_count: number;
      null_percentage: number;
    };
  };
  // ...
}

// After
export interface HandleNullsResponse {
  null_summary: {
    [column: string]: {
      null_count: number;
      null_percentage: number;
      dtype: string;  // Added dtype field
    };
  };
  // ...
}
```

### 3. ⚠️ Plotly TypeScript Errors
**Problem**: Plotly's TypeScript definitions require `title`, `xaxis.title`, `yaxis.title`, etc. to be objects with a `text` property, not plain strings. Also, `zmid` property doesn't exist in the types.

**Errors**:
```
Type 'string' has no properties in common with type 'Partial<DataTitle>'.
Property 'zmid' does not exist in type 'Partial<Partial<PlotData>>'.
```

**Fix**: Updated all Plotly chart layouts in `/frontend/app/components/DataVisualization.tsx`:

**Scatter Plot (line 588)**:
```typescript
// Before
layout={{
  title: `${scatterData.x_label} vs ${scatterData.y_label}`,
  xaxis: { title: scatterData.x_label },
  yaxis: { title: scatterData.y_label },
}}

// After
layout={{
  title: { text: `${scatterData.x_label} vs ${scatterData.y_label}` },
  xaxis: { title: { text: scatterData.x_label } },
  yaxis: { title: { text: scatterData.y_label } },
}}
```

**Histogram (line 662)**:
```typescript
layout={{
  title: { text: `Distribution of ${histogramData.column}` },
  xaxis: { title: { text: histogramData.column } },
  yaxis: { title: { text: 'Frequency' } },
}}
```

**Correlation Heatmap (lines 801-802)**:
```typescript
// Before
type: 'heatmap',
zmid: 0,  // ❌ This property doesn't exist
zmin: -1,

// After  
type: 'heatmap',
zmin: -1,  // ✅ Removed zmid
```

**Filter Plot (line 915)**:
```typescript
layout={{
  title: { text: `Filtered: ${filterData.x_column} vs ${filterData.y_column}` },
  xaxis: { title: { text: filterData.x_column } },
  yaxis: { title: { text: filterData.y_column } },
}}
```

**3D Surface Plot (lines 1016-1018)**:
```typescript
scene: {
  xaxis: { title: { text: surfaceData.x_label } },
  yaxis: { title: { text: surfaceData.y_label } },
  zaxis: { title: { text: surfaceData.z_label } },
}
```

## Testing

### Backend Tests
```bash
# Test upload with null values
curl -X POST http://localhost:8000/api/data-viz/upload \
  -F "file=@test-data-with-nulls.csv"

# Result: ✅ Success! Returns proper null summary with dtype field

# Test handle nulls
curl -X POST http://localhost:8000/api/data-viz/handle-nulls \
  -F "file_id=dataviz_xxx" \
  -F "column=Age" \
  -F "method=mean"

# Result: ✅ Success! Returns updated null_summary with dtype field
```

### Frontend Tests
```bash
# TypeScript compilation
npx tsc --noEmit

# Result: ✅ Exit code 0 - No errors!
```

## Test File Created
Created `/test-data-with-nulls.csv` with intentional null values:
- Age: 6 nulls (30%)
- Gender: 5 nulls (25%)
- City: 2 nulls (10%)
- Total Spend: 4 nulls (20%)
- Items Purchased: 3 nulls (15%)
- Membership Type: 1 null (5%)
- Satisfaction Level: 2 nulls (10%)
- Days Since Last Purchase: 4 nulls (20%)

## Status
✅ **All issues resolved!**
- Backend properly handles NaN values in JSON responses
- TypeScript compiles without errors
- All Plotly charts use correct type definitions
- Ready for deployment

## Date
November 23, 2025
