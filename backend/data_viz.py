"""
Data Visualization & Cleaning Module
Handles all data visualization, cleaning, and analysis endpoints
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
from scipy.stats import skew, kurtosis
from sklearn.preprocessing import LabelEncoder
from io import StringIO, BytesIO
from pathlib import Path
import hashlib

# Create router
router = APIRouter(prefix="/api/data-viz", tags=["data-viz"])

# Cache directory (shared with main.py)
CACHE_DIR = Path("/tmp/upload_cache")
CACHE_DIR.mkdir(exist_ok=True)

# ============================================================================
# DATA VISUALIZATION & CLEANING ENDPOINTS
# ============================================================================

@router.options("/upload")
async def options_data_viz_upload():
    return {}

@router.post("/upload")
async def upload_data_viz_dataset(file: UploadFile = File(...)):
    """
    Upload CSV/XLSX for data visualization and cleaning.
    Returns columns, null summary, data preview, and basic statistics.
    """
    try:
        print(f"[DATA-VIZ UPLOAD] Received file: {file.filename}")
        
        # Read file content
        contents = await file.read()
        
        # Parse based on extension
        filename_clean = file.filename.lower()
        if filename_clean.endswith('.gz'):
            filename_clean = filename_clean[:-3]
        
        file_ext = filename_clean.split('.')[-1]
        
        if file_ext == 'xlsx':
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        elif file_ext == 'csv':
            # Try to detect delimiter
            content_str = contents.decode('utf-8')
            df = None
            for delimiter in [',', '\t', ';']:
                try:
                    df_test = pd.read_csv(StringIO(content_str), delimiter=delimiter, nrows=2)
                    if df_test.shape[1] > 1:
                        df = pd.read_csv(StringIO(content_str), delimiter=delimiter)
                        break
                except:
                    continue
            if df is None:
                df = pd.read_csv(StringIO(content_str))
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        # Generate file hash for caching
        file_hash = hashlib.sha256(contents).hexdigest()[:16]
        file_id = f"dataviz_{file_hash}_{file.filename}"
        cache_path = CACHE_DIR / file_id
        cache_path.write_bytes(contents)
        
        # Analyze null values
        null_summary = {}
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            total_rows = len(df)
            null_summary[col] = {
                "null_count": null_count,
                "null_percentage": round((null_count / total_rows) * 100, 2) if total_rows > 0 else 0,
                "dtype": str(df[col].dtype)
            }
        
        # Get column types
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_columns = df.select_dtypes(include=['object', 'bool']).columns.tolist()
        
        # Basic statistics for numeric columns
        stats_summary = {}
        for col in numeric_columns:
            if df[col].notna().sum() > 0:
                mean_val = df[col].mean()
                median_val = df[col].median()
                std_val = df[col].std()
                min_val = df[col].min()
                max_val = df[col].max()
                
                stats_summary[col] = {
                    "mean": None if pd.isna(mean_val) else float(mean_val),
                    "median": None if pd.isna(median_val) else float(median_val),
                    "std": None if pd.isna(std_val) else float(std_val),
                    "min": None if pd.isna(min_val) else float(min_val),
                    "max": None if pd.isna(max_val) else float(max_val),
                }
        
        # Sample data - replace NaN with None for JSON serialization
        sample_data = df.head(10).replace({np.nan: None}).to_dict('records')
        
        print(f"[DATA-VIZ UPLOAD] Dataset shape: {df.shape}")
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "rows": df.shape[0],
            "columns": df.columns.tolist(),
            "numeric_columns": numeric_columns,
            "categorical_columns": categorical_columns,
            "null_summary": null_summary,
            "stats_summary": stats_summary,
            "sample_data": sample_data,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[DATA-VIZ UPLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error uploading file: {str(e)}")

@router.options("/scatter-plot")
async def options_scatter_plot():
    return {}

@router.post("/scatter-plot")
async def generate_scatter_plot_data(
    file_id: str = Form(...),
    x_column: str = Form(...),
    y_column: str = Form(...)
):
    """Generate scatter plot data for column vs column visualization."""
    try:
        # Load cached file
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Extract columns (drop nulls for plotting)
        plot_df = df[[x_column, y_column]].dropna()
        
        return {
            "x": plot_df[x_column].tolist(),
            "y": plot_df[y_column].tolist(),
            "x_label": x_column,
            "y_label": y_column,
            "points_count": len(plot_df),
            "status": "success"
        }
        
    except Exception as e:
        print(f"[SCATTER PLOT ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")

@router.options("/handle-nulls")
async def options_handle_nulls():
    return {}

@router.post("/handle-nulls")
async def handle_null_values_endpoint(
    file_id: str = Form(...),
    column: str = Form(...),
    method: str = Form(...)  # 'mean', 'median', 'mode', 'std', 'max', 'min', 'delete_row', 'delete_column'
):
    """Handle null values in a specific column."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        original_rows = len(df)
        original_nulls = int(df[column].isnull().sum())
        
        # Apply null handling strategy
        if method == 'delete_row':
            df = df.dropna(subset=[column])
            message = f"Deleted {original_rows - len(df)} rows with null values in '{column}'"
        elif method == 'delete_column':
            df = df.drop(columns=[column])
            message = f"Deleted column '{column}'"
        elif method == 'mean':
            mean_val = df[column].mean()
            df[column] = df[column].fillna(mean_val)
            message = f"Replaced {original_nulls} null values with mean ({mean_val:.2f})"
        elif method == 'median':
            median_val = df[column].median()
            df[column] = df[column].fillna(median_val)
            message = f"Replaced {original_nulls} null values with median ({median_val:.2f})"
        elif method == 'mode':
            mode_val = df[column].mode()[0] if len(df[column].mode()) > 0 else df[column].mean()
            df[column] = df[column].fillna(mode_val)
            message = f"Replaced {original_nulls} null values with mode ({mode_val})"
        elif method == 'std':
            std_val = df[column].std()
            df[column] = df[column].fillna(std_val)
            message = f"Replaced {original_nulls} null values with std ({std_val:.2f})"
        elif method == 'max':
            max_val = df[column].max()
            df[column] = df[column].fillna(max_val)
            message = f"Replaced {original_nulls} null values with max ({max_val})"
        elif method == 'min':
            min_val = df[column].min()
            df[column] = df[column].fillna(min_val)
            message = f"Replaced {original_nulls} null values with min ({min_val})"
        else:
            raise ValueError(f"Unknown method: {method}")
        
        # Save updated file
        output = BytesIO()
        if filename.lower().endswith('.xlsx'):
            df.to_excel(output, index=False, engine='openpyxl')
        else:
            df.to_csv(output, index=False)
        output.seek(0)
        cache_path.write_bytes(output.read())
        
        # Return updated null summary (with dtype to match upload response)
        null_summary = {}
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            null_summary[col] = {
                "null_count": null_count,
                "null_percentage": round((null_count / len(df)) * 100, 2) if len(df) > 0 else 0,
                "dtype": str(df[col].dtype)
            }
        
        return {
            "message": message,
            "new_row_count": len(df),
            "null_summary": null_summary,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[HANDLE NULLS ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error handling nulls: {str(e)}")

@router.options("/histogram")
async def options_histogram():
    return {}

@router.post("/histogram")
async def generate_histogram_data(
    file_id: str = Form(...),
    column: str = Form(...),
    bins: int = Form(20)
):
    """Generate histogram data for a column."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Get column data (drop nulls)
        data = df[column].dropna()
        
        # Calculate histogram
        hist, bin_edges = np.histogram(data, bins=bins)
        
        # Calculate statistics
        stats = {
            "mean": float(data.mean()),
            "median": float(data.median()),
            "std": float(data.std()),
            "min": float(data.min()),
            "max": float(data.max()),
            "skewness": float(skew(data)),
            "kurtosis": float(kurtosis(data))
        }
        
        return {
            "hist": hist.tolist(),
            "bin_edges": bin_edges.tolist(),
            "stats": stats,
            "column": column,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[HISTOGRAM ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating histogram: {str(e)}")

@router.options("/correlation")
async def options_correlation():
    return {}

@router.post("/correlation")
async def calculate_correlation_matrix(
    file_id: str = Form(...),
    threshold: float = Form(0.8)
):
    """Calculate correlation matrix for numeric columns."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Get numeric columns only
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            raise ValueError("No numeric columns found for correlation analysis")
        
        # Calculate correlation matrix
        corr_matrix = numeric_df.corr()
        
        # Find highly correlated pairs
        highly_correlated = []
        columns = corr_matrix.columns
        for i in range(len(columns)):
            for j in range(i+1, len(columns)):
                corr_val = corr_matrix.iloc[i, j]
                if not pd.isna(corr_val) and abs(corr_val) >= threshold:
                    highly_correlated.append({
                        "column1": columns[i],
                        "column2": columns[j],
                        "correlation": float(corr_val)
                    })
        
        # Replace NaN with None in correlation matrix for JSON serialization
        corr_matrix_dict = corr_matrix.replace({np.nan: None}).to_dict()
        
        return {
            "correlation_matrix": corr_matrix_dict,
            "columns": columns.tolist(),
            "highly_correlated": highly_correlated,
            "threshold": threshold,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[CORRELATION ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating correlation: {str(e)}")

@router.options("/remove-correlated")
async def options_remove_correlated():
    return {}

@router.post("/remove-correlated")
async def remove_correlated_features_endpoint(
    file_id: str = Form(...),
    columns_to_remove: str = Form(...)  # Comma-separated column names
):
    """Remove specified columns from the dataset."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Remove columns
        cols_to_remove = [col.strip() for col in columns_to_remove.split(',') if col.strip()]
        df = df.drop(columns=cols_to_remove, errors='ignore')
        
        # Save updated file
        output = BytesIO()
        if filename.lower().endswith('.xlsx'):
            df.to_excel(output, index=False, engine='openpyxl')
        else:
            df.to_csv(output, index=False)
        output.seek(0)
        cache_path.write_bytes(output.read())
        
        return {
            "message": f"Removed {len(cols_to_remove)} column(s)",
            "removed_columns": cols_to_remove,
            "remaining_columns": df.columns.tolist(),
            "status": "success"
        }
        
    except Exception as e:
        print(f"[REMOVE CORRELATED ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing columns: {str(e)}")

@router.options("/filter-interval")
async def options_filter_interval():
    return {}

@router.post("/filter-interval")
async def filter_by_interval_endpoint(
    file_id: str = Form(...),
    x_column: str = Form(...),
    y_column: str = Form(...),
    x_min: float = Form(...),
    x_max: float = Form(...)
):
    """Filter data by X interval and return corresponding Y values."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Filter by X interval
        filtered_df = df[(df[x_column] >= x_min) & (df[x_column] <= x_max)]
        
        # Replace NaN with None for JSON serialization
        x_values = filtered_df[x_column].replace({np.nan: None}).tolist()
        y_values = filtered_df[y_column].replace({np.nan: None}).tolist()
        
        return {
            "x_values": x_values,
            "y_values": y_values,
            "filtered_count": len(filtered_df),
            "x_column": x_column,
            "y_column": y_column,
            "x_range": [x_min, x_max],
            "status": "success"
        }
        
    except Exception as e:
        print(f"[FILTER INTERVAL ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error filtering data: {str(e)}")

@router.options("/surface-plot")
async def options_surface_plot():
    return {}

@router.post("/surface-plot")
async def generate_surface_plot_data(
    file_id: str = Form(...),
    x_column: str = Form(...),
    y_column: str = Form(...),
    z_column: str = Form(...)
):
    """Generate 3D surface plot data."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Drop nulls
        plot_df = df[[x_column, y_column, z_column]].dropna()
        
        return {
            "x": plot_df[x_column].tolist(),
            "y": plot_df[y_column].tolist(),
            "z": plot_df[z_column].tolist(),
            "x_label": x_column,
            "y_label": y_column,
            "z_label": z_column,
            "points_count": len(plot_df),
            "status": "success"
        }
        
    except Exception as e:
        print(f"[SURFACE PLOT ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating surface plot: {str(e)}")

@router.options("/encode-categorical")
async def options_encode_categorical():
    return {}

@router.post("/encode-categorical")
async def encode_categorical_column(
    file_id: str = Form(...),
    column: str = Form(...),
    method: str = Form(...)  # 'label', 'onehot', 'frequency'
):
    """Convert categorical text column to numerical."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Parse file
        if filename.lower().endswith('.xlsx'):
            df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        original_column = f"{column}_original"
        mapping = {}
        
        if method == 'label':
            # Label encoding
            le = LabelEncoder()
            df[original_column] = df[column]
            df[column] = le.fit_transform(df[column].astype(str))
            mapping = {str(label): int(idx) for idx, label in enumerate(le.classes_)}
            message = f"Label encoded '{column}': {len(mapping)} unique values"
            
        elif method == 'onehot':
            # One-hot encoding
            df[original_column] = df[column]
            one_hot = pd.get_dummies(df[column], prefix=column)
            df = df.drop(columns=[column])
            df = pd.concat([df, one_hot], axis=1)
            mapping = {col: 1 for col in one_hot.columns}
            message = f"One-hot encoded '{column}': created {len(one_hot.columns)} new columns"
            
        elif method == 'frequency':
            # Frequency encoding
            freq_map = df[column].value_counts().to_dict()
            df[original_column] = df[column]
            df[column] = df[column].map(freq_map)
            mapping = {str(k): int(v) for k, v in freq_map.items()}
            message = f"Frequency encoded '{column}'"
        else:
            raise ValueError(f"Unknown encoding method: {method}")
        
        # Save updated file
        output = BytesIO()
        if filename.lower().endswith('.xlsx'):
            df.to_excel(output, index=False, engine='openpyxl')
        else:
            df.to_csv(output, index=False)
        output.seek(0)
        cache_path.write_bytes(output.read())
        
        return {
            "message": message,
            "mapping": mapping,
            "new_columns": df.columns.tolist(),
            "status": "success"
        }
        
    except Exception as e:
        print(f"[ENCODE CATEGORICAL ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error encoding column: {str(e)}")

@router.options("/download-cleaned")
async def options_download_cleaned():
    return {}

@router.post("/download-cleaned")
async def download_cleaned_dataset(file_id: str = Form(...)):
    """Download the cleaned dataset."""
    try:
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        contents = cache_path.read_bytes()
        filename = file_id.split('_', 2)[2] if '_' in file_id else file_id
        
        # Determine media type
        if filename.lower().endswith('.xlsx'):
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:
            media_type = "text/csv"
        
        output = BytesIO(contents)
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename=cleaned_{filename}"}
        )
        
    except Exception as e:
        print(f"[DOWNLOAD CLEANED ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")
