from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
import pandas as pd
import numpy as np
import pywt
from scipy.signal import spectrogram
from scipy.stats import skew, kurtosis, entropy
from sklearn.metrics import mean_squared_error
from io import StringIO, BytesIO
import base64
from typing import Dict, List, Optional
import json
import math
from functools import lru_cache
import time
import hashlib
import os
from pathlib import Path
import gzip
import openpyxl
import zipfile

# SVM Classification imports
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.svm import SVC, LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, GridSearchCV, RandomizedSearchCV
from sklearn.metrics import (
    roc_auc_score, roc_curve, accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix
)
from sklearn.preprocessing import label_binarize
import pickle
import uuid

# File cache directory
CACHE_DIR = Path("/tmp/upload_cache")
CACHE_DIR.mkdir(exist_ok=True)

# SVM model storage directory
MODEL_DIR = Path("/tmp/svm_models")
MODEL_DIR.mkdir(exist_ok=True)

def parse_file_content(contents: bytes, filename: str) -> pd.DataFrame:
    """
    Parse file content based on file extension.
    Supports: .txt, .lvm (tab-delimited), .csv (comma-delimited), .xlsx (Excel)
    Handles gzip-compressed files (strips .gz extension)
    """
    # Remove .gz extension if present (file content is already decompressed)
    filename_clean = filename.lower()
    if filename_clean.endswith('.gz'):
        filename_clean = filename_clean[:-3]  # Remove '.gz'

    file_ext = filename_clean.split('.')[-1]

    try:
        if file_ext in ['txt', 'lvm']:
            # Tab-delimited files
            df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        elif file_ext == 'csv':
            # CSV files - try to auto-detect delimiter
            content_str = contents.decode('utf-8')
            # Try comma first, then tab, then semicolon
            for delimiter in [',', '\t', ';']:
                try:
                    df = pd.read_csv(StringIO(content_str), delimiter=delimiter, header=None)
                    # Check if we got more than 1 column
                    if df.shape[1] > 1:
                        break
                except:
                    continue
            else:
                # If all fail, default to comma
                df = pd.read_csv(StringIO(content_str), delimiter=',', header=None)
        elif file_ext == 'xlsx':
            # Excel files
            df = pd.read_excel(BytesIO(contents), header=None, engine='openpyxl')
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Remove any completely empty rows/columns
        df = df.dropna(how='all', axis=0).dropna(how='all', axis=1)

        return df
    except Exception as e:
        raise ValueError(f"Error parsing {file_ext} file: {str(e)}")

def json_encoder(obj):
    """Custom JSON encoder to handle inf and nan"""
    if isinstance(obj, float):
        if math.isnan(obj):
            return None
        elif math.isinf(obj):
            return None
    return obj

# Monkey patch JSON encoder
json._default_encoder = json.JSONEncoder(default=json_encoder)

# ============================================================================
# LTTB Downsampling Algorithm (Largest-Triangle-Three-Buckets)
# ============================================================================
def lttb_downsample(x_data, y_data, target_points=15000):
    """
    Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
    Intelligently reduces data points while preserving visual features.
    
    Reference: https://github.com/sveinn-steinarsson/flot-downsample
    
    Args:
        x_data: X-axis data (e.g., time)
        y_data: Y-axis data (e.g., amplitude)
        target_points: Target number of points (default: 15000 for optimal Plotly performance)
    
    Returns:
        downsampled_x, downsampled_y: Downsampled arrays
    """
    data_length = len(x_data)
    
    # If already below target, return as-is
    if data_length <= target_points:
        return x_data, y_data
    
    # Convert to numpy arrays for efficiency
    x_data = np.asarray(x_data)
    y_data = np.asarray(y_data)
    
    # Always keep first and last points
    sampled_x = [x_data[0]]
    sampled_y = [y_data[0]]
    
    # Calculate bucket size
    bucket_size = (data_length - 2) / (target_points - 2)
    
    a = 0  # Initially a is the first point in the triangle
    
    for i in range(target_points - 2):
        # Calculate point average for next bucket (for triangle apex)
        avg_x = 0.0
        avg_y = 0.0
        avg_range_start = int(np.floor((i + 1) * bucket_size) + 1)
        avg_range_end = int(np.floor((i + 2) * bucket_size) + 1)
        avg_range_end = min(avg_range_end, data_length)
        
        avg_range_length = avg_range_end - avg_range_start
        
        for j in range(avg_range_start, avg_range_end):
            avg_x += x_data[j]
            avg_y += y_data[j]
        
        if avg_range_length > 0:
            avg_x /= avg_range_length
            avg_y /= avg_range_length
        
        # Get the range for this bucket
        range_offs = int(np.floor((i + 0) * bucket_size) + 1)
        range_to = int(np.floor((i + 1) * bucket_size) + 1)
        
        # Point a (previous selected point)
        point_a_x = x_data[a]
        point_a_y = y_data[a]
        
        max_area = -1.0
        next_a = range_offs
        
        for j in range(range_offs, range_to):
            # Calculate triangle area over three buckets
            area = abs(
                (point_a_x - avg_x) * (y_data[j] - point_a_y) -
                (point_a_x - x_data[j]) * (avg_y - point_a_y)
            ) * 0.5
            
            if area > max_area:
                max_area = area
                next_a = j
        
        sampled_x.append(x_data[next_a])
        sampled_y.append(y_data[next_a])
        a = next_a  # This point is the next a (chosen point)
    
    # Always add the last point
    sampled_x.append(x_data[-1])
    sampled_y.append(y_data[-1])
    
    return np.array(sampled_x), np.array(sampled_y)

app = FastAPI(title="Feature Extraction API", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://sibilytics-ai.in",
        "https://www.sibilytics-ai.in",
        "https://app.sibilytics-ai.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_float(value):
    """Convert value to float, handling inf and nan"""
    try:
        fval = float(value)
        if not np.isfinite(fval):  # Checks for both inf and nan
            return 0.0
        return fval
    except (ValueError, TypeError):
        return 0.0

def calculate_statistical_data(reconstructed_signal, noise, original_signal):
    """Calculate statistical parameters from signal - CORRECTED PSNR calculation"""
    params = {}

    try:
        params["Mean"] = safe_float(np.mean(reconstructed_signal))
        params["Median"] = safe_float(np.median(reconstructed_signal))
        mode_val = pd.Series(reconstructed_signal).mode()
        params["Mode"] = safe_float(mode_val[0] if len(mode_val) > 0 else np.mean(reconstructed_signal))
        params["Std Dev"] = safe_float(np.std(reconstructed_signal))
        params["Variance"] = safe_float(np.var(reconstructed_signal))
        params["Mean Square"] = safe_float(np.mean(reconstructed_signal**2))
        params["RMS"] = safe_float(np.sqrt(np.mean(reconstructed_signal**2)))
        params["Max"] = safe_float(np.max(reconstructed_signal))
        params["Peak-to-Peak"] = safe_float(np.ptp(reconstructed_signal))

        # Peak-to-RMS
        rms_val = np.sqrt(np.mean(reconstructed_signal**2))
        params["Peak-to-RMS"] = safe_float(np.max(reconstructed_signal) / rms_val) if rms_val != 0 else 0.0

        params["Skewness"] = safe_float(skew(reconstructed_signal))
        params["Kurtosis"] = safe_float(kurtosis(reconstructed_signal))
        params["Energy"] = safe_float(np.trapz(reconstructed_signal**2, np.arange(len(reconstructed_signal))))
        params["Power"] = safe_float(np.trapz(reconstructed_signal**2, np.arange(len(reconstructed_signal))) / (2 * (1 / 20000)))

        # Crest Factor
        params["Crest Factor"] = safe_float(np.max(reconstructed_signal) / rms_val) if rms_val != 0 else 0.0

        # Impulse Factor
        mean_val = np.mean(reconstructed_signal)
        params["Impulse Factor"] = safe_float(np.max(reconstructed_signal) / mean_val) if mean_val != 0 else 0.0

        # Shape Factor
        params["Shape Factor"] = safe_float(rms_val / mean_val) if mean_val != 0 else 0.0

        params["Shannon Entropy"] = safe_float(entropy(np.abs(reconstructed_signal)))

        # Signal-to-Noise Ratio
        noise_sum_sq = np.sum(noise**2)
        if noise_sum_sq != 0:
            params["Signal-to-Noise Ratio"] = safe_float(10 * np.log10(np.sum(reconstructed_signal**2) / noise_sum_sq))
        else:
            params["Signal-to-Noise Ratio"] = 0.0

        # Root Mean Square Error (comparing original vs reconstructed)
        params["Root Mean Square Error"] = safe_float(np.sqrt(mean_squared_error(original_signal, reconstructed_signal)))

        # Maximum Error (comparing original vs reconstructed)
        params["Maximum Error"] = safe_float(np.max(np.abs(original_signal - reconstructed_signal)))

        # Mean Absolute Error (comparing original vs reconstructed)
        params["Mean Absolute Error"] = safe_float(np.mean(np.abs(original_signal - reconstructed_signal)))

        # Peak Signal-to-Noise Ratio (CORRECTED: uses original signal max)
        max_signal = np.max(np.abs(original_signal))
        rms_error = params["Root Mean Square Error"]
        if rms_error > 0 and max_signal > 0:
            params["Peak Signal-to-Noise Ratio"] = safe_float(20 * np.log10(max_signal / rms_error))
        else:
            params["Peak Signal-to-Noise Ratio"] = 0.0

        # Coefficient of Variation
        std_val = np.std(reconstructed_signal)
        params["Coefficient of Variation"] = safe_float(std_val / mean_val) if mean_val != 0 else 0.0
        
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        # Return safe defaults if anything fails
        for key in ["Mean", "Median", "Mode", "Std Dev", "Variance", "Mean Square", "RMS", "Max", 
                   "Peak-to-Peak", "Peak-to-RMS", "Skewness", "Kurtosis", "Energy", "Power",
                   "Crest Factor", "Impulse Factor", "Shape Factor", "Shannon Entropy",
                   "Signal-to-Noise Ratio", "Root Mean Square Error", "Maximum Error",
                   "Mean Absolute Error", "Peak Signal-to-Noise Ratio", "Coefficient of Variation"]:
            if key not in params:
                params[key] = 0.0
    
    return params

@app.get("/")
async def root():
    return {"message": "Feature Extraction API", "status": "healthy"}

@app.options("/api/upload-with-progress")
async def options_upload_with_progress():
    return {}

@app.options("/api/process")
async def options_process():
    return {}

@app.options("/api/process-raw")
async def options_process_raw():
    return {}

@app.options("/api/plot/all")
async def options_plot_all():
    return {}

@app.options("/api/plots/batch")
async def options_plots_batch():
    return {}

@app.options("/api/download-all-stats")
async def options_download_all_stats():
    return {}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse signal file"""
    try:
        # Read file content
        contents = await file.read()
        
        # Parse as CSV with tab delimiter
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        # Return column count for frontend to create selectors
        return {
            "filename": file.filename,
            "columns": df.shape[1],
            "rows": df.shape[0],
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.post("/api/upload-with-progress")
async def upload_file_with_progress(file: UploadFile = File(...)):
    """
    Upload and parse signal file with progress tracking support.
    Supports gzip-compressed uploads for faster transfer.
    Caches file to avoid re-uploading for subsequent operations.
    Returns file_id for reuse in /process and /plot endpoints.
    """
    try:
        start_time = time.time()
        print(f"[UPLOAD] Starting upload: {file.filename}")

        # Stream file content in chunks to avoid memory issues
        chunks = []
        chunk_size = 1024 * 1024  # 1MB chunks
        total_bytes = 0

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            chunks.append(chunk)
            total_bytes += len(chunk)

        compressed_data = b''.join(chunks)
        upload_time = time.time() - start_time
        print(f"[UPLOAD] Received {total_bytes / (1024*1024):.2f} MB in {upload_time:.2f}s")

        # Detect and decompress gzip if needed
        decompress_start = time.time()
        is_compressed = False
        compression_method = "none"

        # Check for gzip magic bytes (0x1f 0x8b) - Works with CompressionStream('gzip')
        if len(compressed_data) > 2 and compressed_data[0] == 0x1f and compressed_data[1] == 0x8b:
            is_compressed = True
            compression_method = "gzip"
            print(f"[UPLOAD] ✓ Detected gzip compression (native CompressionStream compatible)")

            try:
                contents = gzip.decompress(compressed_data)
                decompress_time = time.time() - decompress_start
                original_size = len(contents) / (1024*1024)
                compressed_size = total_bytes / (1024*1024)
                compression_ratio = len(contents) / total_bytes

                print(f"[UPLOAD] ✓ Decompressed {compressed_size:.2f} MB → {original_size:.2f} MB in {decompress_time:.2f}s")
                print(f"[UPLOAD] ✓ Compression ratio: {compression_ratio:.2f}x ({(1 - 1/compression_ratio)*100:.1f}% reduction)")
                print(f"[UPLOAD] ✓ Bandwidth saved: {(original_size - compressed_size):.2f} MB")

            except Exception as decompress_error:
                print(f"[UPLOAD] ⚠️  Decompression failed: {str(decompress_error)}")
                print(f"[UPLOAD] ⚠️  Falling back to raw data")
                contents = compressed_data
                is_compressed = False
                compression_method = "failed"
        else:
            contents = compressed_data
            print(f"[UPLOAD] No compression detected, using raw data ({total_bytes / (1024*1024):.2f} MB)")

        # Generate file ID based on content hash
        file_hash = hashlib.sha256(contents).hexdigest()[:16]
        file_id = f"{file_hash}_{file.filename}"
        cache_path = CACHE_DIR / file_id

        # Save to cache
        cache_path.write_bytes(contents)
        print(f"[UPLOAD] Cached file as: {file_id}")

        # Parse file based on extension
        parse_start = time.time()
        df = parse_file_content(contents, file.filename)
        print(f"[UPLOAD] Parsed {file.filename} in {time.time() - parse_start:.2f}s")

        # Prepare response with compression stats
        response_data = {
            "filename": file.filename,
            "file_id": file_id,
            "columns": df.shape[1],
            "rows": df.shape[0],
            "status": "success",
            "message": "File uploaded and cached successfully",
            "upload_time": f"{time.time() - start_time:.2f}s",
            "compressed": is_compressed,
            "compression_method": compression_method
        }

        if is_compressed and compression_method == "gzip":
            # Include compression statistics
            original_size_mb = len(contents) / (1024*1024)
            compressed_size_mb = total_bytes / (1024*1024)
            ratio = len(contents) / total_bytes
            bandwidth_saved_mb = original_size_mb - compressed_size_mb

            response_data.update({
                "compressed_size_mb": f"{compressed_size_mb:.2f}",
                "original_size_mb": f"{original_size_mb:.2f}",
                "compression_ratio": f"{ratio:.2f}x",
                "size_reduction_percent": f"{(1 - 1/ratio)*100:.1f}%",
                "bandwidth_saved_mb": f"{bandwidth_saved_mb:.2f}",
                "decompress_time": f"{decompress_time:.2f}s"
            })
        else:
            response_data["file_size_mb"] = f"{total_bytes / (1024*1024):.2f}"

        return response_data
    except Exception as e:
        print(f"[UPLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.post("/api/process")
async def process_signal(
    file: UploadFile = File(None),
    file_id: Optional[str] = Form(None),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...)
):
    """Process signal with wavelet decomposition. Supports cached files via file_id."""
    start_time = time.time()
    try:
        # Use cached file if file_id provided, otherwise read uploaded file
        filename = None
        if file_id:
            cache_path = CACHE_DIR / file_id
            if not cache_path.exists():
                raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")
            contents = cache_path.read_bytes()
            filename = file_id.split('_', 1)[1] if '_' in file_id else file_id
            print(f"[PROCESS] Using cached file: {file_id}")
        elif file:
            contents = await file.read()
            filename = file.filename
            print(f"[PROCESS] Processing uploaded file: {file.filename}")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'file_id' must be provided")

        df = parse_file_content(contents, filename)

        # Extract time and signal columns
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        print(f"Processing signal of length: {len(Signal)}")
        t1 = time.time()

        # Wavelet decomposition and denoising (EXACT Streamlit logic)
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
        denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
        denoised_signal = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]

        print(f"Wavelet processing took: {time.time() - t1:.2f}s")
        t1 = time.time()

        noise = Signal - denoised_signal

        # Calculate statistics (passing original Signal for PSNR calculation)
        stats = calculate_statistical_data(denoised_signal, noise, Signal)
        print(f"Statistics calculation took: {time.time() - t1:.2f}s")

        # Limit data size for response (downsample if too large)
        # Note: Plotly.js performs well with 10k-15k points. Higher values may cause browser issues.
        max_points = 15000
        if len(time_data) > max_points:
            step = len(time_data) // max_points
            time_subset = time_data[::step].tolist()
            raw_subset = Signal[::step].tolist()
            denoised_subset = denoised_signal[::step].tolist()
        else:
            time_subset = time_data.tolist()
            raw_subset = Signal.tolist()
            denoised_subset = denoised_signal.tolist()

        # Limit wavelet coefficients size
        approx_limit = min(len(coeffs[0]), 1000)
        detail_limit = min(max(len(c) for c in coeffs[1:]), 1000)

        # Extract filename from file or file_id
        filename = file.filename if file else file_id.split('_', 1)[1] if file_id else "unknown"

        # Prepare response data
        result = {
            "time": time_subset,
            "raw_signal": raw_subset,
            "denoised_signal": denoised_subset,
            "wavelet_coeffs": {
                "approximation": coeffs[0][:approx_limit].tolist() if len(coeffs[0]) > approx_limit else coeffs[0].tolist(),
                "detail": [(coeff[:detail_limit] if len(coeff) > detail_limit else coeff).tolist() for coeff in coeffs[1:]]
            },
            "statistics": stats,
            "filename": filename
        }

        print(f"Total processing time: {time.time() - start_time:.2f}s")
        return result

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/api/process-raw")
async def process_signal_raw(
    file: UploadFile = File(None),
    file_id: Optional[str] = Form(None),
    time_column: int = Form(...),
    signal_column: int = Form(...)
):
    """Process raw signal statistics without denoising. Supports cached files via file_id."""
    start_time = time.time()
    try:
        # Use cached file if file_id provided, otherwise read uploaded file
        filename = None
        if file_id:
            cache_path = CACHE_DIR / file_id
            if not cache_path.exists():
                raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")
            contents = cache_path.read_bytes()
            filename = file_id.split('_', 1)[1] if '_' in file_id else file_id
            print(f"[PROCESS-RAW] Using cached file: {file_id}")
        elif file:
            contents = await file.read()
            filename = file.filename
            print(f"[PROCESS-RAW] Processing uploaded file: {file.filename}")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'file_id' must be provided")

        df = parse_file_content(contents, filename)

        # Extract time and signal columns
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        print(f"Processing raw signal of length: {len(Signal)}")
        t1 = time.time()

        # Calculate noise as zero (no denoising applied)
        noise = np.zeros_like(Signal)

        # Calculate statistics on RAW signal (Signal is both original and reconstructed)
        stats = calculate_statistical_data(Signal, noise, Signal)
        print(f"Statistics calculation took: {time.time() - t1:.2f}s")

        # Extract filename from file or file_id
        filename = file.filename if file else file_id.split('_', 1)[1] if file_id else "unknown"

        # Prepare response data
        result = {
            "statistics": stats,
            "filename": filename
        }

        print(f"Total processing time: {time.time() - start_time:.2f}s")
        return result

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/api/download-stats")
async def download_stats(stats: Dict):
    """Download statistics as CSV - single file"""
    try:
        stats_df = pd.DataFrame([stats])

        # Convert to CSV
        output = BytesIO()
        stats_df.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=statistics.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.post("/api/download-all-stats")
async def download_all_stats(all_stats: List[Dict]):
    """
    Download consolidated statistics from multiple files as CSV.
    Similar to Streamlit's 'Download All Files Stats' functionality.

    Expects a list of dictionaries with structure:
    [
        {"filename": "file1.lvm", "Mean": 0.5, "Std Dev": 0.1, ...},
        {"filename": "file2.lvm", "Mean": 0.6, "Std Dev": 0.2, ...},
        ...
    ]
    """
    try:
        if not all_stats or len(all_stats) == 0:
            raise HTTPException(status_code=400, detail="No statistics provided")

        # Convert list of stats to DataFrame
        # Use filename as index if available, similar to Streamlit version
        stats_df = pd.DataFrame(all_stats)

        # If 'filename' column exists, set it as index
        if 'filename' in stats_df.columns:
            stats_df = stats_df.set_index('filename')

        # Convert to CSV with index
        output = BytesIO()
        stats_df.to_csv(output, index=True)
        output.seek(0)

        print(f"[DOWNLOAD] Generated consolidated CSV for {len(all_stats)} files")

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=all_files_stats.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DOWNLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.post("/api/plot/signal")
async def generate_signal_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    signal_type: str = Form(...)  # 'raw' or 'denoised'
):
    """
    Generate signal plot data with LTTB downsampling for efficient transfer.
    Returns raw data for client-side rendering instead of Plotly JSON.
    """
    try:
        start_time = time.time()
        
        # Read and parse file
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        # Extract time and signal columns
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values
        
        print(f"[SIGNAL PLOT] Processing {len(Signal):,} points ({signal_type})")
        
        # If denoised, perform wavelet processing
        if signal_type == 'denoised':
            coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
            threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
            denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
            signal_data = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]
            name = 'Denoised Signal'
            color = '#ff7f0e'
        else:
            signal_data = Signal
            name = 'Raw Signal'
            color = '#1f77b4'
        
        # Apply LTTB downsampling (830k → 15k points)
        downsampled_x, downsampled_y = lttb_downsample(time_data, signal_data, target_points=15000)
        
        print(f"[SIGNAL PLOT] Downsampled: {len(Signal):,} → {len(downsampled_x):,} points")
        print(f"[SIGNAL PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        # Return raw data for client-side rendering
        return {
            "type": "scatter",
            "data": {
                "x": downsampled_x.tolist(),
                "y": downsampled_y.tolist(),
                "name": name,
                "color": color
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Amplitude (V)",
                "title": name
            },
            "metadata": {
                "original_points": len(Signal),
                "downsampled_points": len(downsampled_x),
                "compression_ratio": f"{len(Signal) / len(downsampled_x):.1f}x",
                "processing_time": f"{time.time() - start_time:.3f}s"
            }
        }
        
    except Exception as e:
        print(f"Plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Plot generation error: {str(e)}")

@app.post("/api/plot/fft")
async def generate_fft_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    fft_type: str = Form(...)  # 'raw', 'denoised', 'approx', 'detail'
):
    """
    Generate FFT plot data with LTTB downsampling.
    Returns raw data for client-side rendering.
    """
    try:
        start_time = time.time()
        
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        print(f"[FFT PLOT] Processing {len(Signal):,} points ({fft_type})")

        # Calculate sampling frequency (matching Streamlit)
        tf = time_data[2] - time_data[1]
        fs = 1 / tf

        # Wavelet processing
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
        denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
        denoised_signal = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]

        traces = []

        if fft_type == 'raw':
            # FFT with zero-padding and normalization (matching Streamlit)
            NFFT = 2 ** int(np.ceil(np.log2(len(Signal))))
            fft_data = np.abs(np.fft.fft(Signal, NFFT)) / len(Signal)
            fft_freqs = fs * np.arange(0, NFFT // 2 + 1) / NFFT
            fft_data = fft_data[:len(fft_freqs)]
            x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "FFT of Raw Signal",
                "color": "#1f77b4"
            })
        elif fft_type == 'denoised':
            # FFT without normalization for denoised (matching Streamlit)
            fft_data = np.abs(np.fft.fft(denoised_signal))[:len(Signal) // 2]
            fft_freqs = fs * np.arange(0, len(fft_data)) / len(Signal)
            x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "FFT of Denoised Signal",
                "color": "#ff7f0e"
            })
        elif fft_type == 'approx':
            # FFT of approximation coefficients (matching Streamlit)
            fft_data = np.abs(np.fft.fft(coeffs[0]))[:len(coeffs[0]) // 2]
            fft_freqs = np.linspace(100, fs / 2, len(fft_data))
            x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "FFT of Approx Coefficients",
                "color": "#2ca02c"
            })
        else:  # detail
            # FFT of detail coefficients (matching Streamlit)
            for i, coeff in enumerate(coeffs[1:]):
                fft_data = np.abs(np.fft.fft(coeff))[:len(coeff) // 2]
                fft_freqs = np.linspace(100, fs / 2, len(fft_data))
                x_down, y_down = lttb_downsample(fft_freqs, fft_data, target_points=5000)  # Less per trace
                traces.append({
                    "x": x_down.tolist(),
                    "y": y_down.tolist(),
                    "name": f"FFT of Detail Coefficients {i + 1}",
                    "color": None  # Let client choose
                })
        
        print(f"[FFT PLOT] Generated {len(traces)} trace(s)")
        print(f"[FFT PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        return {
            "type": "scatter",
            "data": {
                "traces": traces
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": f"FFT Analysis ({fft_type})"
            },
            "metadata": {
                "processing_time": f"{time.time() - start_time:.3f}s",
                "num_traces": len(traces)
            }
        }
        
    except Exception as e:
        print(f"FFT plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"FFT plot error: {str(e)}")

@app.post("/api/plot/wavelet")
async def generate_wavelet_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    wavelet_option: str = Form(...)  # 'approx', 'detail', 'pearson_approx', 'pearson_detail'
):
    """
    Generate wavelet plot data with downsampling.
    Returns raw data for client-side rendering.
    """
    try:
        start_time = time.time()
        
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        Signal = df.iloc[:, signal_column].values
        
        print(f"[WAVELET PLOT] Processing {len(Signal):,} points ({wavelet_option})")
        
        # Wavelet decomposition
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        
        plot_type = "scatter"
        traces = []
        x_title = "Index"
        y_title = "Coefficient Value (V)"
        
        if wavelet_option == 'approx':
            x_data = np.arange(len(coeffs[0]))
            x_down, y_down = lttb_downsample(x_data, coeffs[0], target_points=15000)
            traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "Approximation Coefficients",
                "color": "#2ca02c"
            })
        elif wavelet_option == 'detail':
            for i, coeff in enumerate(coeffs[1:]):
                x_data = np.arange(len(coeff))
                x_down, y_down = lttb_downsample(x_data, coeff, target_points=5000)  # Less per trace
                traces.append({
                    "x": x_down.tolist(),
                    "y": y_down.tolist(),
                    "name": f"Detail Coefficients {i + 1}",
                    "color": None
                })
        elif wavelet_option == 'pearson_approx':
            plot_type = "bar"
            x_title = "Coefficient Type"
            y_title = "Correlation Coefficient"
            correlation = np.corrcoef(Signal[:len(coeffs[0])], coeffs[0])[0, 1]
            traces.append({
                "x": ["Approx Coefficients"],
                "y": [float(correlation)],
                "name": "Pearson CC",
                "color": "#9467bd"
            })
        else:  # pearson_detail
            plot_type = "bar"
            x_title = "Coefficient Type"
            y_title = "Correlation Coefficient"
            correlations = [np.corrcoef(Signal[:len(coeff)], coeff)[0, 1] for coeff in coeffs[1:]]
            traces.append({
                "x": [f"Detail {i + 1}" for i in range(len(correlations))],
                "y": [float(c) for c in correlations],
                "name": "Pearson CC",
                "color": "#9467bd"
            })
        
        print(f"[WAVELET PLOT] Generated {len(traces)} trace(s)")
        print(f"[WAVELET PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        return {
            "type": plot_type,
            "data": {
                "traces": traces
            },
            "layout": {
                "xaxis_title": x_title,
                "yaxis_title": y_title,
                "title": f"Wavelet Analysis ({wavelet_option})"
            },
            "metadata": {
                "processing_time": f"{time.time() - start_time:.3f}s",
                "num_traces": len(traces)
            }
        }
        
    except Exception as e:
        print(f"Wavelet plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Wavelet plot error: {str(e)}")

@app.post("/api/plot/spectrum")
async def generate_spectrum_plot(
    file: UploadFile = File(...),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...),
    spectrum_type: str = Form(...)  # 'raw' or 'denoised'
):
    """
    Generate time-frequency spectrum (spectrogram) plot data.
    Returns raw heatmap data for client-side rendering.
    """
    try:
        start_time = time.time()
        
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t', header=None)
        
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values

        # Calculate sampling frequency
        tf = time_data[2] - time_data[1]
        fs = 1 / tf
        
        print(f"[SPECTRUM PLOT] Processing {len(Signal):,} points ({spectrum_type})")
        
        if spectrum_type == 'denoised':
            coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
            threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
            denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
            signal_data = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]
            colorscale = 'Plasma'
        else:
            signal_data = Signal
            colorscale = 'Viridis'
        
        # Calculate spectrogram
        f, t, Sxx = spectrogram(signal_data, fs)
        
        # Convert to dB scale
        z_data = 10 * np.log10(Sxx + 1e-10)  # Add small value to avoid log(0)
        
        print(f"[SPECTRUM PLOT] Spectrogram shape: {z_data.shape}")
        print(f"[SPECTRUM PLOT] Processing time: {time.time() - start_time:.3f}s")
        
        # Return raw heatmap data
        return {
            "type": "heatmap",
            "data": {
                "x": t.tolist(),  # Time axis
                "y": f.tolist(),  # Frequency axis
                "z": z_data.tolist(),  # 2D array of intensity values
                "colorscale": colorscale
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Frequency (Hz)",
                "title": f"Spectrogram ({spectrum_type})"
            },
            "metadata": {
                "processing_time": f"{time.time() - start_time:.3f}s",
                "shape": z_data.shape,
                "data_points": z_data.size
            }
        }
        
    except Exception as e:
        print(f"Spectrum plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Spectrum plot error: {str(e)}")

@app.post("/api/plots/batch")
@app.post("/api/plot/all")  # Alias for frontend compatibility
async def generate_all_plots(
    file: UploadFile = File(None),
    file_id: Optional[str] = Form(None),
    time_column: int = Form(...),
    signal_column: int = Form(...),
    wavelet_type: str = Form(...),
    n_levels: int = Form(...)
):
    """
    Generate all plots at once for maximum efficiency.
    Supports cached files via file_id to avoid re-uploading.
    Processes signal once and generates all plot data with LTTB downsampling.
    Returns all plots in a single response for optimal network transfer.
    """
    try:
        batch_start = time.time()

        # Use cached file if file_id provided, otherwise read uploaded file
        filename = None
        if file_id:
            cache_path = CACHE_DIR / file_id
            if not cache_path.exists():
                raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")
            contents = cache_path.read_bytes()
            filename = file_id.split('_', 1)[1] if '_' in file_id else file_id
            print(f"[BATCH] Using cached file: {file_id}")
        elif file:
            contents = await file.read()
            filename = file.filename
            print(f"[BATCH] Processing uploaded file: {file.filename}")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'file_id' must be provided")

        df = parse_file_content(contents, filename)
        
        # Extract data
        time_data = df.iloc[:, time_column].values
        Signal = df.iloc[:, signal_column].values
        
        print(f"\n{'='*70}")
        print(f"[BATCH] Processing {len(Signal):,} points")
        print(f"{'='*70}")
        
        plots = {}
        
        # 1. Raw Signal Plot
        t1 = time.time()
        x_down, y_down = lttb_downsample(time_data, Signal, target_points=15000)
        plots['signal_raw'] = {
            "type": "scatter",
            "data": {
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "Raw Signal",
                "color": "#1f77b4"
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Amplitude (V)",
                "title": "Raw Signal"
            }
        }
        print(f"[BATCH] ✓ Raw signal: {time.time() - t1:.3f}s")
        
        # Process wavelet decomposition once for all plots
        t1 = time.time()
        coeffs = pywt.wavedec(Signal, wavelet_type, level=n_levels)
        threshold = lambda x: np.sqrt(2 * np.log(len(x))) * np.median(np.abs(x) / 0.6745)
        denoised_coeffs = [pywt.threshold(c, threshold(c), mode='soft') if i > 0 else c for i, c in enumerate(coeffs)]
        denoised_signal = pywt.waverec(denoised_coeffs, wavelet_type)[:len(Signal)]
        print(f"[BATCH] ✓ Wavelet processing: {time.time() - t1:.3f}s")
        
        # 2. Denoised Signal Plot
        t1 = time.time()
        x_down, y_down = lttb_downsample(time_data, denoised_signal, target_points=15000)
        plots['signal_denoised'] = {
            "type": "scatter",
            "data": {
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": "Denoised Signal",
                "color": "#ff7f0e"
            },
            "layout": {
                "xaxis_title": "Time (s)",
                "yaxis_title": "Amplitude (V)",
                "title": "Denoised Signal"
            }
        }
        print(f"[BATCH] ✓ Denoised signal: {time.time() - t1:.3f}s")
        
        # Calculate sampling frequency from time data (matching Streamlit)
        tf = time_data[2] - time_data[1]  # Time step
        fs = 1 / tf  # Sampling frequency

        # 3. FFT Plots - Generate ALL 4 types (MATCHING STREAMLIT IMPLEMENTATION)
        t1 = time.time()

        # 3a. FFT of Raw Signal (with zero-padding and normalization like Streamlit)
        NFFT = 2 ** int(np.ceil(np.log2(len(Signal))))  # Next power of 2
        fft_raw = 2*np.abs(np.fft.fft(Signal, NFFT)) / len(Signal)  # FFT with zero-padding & normalization
        fft_freqs_raw = fs * np.arange(0, NFFT // 2 + 1) / NFFT  # Proper frequency array
        # Take only positive frequencies
        fft_raw = fft_raw[:len(fft_freqs_raw)]
        x_down_raw, y_down_raw = lttb_downsample(fft_freqs_raw, fft_raw, target_points=15000)

        plots['fft_raw'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down_raw.tolist(),
                    "y": y_down_raw.tolist(),
                    "name": "FFT of Raw Signal",
                    "color": "#1f77b4"
                }]
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Raw Signal"
            }
        }

        # 3b. FFT of Denoised Signal (matching Streamlit - no normalization for denoised)
        fft_denoised = 2*np.abs(np.fft.fft(denoised_signal))[:len(Signal) // 2]
        fft_freqs_denoised = fs * np.arange(0, len(fft_denoised)) / len(Signal)  # Proper frequency array
        x_down_denoised, y_down_denoised = lttb_downsample(fft_freqs_denoised, fft_denoised, target_points=15000)

        plots['fft_denoised'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down_denoised.tolist(),
                    "y": y_down_denoised.tolist(),
                    "name": "FFT of Denoised Signal",
                    "color": "#ff7f0e"
                }]
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Denoised Signal"
            }
        }

        # 3c. FFT of Approx Coefficients (matching Streamlit)
        fft_approx = np.abs(np.fft.fft(coeffs[0]))[:len(coeffs[0]) // 2]
        fft_freqs_approx = np.linspace(100, fs / 2, len(fft_approx))  # Streamlit uses linspace for coeffs
        x_down_approx, y_down_approx = lttb_downsample(fft_freqs_approx, fft_approx, target_points=15000)

        plots['fft_approx'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down_approx.tolist(),
                    "y": y_down_approx.tolist(),
                    "name": "FFT of Approx Coefficients",
                    "color": "#2ca02c"
                }]
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Approx Coefficients"
            }
        }

        # 3d. FFT of Detail Coefficients (matching Streamlit)
        detail_traces = []
        for i, coeff in enumerate(coeffs[1:]):
            fft_detail = np.abs(np.fft.fft(coeff))[:len(coeff) // 2]
            fft_freqs_detail = np.linspace(100, fs / 2, len(fft_detail))  # Streamlit uses linspace for coeffs
            x_down_detail, y_down_detail = lttb_downsample(fft_freqs_detail, fft_detail, target_points=5000)
            detail_traces.append({
                "x": x_down_detail.tolist(),
                "y": y_down_detail.tolist(),
                "name": f"FFT Detail {i + 1}",
                "color": None  # Let Plotly auto-assign colors
            })

        plots['fft_detail'] = {
            "type": "scatter",
            "data": {
                "traces": detail_traces
            },
            "layout": {
                "xaxis_title": "Frequency (Hz)",
                "yaxis_title": "Amplitude (V)",
                "title": "FFT of Detail Coefficients"
            }
        }

        print(f"[BATCH] ✓ All 4 FFT plots: {time.time() - t1:.3f}s")
        
        # 4. Wavelet Coefficients Plots - Generate all 4 types
        t1 = time.time()

        # 4a. Approximation Coefficients
        x_data = np.arange(len(coeffs[0]))
        x_down, y_down = lttb_downsample(x_data, coeffs[0], target_points=15000)
        plots['wavelet_approx'] = {
            "type": "scatter",
            "data": {
                "traces": [{
                    "x": x_down.tolist(),
                    "y": y_down.tolist(),
                    "name": "Approximation Coefficients",
                    "color": "#2ca02c"
                }]
            },
            "layout": {
                "xaxis_title": "Index",
                "yaxis_title": "Coefficient Value (V)",
                "title": "Wavelet Approximation Coefficients"
            }
        }

        # 4b. Detail Coefficients
        detail_traces = []
        for i, coeff in enumerate(coeffs[1:]):
            x_data = np.arange(len(coeff))
            x_down, y_down = lttb_downsample(x_data, coeff, target_points=5000)
            detail_traces.append({
                "x": x_down.tolist(),
                "y": y_down.tolist(),
                "name": f"Detail Coefficients {i + 1}",
                "color": None
            })
        plots['wavelet_detail'] = {
            "type": "scatter",
            "data": {
                "traces": detail_traces
            },
            "layout": {
                "xaxis_title": "Index",
                "yaxis_title": "Coefficient Value (V)",
                "title": "Wavelet Detail Coefficients"
            }
        }

        # 4c. Pearson CC (Approximation)
        correlation_approx = np.corrcoef(Signal[:len(coeffs[0])], coeffs[0])[0, 1]
        plots['wavelet_pearson_approx'] = {
            "type": "bar",
            "data": {
                "traces": [{
                    "x": ["Approx Coefficients"],
                    "y": [float(correlation_approx)],
                    "name": "Pearson CC",
                    "color": "#9467bd"
                }]
            },
            "layout": {
                "xaxis_title": "Coefficient Type",
                "yaxis_title": "Correlation Coefficient",
                "title": "Pearson CC (Approximation)"
            }
        }

        # 4d. Pearson CC (Detail)
        correlations_detail = [np.corrcoef(Signal[:len(coeff)], coeff)[0, 1] for coeff in coeffs[1:]]
        plots['wavelet_pearson_detail'] = {
            "type": "bar",
            "data": {
                "traces": [{
                    "x": [f"Detail {i + 1}" for i in range(len(correlations_detail))],
                    "y": [float(c) for c in correlations_detail],
                    "name": "Pearson CC",
                    "color": "#9467bd"
                }]
            },
            "layout": {
                "xaxis_title": "Coefficient Type",
                "yaxis_title": "Correlation Coefficient",
                "title": "Pearson CC (Detail)"
            }
        }

        print(f"[BATCH] ✓ All 4 Wavelet plots: {time.time() - t1:.3f}s")
        
        # 5. Spectrograms - Generate both raw and denoised
        t1 = time.time()

        # Helper function to generate and downsample spectrogram
        def generate_spectrogram(signal, name, colorscale, fs):
            f, t, Sxx = spectrogram(signal, fs)
            z_data = 10 * np.log10(Sxx + 1e-10)

            # Downsample if too large
            max_freq_bins = 200
            max_time_bins = 500

            if len(f) > max_freq_bins or len(t) > max_time_bins:
                freq_step = max(1, len(f) // max_freq_bins)
                time_step = max(1, len(t) // max_time_bins)
                f_down = f[::freq_step]
                t_down = t[::time_step]
                z_down = z_data[::freq_step, ::time_step]
            else:
                f_down, t_down, z_down = f, t, z_data

            return {
                "type": "heatmap",
                "data": {
                    "x": t_down.tolist(),
                    "y": f_down.tolist(),
                    "z": z_down.tolist(),
                    "colorscale": colorscale
                },
                "layout": {
                    "xaxis_title": "Time (s)",
                    "yaxis_title": "Frequency (Hz)",
                    "title": f"Spectrogram ({name})"
                },
                "metadata": {
                    "shape": list(z_down.shape),
                    "data_points": z_down.size
                }
            }

        # Generate raw spectrum
        plots['spectrum_raw'] = generate_spectrogram(Signal, "Raw", "Viridis", fs)

        # Generate denoised spectrum
        plots['spectrum_denoised'] = generate_spectrogram(denoised_signal, "Denoised", "Plasma", fs)

        print(f"[BATCH] ✓ Spectrograms (raw + denoised): {time.time() - t1:.3f}s")
        
        total_time = time.time() - batch_start
        print(f"{'='*70}")
        print(f"[BATCH] ✅ All plots generated in {total_time:.3f}s")
        print(f"{'='*70}\n")
        
        return {
            "plots": plots,
            "metadata": {
                "original_points": len(Signal),
                "total_processing_time": f"{total_time:.3f}s",
                "compression_ratio": f"{len(Signal) / 15000:.1f}x",
                "plots_generated": len(plots)
            }
        }
        
    except Exception as e:
        print(f"Batch plot error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch plot generation error: {str(e)}")

# ============================================================================
# SVM CLASSIFICATION ENDPOINTS
# ============================================================================

def make_meshgrid(x, y, h=.02):
    """Create mesh grid for decision boundary plotting"""
    x_min, x_max = x.min() - 1, x.max() + 1
    y_min, y_max = y.min() - 1, y.max() + 1
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))
    return xx, yy

def plot_contours(ax, clf, xx, yy, **params):
    """Plot decision boundaries"""
    Z = clf.predict(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    out = ax.contourf(xx, yy, Z, **params)
    return out

def plot_to_base64(fig):
    """Convert matplotlib figure to base64 string"""
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64

@app.options("/api/svm/upload-dataset")
async def options_svm_upload_dataset():
    return {}

@app.post("/api/svm/upload-dataset")
async def upload_svm_dataset(file: UploadFile = File(...)):
    """
    Upload xlsx or csv file for SVM classification.
    Returns available columns for feature and target selection.
    """
    try:
        print(f"[SVM UPLOAD] Received file: {file.filename}")

        # Read file content
        contents = await file.read()

        # Parse based on extension (handle .gz files)
        filename_clean = file.filename.lower()
        if filename_clean.endswith('.gz'):
            filename_clean = filename_clean[:-3]  # Remove '.gz'

        file_ext = filename_clean.split('.')[-1]

        if file_ext == 'xlsx':
            df = pd.read_excel(BytesIO(contents))
        elif file_ext == 'csv':
            # Try different delimiters
            content_str = contents.decode('utf-8')
            for delimiter in [',', '\t', ';']:
                try:
                    df = pd.read_csv(StringIO(content_str), delimiter=delimiter)
                    if df.shape[1] > 1:
                        break
                except:
                    continue
            else:
                df = pd.read_csv(StringIO(content_str), delimiter=',')
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Generate file hash for caching
        file_hash = hashlib.sha256(contents).hexdigest()[:16]
        file_id = f"svm_{file_hash}_{file.filename}"
        cache_path = CACHE_DIR / file_id

        # Save to cache
        cache_path.write_bytes(contents)
        print(f"[SVM UPLOAD] Cached dataset: {file_id}")

        # Get column names and sample data
        columns = df.columns.tolist()
        sample_data = df.head(5).to_dict('records')

        print(f"[SVM UPLOAD] Dataset shape: {df.shape}")
        print(f"[SVM UPLOAD] Columns: {columns}")

        return {
            "file_id": file_id,
            "filename": file.filename,
            "columns": columns,
            "rows": df.shape[0],
            "sample_data": sample_data,
            "status": "success"
        }

    except Exception as e:
        print(f"[SVM UPLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.options("/api/svm/train")
async def options_svm_train():
    return {}

@app.post("/api/svm/train")
async def train_svm_model(
    file_id: str = Form(...),
    feature_col_1: str = Form(...),
    feature_col_2: str = Form(...),
    target_col: str = Form(...),
    test_sizes: str = Form("0.2,0.3"),  # Comma-separated string
    kernels: str = Form("poly,rbf,linear,sigmoid"),  # Comma-separated string
    c_values: str = Form("1,3,5,7,9"),  # Reduced from 9 to 5 values for 2x speedup
    gamma_values: str = Form("0.0001,0.001,0.01,0.1"),  # Reduced from 5 to 4 values
    cv_folds: int = Form(2)  # Reduced from 3 to 2 for 33% speedup
):
    """
    Train SVM models with multiple kernels and test sizes.
    Uses RandomizedSearchCV for fast hyperparameter optimization (3-5x faster than GridSearch).
    Returns metrics, plots (as base64), and model information.
    """
    try:
        start_time = time.time()
        print(f"\n{'='*70}")
        print(f"[SVM TRAIN] Starting SVM training")
        print(f"{'='*70}")

        # Parse parameters
        test_size_list = [float(x.strip()) for x in test_sizes.split(',')]
        kernel_list = [x.strip() for x in kernels.split(',')]
        c_list = [float(x.strip()) for x in c_values.split(',')]
        gamma_list = [float(x.strip()) for x in gamma_values.split(',')]

        print(f"[SVM TRAIN] Test sizes: {test_size_list}")
        print(f"[SVM TRAIN] Kernels: {kernel_list}")
        print(f"[SVM TRAIN] C values: {c_list}")
        print(f"[SVM TRAIN] Gamma values: {gamma_list}")

        # Load cached file
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")

        contents = cache_path.read_bytes()

        # Handle .gz extension in file_id
        file_id_clean = file_id.lower()
        if file_id_clean.endswith('.gz'):
            file_id_clean = file_id_clean[:-3]

        file_ext = file_id_clean.split('.')[-1]

        if file_ext == 'xlsx':
            df = pd.read_excel(BytesIO(contents))
        else:
            df = pd.read_csv(StringIO(contents.decode('utf-8')))

        print(f"[SVM TRAIN] Loaded dataset: {df.shape}")

        # Extract features and target
        X = df[[feature_col_1, feature_col_2]]
        y = df[target_col]

        print(f"[SVM TRAIN] Features: {feature_col_1}, {feature_col_2}")
        print(f"[SVM TRAIN] Target: {target_col}")
        print(f"[SVM TRAIN] Class distribution: {y.value_counts().to_dict()}")

        # Storage for results
        all_results = {}
        all_models = {}
        best_overall_model = None
        best_overall_auc = 0
        best_overall_config = {}

        # Training loop
        for test_size in test_size_list:
            print(f"\n[SVM TRAIN] Training with test_size={test_size}")

            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )

            # Binarize labels for ROC calculation
            unique_classes = sorted(y.unique())
            y_train_bin = label_binarize(y_train, classes=unique_classes)
            y_test_bin = label_binarize(y_test, classes=unique_classes)

            # Handle binary classification (label_binarize returns 2D for binary)
            if len(unique_classes) == 2:
                y_train_bin = y_train_bin.ravel()
                y_test_bin = y_test_bin.ravel()

            test_size_results = {
                'kernels': {},
                'comparison': {
                    'Kernel': [],
                    'Accuracy': [],
                    'Precision': [],
                    'Recall': [],
                    'F1 Score': [],
                    'AUC Score': [],
                    'Best C': [],
                    'Best Gamma': []
                },
                'roc_data': {}
            }

            for kernel in kernel_list:
                t1 = time.time()
                print(f"  [SVM TRAIN] Training {kernel} kernel...")

                # OPTIMIZATION: Use LinearSVC for linear kernel (10-100x faster)
                if kernel == "linear":
                    # LinearSVC is optimized for linear kernels and much faster than SVC
                    base_svm = LinearSVC(random_state=42, max_iter=10000, dual=True)
                    # Wrap in CalibratedClassifierCV to get probability estimates
                    svm = CalibratedClassifierCV(base_svm, cv=3)
                    parameters = {"estimator__C": c_list}  # Use 'estimator' not 'base_estimator'
                else:
                    # Setup SVM with increased cache for non-linear kernels
                    svm = SVC(
                        kernel=kernel,
                        probability=True,
                        random_state=42,
                        cache_size=500  # Increased from default 200MB to 500MB
                    )
                    parameters = {"C": c_list, 'gamma': gamma_list}

                    if kernel == "poly":
                        parameters['degree'] = [3]

                # OPTIMIZATION: Use RandomizedSearchCV for 3-5x speedup
                # Samples 20 random combinations instead of trying all 45+
                n_iter = min(20, len(c_list) * len(gamma_list) if kernel != "linear" else len(c_list))
                searcher = RandomizedSearchCV(
                    svm, parameters, n_iter=n_iter, n_jobs=-1, cv=cv_folds,
                    refit=True, verbose=0, scoring='roc_auc', random_state=42
                )
                searcher.fit(X_train, y_train)

                # Best model predictions
                best_model = searcher.best_estimator_
                y_pred = best_model.predict(X_test)
                y_pred_proba = best_model.predict_proba(X_test)

                # Handle binary vs multiclass
                if len(unique_classes) == 2:
                    y_pred_proba_score = y_pred_proba[:, 1]
                else:
                    y_pred_proba_score = y_pred_proba

                # Calculate metrics
                auc_score = roc_auc_score(y_test_bin, y_pred_proba_score)
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

                # ROC curve data
                if len(unique_classes) == 2:
                    fpr, tpr, _ = roc_curve(y_test_bin, y_pred_proba_score)
                else:
                    # For multiclass, use macro average
                    fpr, tpr = {}, {}
                    for i in range(len(unique_classes)):
                        fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_pred_proba[:, i])

                # Store results
                test_size_results['kernels'][kernel] = {
                    'best_params': searcher.best_params_,
                    'auc_score': float(auc_score),
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
                }

                test_size_results['comparison']['Kernel'].append(kernel)
                test_size_results['comparison']['Accuracy'].append(float(accuracy))
                test_size_results['comparison']['Precision'].append(float(precision))
                test_size_results['comparison']['Recall'].append(float(recall))
                test_size_results['comparison']['F1 Score'].append(float(f1))
                test_size_results['comparison']['AUC Score'].append(float(auc_score))

                # Handle parameter names for LinearSVC vs SVC
                if kernel == "linear":
                    best_c = searcher.best_params_.get('estimator__C', searcher.best_params_.get('C', None))
                    best_gamma = None  # LinearSVC doesn't have gamma
                else:
                    best_c = searcher.best_params_.get('C', None)
                    best_gamma = searcher.best_params_.get('gamma', None)

                test_size_results['comparison']['Best C'].append(best_c)
                test_size_results['comparison']['Best Gamma'].append(best_gamma if best_gamma is not None else "N/A")

                # Store ROC data
                if len(unique_classes) == 2:
                    test_size_results['roc_data'][kernel] = {
                        'fpr': fpr.tolist(),
                        'tpr': tpr.tolist(),
                        'auc': float(auc_score)
                    }

                # Track best overall model
                if auc_score > best_overall_auc:
                    best_overall_auc = auc_score
                    best_overall_model = best_model

                    # Normalize params for consistent access
                    normalized_params = {}
                    if kernel == "linear":
                        normalized_params['C'] = searcher.best_params_.get('estimator__C')
                        normalized_params['gamma'] = None
                    else:
                        normalized_params['C'] = searcher.best_params_.get('C')
                        normalized_params['gamma'] = searcher.best_params_.get('gamma')

                    best_overall_config = {
                        'kernel': kernel,
                        'test_size': test_size,
                        'params': normalized_params,
                        'auc': float(auc_score),
                        'X_train': X_train,
                        'X_test': X_test,
                        'y_train': y_train,
                        'y_test': y_test,
                        'feature_col_1': feature_col_1,
                        'feature_col_2': feature_col_2,
                        'searcher': searcher
                    }

                print(f"    ✓ {kernel}: AUC={auc_score:.4f}, Acc={accuracy:.4f} ({time.time()-t1:.2f}s)")

            all_results[test_size] = test_size_results

        # Generate plots
        print(f"\n[SVM TRAIN] Generating plots...")
        plots = {}

        # 1. ROC Curves Comparison
        if len(unique_classes) == 2:
            fig, ax = plt.subplots(figsize=(10, 8))
            for test_size, results in all_results.items():
                for kernel, roc_data in results['roc_data'].items():
                    ax.plot(
                        roc_data['fpr'], roc_data['tpr'],
                        label=f'{kernel} (TS={test_size}, AUC={roc_data["auc"]:.3f})',
                        linewidth=2
                    )
            ax.plot([0, 1], [0, 1], 'k--', linewidth=1, label='Random')
            ax.set_xlabel('False Positive Rate', fontsize=12)
            ax.set_ylabel('True Positive Rate', fontsize=12)
            ax.set_title('ROC Curve Comparison Across Test Sizes and Kernels', fontsize=14)
            ax.legend(loc='lower right', fontsize=8)
            ax.grid(True, alpha=0.3)
            plots['roc_comparison'] = plot_to_base64(fig)
            print(f"  ✓ ROC comparison plot")

        # 2. Metric Comparisons
        metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC Score']
        for metric in metrics:
            fig, ax = plt.subplots(figsize=(10, 6))
            for kernel in kernel_list:
                values = []
                sizes = []
                for test_size, results in all_results.items():
                    comp_df = pd.DataFrame(results['comparison'])
                    kernel_row = comp_df[comp_df['Kernel'] == kernel]
                    if not kernel_row.empty:
                        values.append(kernel_row[metric].values[0])
                        sizes.append(test_size)
                ax.plot(sizes, values, marker='o', label=kernel, linewidth=2, markersize=8)
            ax.set_xlabel('Test Size', fontsize=12)
            ax.set_ylabel(metric, fontsize=12)
            ax.set_title(f'{metric} Comparison Across Test Sizes', fontsize=14)
            ax.legend(loc='best')
            ax.grid(True, alpha=0.3)
            plots[f'metric_{metric.lower().replace(" ", "_")}'] = plot_to_base64(fig)
            print(f"  ✓ {metric} comparison plot")

        # 3. Confusion Matrices
        for kernel in kernel_list:
            fig, axes = plt.subplots(1, len(test_size_list), figsize=(6*len(test_size_list), 5))
            if len(test_size_list) == 1:
                axes = [axes]

            for idx, test_size in enumerate(test_size_list):
                cm = all_results[test_size]['kernels'][kernel]['confusion_matrix']
                sns.heatmap(
                    cm, annot=True, fmt='d', cmap='Blues',
                    ax=axes[idx], cbar=True
                )
                axes[idx].set_title(f'Test Size: {test_size}')
                axes[idx].set_xlabel('Predicted')
                axes[idx].set_ylabel('Actual')

            fig.suptitle(f'Confusion Matrices for {kernel} Kernel', fontsize=14)
            plt.tight_layout()
            plots[f'confusion_matrix_{kernel}'] = plot_to_base64(fig)
            print(f"  ✓ Confusion matrix for {kernel}")

        # 4. Best Model Decision Boundary
        if best_overall_config:
            fig, ax = plt.subplots(figsize=(10, 8))
            X_full = df[[feature_col_1, feature_col_2]]
            y_full = df[target_col]

            xx, yy = make_meshgrid(X_full[feature_col_1], X_full[feature_col_2])
            plot_contours(ax, best_overall_config['searcher'], xx, yy, cmap=plt.cm.coolwarm, alpha=0.3)

            # Plot points
            for class_val in unique_classes:
                mask = y_full == class_val
                ax.scatter(
                    X_full.loc[mask, feature_col_1],
                    X_full.loc[mask, feature_col_2],
                    label=f'Class {class_val}',
                    s=50, edgecolor='black', linewidth=0.5
                )

            ax.set_xlabel(feature_col_1, fontsize=12)
            ax.set_ylabel(feature_col_2, fontsize=12)
            ax.set_title(
                f"Best Model Decision Boundary\n"
                f"{best_overall_config['kernel']} kernel (AUC={best_overall_config['auc']:.4f})",
                fontsize=14
            )
            ax.legend(loc='best')
            ax.grid(True, alpha=0.3)
            plots['best_model_decision_boundary'] = plot_to_base64(fig)
            print(f"  ✓ Best model decision boundary")

        # Save best model
        job_id = str(uuid.uuid4())[:8]
        model_path = MODEL_DIR / f"svm_model_{job_id}.pkl"

        model_data = {
            'model': best_overall_model,
            'config': best_overall_config,
            'feature_names': [feature_col_1, feature_col_2],
            'target_name': target_col,
            'unique_classes': unique_classes,
            'all_results': all_results,
            'plots': plots  # Save plots for later download
        }

        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)

        print(f"[SVM TRAIN] Saved model: {model_path}")

        total_time = time.time() - start_time
        print(f"{'='*70}")
        print(f"[SVM TRAIN] ✅ Training complete in {total_time:.2f}s")
        print(f"[SVM TRAIN] Best model: {best_overall_config['kernel']} (AUC={best_overall_auc:.4f})")
        print(f"{'='*70}\n")

        return {
            "job_id": job_id,
            "results": all_results,
            "best_model": {
                "kernel": best_overall_config['kernel'],
                "test_size": best_overall_config['test_size'],
                "params": best_overall_config['params'],
                "auc": best_overall_config['auc']
            },
            "plots": plots,
            "metadata": {
                "total_time": f"{total_time:.2f}s",
                "num_test_sizes": len(test_size_list),
                "num_kernels": len(kernel_list),
                "feature_names": [feature_col_1, feature_col_2],
                "target_name": target_col
            }
        }

    except Exception as e:
        print(f"[SVM TRAIN ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

@app.options("/api/svm/predict")
async def options_svm_predict():
    return {}

@app.post("/api/svm/predict")
async def predict_svm(
    job_id: str = Form(...),
    feature_1: float = Form(...),
    feature_2: float = Form(...)
):
    """
    Predict using trained SVM model.
    """
    try:
        # Load model
        model_path = MODEL_DIR / f"svm_model_{job_id}.pkl"
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model not found: {job_id}")

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        # Predict
        X_new = np.array([[feature_1, feature_2]])
        prediction = model_data['model'].predict(X_new)[0]
        probabilities = model_data['model'].predict_proba(X_new)[0]

        return {
            "prediction": int(prediction),
            "probabilities": {
                str(cls): float(prob)
                for cls, prob in zip(model_data['unique_classes'], probabilities)
            },
            "feature_names": model_data['feature_names'],
            "model_info": {
                "kernel": model_data['config']['kernel'],
                "auc": model_data['config']['auc']
            }
        }

    except Exception as e:
        print(f"[SVM PREDICT ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.options("/api/svm/download-results")
async def options_svm_download_results():
    return {}

@app.post("/api/svm/download-results")
async def download_svm_results(job_id: str = Form(...)):
    """
    Download SVM results as Excel file.
    """
    try:
        # Load model data
        model_path = MODEL_DIR / f"svm_model_{job_id}.pkl"
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model not found: {job_id}")

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        # Create Excel file
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Write results for each test size
            for test_size, results in model_data['all_results'].items():
                # Kernel results
                kernel_df = pd.DataFrame.from_dict(results['kernels'], orient='index')
                kernel_df = kernel_df.drop('confusion_matrix', axis=1)
                kernel_df.to_excel(writer, sheet_name=f'TestSize_{test_size}_Kernels')

                # Comparison metrics
                comparison_df = pd.DataFrame(results['comparison'])
                comparison_df.to_excel(writer, sheet_name=f'TestSize_{test_size}_Metrics', index=False)

            # Best model summary
            params = model_data['config']['params']
            best_c = params.get('C', 'N/A')
            best_gamma = params.get('gamma', 'N/A')

            best_df = pd.DataFrame([{
                'Kernel': model_data['config']['kernel'],
                'Test Size': model_data['config']['test_size'],
                'AUC': model_data['config']['auc'],
                'C': best_c,
                'Gamma': best_gamma if best_gamma is not None else 'N/A',
                'Feature 1': model_data['feature_names'][0],
                'Feature 2': model_data['feature_names'][1],
                'Target': model_data['target_name']
            }])
            best_df.to_excel(writer, sheet_name='Best_Model', index=False)

        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=svm_results_{job_id}.xlsx"}
        )

    except Exception as e:
        print(f"[SVM DOWNLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.options("/api/svm/download-plot")
async def options_svm_download_plot():
    return {}

@app.post("/api/svm/download-plot")
async def download_svm_plot(
    job_id: str = Form(...),
    plot_name: str = Form(...)
):
    """
    Download a single SVM plot as PNG file.
    """
    try:
        # Load model data
        model_path = MODEL_DIR / f"svm_model_{job_id}.pkl"
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model not found: {job_id}")

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        # Get the specific plot
        # Plots are stored in the response during training, need to retrieve from all_results
        # Search through all test_size results to find the plot
        plot_base64 = None

        # Check if plots were saved directly in model_data
        if 'plots' in model_data:
            plot_base64 = model_data['plots'].get(plot_name)

        if not plot_base64:
            raise HTTPException(status_code=404, detail=f"Plot not found: {plot_name}")

        # Decode base64 to bytes
        plot_bytes = base64.b64decode(plot_base64)

        # Create BytesIO object
        output = BytesIO(plot_bytes)
        output.seek(0)

        # Clean filename
        clean_name = plot_name.replace(' ', '_').lower()

        print(f"[SVM PLOT DOWNLOAD] Downloading {plot_name}")

        return StreamingResponse(
            output,
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename={clean_name}.png"}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[SVM PLOT DOWNLOAD ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.options("/api/svm/download-all-plots")
async def options_svm_download_all_plots():
    return {}

@app.post("/api/svm/download-all-plots")
async def download_all_svm_plots(job_id: str = Form(...)):
    """
    Download all SVM plots as a ZIP file.
    """
    try:
        # Load model data
        model_path = MODEL_DIR / f"svm_model_{job_id}.pkl"
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model not found: {job_id}")

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        # Get plots
        plots = model_data.get('plots', {})

        if not plots:
            raise HTTPException(status_code=404, detail="No plots found for this model")

        # Create ZIP file in memory
        zip_buffer = BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for plot_name, plot_base64 in plots.items():
                # Decode base64 to bytes
                plot_bytes = base64.b64decode(plot_base64)

                # Clean filename
                clean_name = plot_name.replace(' ', '_').lower()

                # Add to ZIP
                zip_file.writestr(f"{clean_name}.png", plot_bytes)

        zip_buffer.seek(0)

        print(f"[SVM ALL PLOTS DOWNLOAD] Created ZIP with {len(plots)} plots")

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=svm_plots_{job_id}.zip"}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[SVM ALL PLOTS DOWNLOAD ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

