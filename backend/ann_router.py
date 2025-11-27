"""
ANN (Artificial Neural Network) Router for FastAPI
Provides endpoints for:
- Training regression models
- Forward prediction
- Inverse problem solving (find inputs for desired outputs)
- Model evaluation and visualization
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List, Dict
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO, StringIO
import base64
import json
import hashlib
import pickle
from pathlib import Path
import time

# Create router
router = APIRouter(prefix="/api/ann", tags=["ANN"])

# Directories for caching
CACHE_DIR = Path("/tmp/ann_cache")
CACHE_DIR.mkdir(exist_ok=True)

MODEL_DIR = Path("/tmp/ann_models")
MODEL_DIR.mkdir(exist_ok=True)

# Store active models in memory (for faster access)
ACTIVE_MODELS = {}


class ANNModel:
    """Wrapper class for ANN model with preprocessing"""

    def __init__(self):
        self.model = None
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()
        self.history = None
        self.feature_names = []
        self.target_name = ""
        self.input_bounds = None

    def build_model(self, n_features, architecture=[30, 10, 8], activation='relu', optimizer='adam'):
        """Build ANN model"""
        model = keras.Sequential()
        model.add(layers.Dense(architecture[0], activation=activation, input_shape=(n_features,)))

        for units in architecture[1:]:
            model.add(layers.Dense(units, activation=activation))

        model.add(layers.Dense(1))  # Output layer
        model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])

        self.model = model
        return model

    def train(self, X_train, y_train, epochs=350, batch_size=16, validation_split=0.2):
        """Train the model - EXACT match to professor's code"""
        if self.model is None:
            self.build_model(n_features=X_train.shape[1])

        self.history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=0
        )
        return self.history

    def predict(self, X):
        """Make predictions"""
        X_scaled = self.scaler_X.transform(X)
        y_pred_scaled = self.model.predict(X_scaled, verbose=0)
        y_pred = self.scaler_y.inverse_transform(y_pred_scaled)
        return y_pred

    def inverse_solve(self, desired_output, steps=200, lr=0.1):
        """Solve inverse problem - EXACT match to professor's code"""
        desired_output_scaled = self.scaler_y.transform([[desired_output]])[0][0]

        # Start with [0.0, 0.0] exactly like professor's code
        input_var = tf.Variable([[0.0] * len(self.feature_names)], dtype=tf.float32)
        optimizer = tf.keras.optimizers.Adam(learning_rate=lr)

        history = []

        for step in range(steps):
            with tf.GradientTape() as tape:
                pred = self.model(input_var)
                loss = tf.reduce_mean((pred - desired_output_scaled) ** 2)

            grads = tape.gradient(loss, [input_var])
            optimizer.apply_gradients(zip(grads, [input_var]))

            if step % 50 == 0:
                input_original = self.scaler_X.inverse_transform(input_var.numpy())
                pred_original = self.scaler_y.inverse_transform(pred.numpy())

                history_entry = {
                    'step': step,
                    'input_scaled': input_var.numpy().tolist()[0],
                    'predicted_scaled': float(pred.numpy()[0, 0]),
                    'predicted_output': float(pred_original[0, 0]),
                    'loss': float(loss.numpy())
                }
                for i, name in enumerate(self.feature_names):
                    history_entry[name] = float(input_original[0, i])

                history.append(history_entry)
                print(f"Step {step}, Input (scaled): {input_var.numpy()}, Predicted (scaled): {pred.numpy()}, Loss: {loss.numpy()}")

        # Final results
        input_original = self.scaler_X.inverse_transform(input_var.numpy())
        pred_original = self.scaler_y.inverse_transform(self.model(input_var).numpy())

        result = {
            'desired_output': desired_output,
            'predicted_output': float(pred_original[0, 0]),
            'error': abs(float(pred_original[0, 0]) - desired_output),
            'final_loss': float(loss.numpy()),
            'optimization_history': history
        }

        for i, name in enumerate(self.feature_names):
            result[f'found_{name}'] = float(input_original[0, i])

        return result


def plot_to_base64(fig):
    """Convert matplotlib figure to base64"""
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64


def detect_csv_has_header(content_str: str, delimiter: str = ',') -> bool:
    """Detect if CSV has header row"""
    try:
        lines = content_str.strip().split('\n')
        if len(lines) < 2:
            return True

        first_row = lines[0].split(delimiter)
        second_row = lines[1].split(delimiter)

        def is_numeric(cell):
            try:
                float(cell.strip())
                return True
            except ValueError:
                return False

        first_numeric = sum(1 for cell in first_row if is_numeric(cell))
        second_numeric = sum(1 for cell in second_row if is_numeric(cell))

        # If first row is all numeric, no header
        if first_numeric == len(first_row):
            return False

        # If first row has fewer numeric than second, likely header
        if first_numeric < second_numeric:
            return True

        return True
    except:
        return True


@router.options("/upload-dataset")
async def options_ann_upload():
    return {}


@router.post("/upload-dataset")
async def upload_ann_dataset(file: UploadFile = File(...)):
    """
    Upload dataset for ANN training (Excel or CSV).
    Returns file_id, columns, and sample data.
    """
    try:
        print(f"[ANN UPLOAD] Received file: {file.filename}")

        contents = await file.read()

        # Detect file type
        filename_clean = file.filename.lower()
        if filename_clean.endswith('.gz'):
            filename_clean = filename_clean[:-3]

        file_ext = filename_clean.split('.')[-1]

        # Parse file
        if file_ext == 'xlsx':
            df_test = pd.read_excel(BytesIO(contents), nrows=2)
            first_col = str(df_test.columns[0])

            if first_col.replace('.', '', 1).replace('-', '', 1).isdigit():
                df = pd.read_excel(BytesIO(contents), header=None)
                df.columns = [f"Column_{i+1}" for i in range(len(df.columns))]
                has_header = False
            else:
                df = pd.read_excel(BytesIO(contents))
                has_header = True

        elif file_ext == 'csv':
            content_str = contents.decode('utf-8')
            df = None

            for delimiter in [',', '\t', ';']:
                try:
                    has_header = detect_csv_has_header(content_str, delimiter)

                    if has_header:
                        df = pd.read_csv(StringIO(content_str), delimiter=delimiter)
                    else:
                        df = pd.read_csv(StringIO(content_str), delimiter=delimiter, header=None)
                        df.columns = [f"Column_{i+1}" for i in range(len(df.columns))]

                    if df.shape[1] > 1:
                        break
                except:
                    continue

            if df is None:
                df = pd.read_csv(StringIO(content_str))
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Generate file ID
        file_hash = hashlib.sha256(contents).hexdigest()[:16]
        file_id = f"ann_{file_hash}_{file.filename}"
        cache_path = CACHE_DIR / file_id

        # Save to cache
        cache_path.write_bytes(contents)

        # Save metadata
        metadata = {
            "has_header": has_header,
            "file_ext": file_ext,
            "columns": df.columns.tolist(),
            "shape": df.shape
        }
        metadata_path = CACHE_DIR / f"{file_id}.metadata.json"
        metadata_path.write_text(json.dumps(metadata))

        print(f"[ANN UPLOAD] Dataset shape: {df.shape}")
        print(f"[ANN UPLOAD] Columns: {df.columns.tolist()}")

        # Get column info
        columns = df.columns.tolist()
        sample_data = df.head(5).to_dict('records')

        # Get column statistics
        column_stats = {}
        for col in columns:
            try:
                if pd.api.types.is_numeric_dtype(df[col]):
                    column_stats[col] = {
                        "type": "numeric",
                        "min": float(df[col].min()),
                        "max": float(df[col].max()),
                        "mean": float(df[col].mean()),
                        "std": float(df[col].std()),
                        "unique_count": int(df[col].nunique())
                    }
                else:
                    column_stats[col] = {
                        "type": "categorical",
                        "unique_count": int(df[col].nunique()),
                        "unique_values": df[col].unique().tolist()[:20]
                    }
            except:
                column_stats[col] = {"type": "unknown"}

        return {
            "file_id": file_id,
            "filename": file.filename,
            "columns": columns,
            "rows": df.shape[0],
            "sample_data": sample_data,
            "column_stats": column_stats,
            "has_header": has_header,
            "status": "success"
        }

    except Exception as e:
        print(f"[ANN UPLOAD ERROR] {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@router.options("/train")
async def options_ann_train():
    return {}


@router.post("/train")
async def train_ann_model(
    file_id: str = Form(...),
    feature_columns: str = Form(...),  # Comma-separated column names
    target_column: str = Form(...),
    test_size: float = Form(0.1),
    epochs: int = Form(350),
    batch_size: int = Form(4),  # Professor's exact batch_size
    architecture: str = Form("30,10,8"),  # Comma-separated layer sizes
    validation_split: float = Form(0.2),  # Validation split during training
    activation: str = Form("relu"),  # Activation function: relu, tanh, sigmoid, elu
    optimizer: str = Form("adam"),  # Optimizer: adam, sgd, rmsprop
    use_bounds: bool = Form(False)  # Don't use bounds (professor's code doesn't have them)
):
    """
    Train ANN model on uploaded dataset.
    Returns model_id, training metrics, and loss plot.
    """
    try:
        start_time = time.time()
        print(f"\n{'='*70}")
        print(f"[ANN TRAIN] Starting training")
        print(f"{'='*70}")

        # Parse parameters
        feature_cols = [x.strip() for x in feature_columns.split(',')]
        arch = [int(x.strip()) for x in architecture.split(',')]

        print(f"[ANN TRAIN] Features: {feature_cols}")
        print(f"[ANN TRAIN] Target: {target_column}")
        print(f"[ANN TRAIN] Architecture: {arch}")

        # Load cached file
        cache_path = CACHE_DIR / file_id
        if not cache_path.exists():
            raise HTTPException(status_code=404, detail=f"Cached file not found: {file_id}")

        contents = cache_path.read_bytes()

        # Load metadata
        metadata_path = CACHE_DIR / f"{file_id}.metadata.json"
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text())
            has_header = metadata.get("has_header", True)
            file_ext = metadata.get("file_ext", "csv")
            saved_columns = metadata.get("columns", [])
        else:
            raise HTTPException(status_code=404, detail="Metadata not found")

        # Read file
        if file_ext == 'xlsx':
            if has_header:
                df = pd.read_excel(BytesIO(contents))
            else:
                df = pd.read_excel(BytesIO(contents), header=None)
                df.columns = saved_columns
        else:
            if has_header:
                df = pd.read_csv(StringIO(contents.decode('utf-8')))
            else:
                df = pd.read_csv(StringIO(contents.decode('utf-8')), header=None)
                df.columns = saved_columns

        print(f"[ANN TRAIN] Loaded dataset: {df.shape}")

        # Extract features and target
        X = df[feature_cols].values
        y = df[target_column].values

        print(f"[ANN TRAIN] X shape: {X.shape}, y shape: {y.shape}")

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        # Create and train model
        ann_model = ANNModel()
        ann_model.feature_names = feature_cols
        ann_model.target_name = target_column

        # Compute input bounds if requested
        if use_bounds:
            ann_model.input_bounds = [(X[:, i].min(), X[:, i].max()) for i in range(X.shape[1])]
            print(f"[ANN TRAIN] Input bounds: {ann_model.input_bounds}")

        # Normalize data
        X_train_scaled = ann_model.scaler_X.fit_transform(X_train)
        X_test_scaled = ann_model.scaler_X.transform(X_test)

        y_train_scaled = ann_model.scaler_y.fit_transform(y_train.reshape(-1, 1)).flatten()
        y_test_scaled = ann_model.scaler_y.transform(y_test.reshape(-1, 1)).flatten()

        # Build and train
        ann_model.build_model(n_features=X.shape[1], architecture=arch, activation=activation, optimizer=optimizer)

        print(f"[ANN TRAIN] Training for {epochs} epochs...")
        t1 = time.time()
        ann_model.train(X_train_scaled, y_train_scaled, epochs=epochs, batch_size=batch_size, validation_split=validation_split)
        print(f"[ANN TRAIN] Training completed in {time.time() - t1:.2f}s")

        # Evaluate
        y_pred_scaled = ann_model.model.predict(X_test_scaled, verbose=0)
        y_pred = ann_model.scaler_y.inverse_transform(y_pred_scaled)
        y_true = ann_model.scaler_y.inverse_transform(y_test_scaled.reshape(-1, 1))

        mae = float(np.mean(np.abs(y_pred - y_true)))
        mse = float(mean_squared_error(y_true, y_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_true, y_pred))

        metrics = {
            "mae": mae,
            "mse": mse,
            "rmse": rmse,
            "r2": r2,
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test))
        }

        print(f"[ANN TRAIN] Metrics - MAE: {mae:.4f}, RMSE: {rmse:.4f}, R²: {r2:.4f}")

        # Generate training history plot
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.plot(ann_model.history.history['loss'], label='Training Loss', linewidth=2)
        ax.plot(ann_model.history.history['val_loss'], label='Validation Loss', linewidth=2)
        ax.set_xlabel('Epochs', fontsize=12)
        ax.set_ylabel('Loss (MSE)', fontsize=12)
        ax.set_title('Training History', fontsize=14, fontweight='bold')
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)
        plt.tight_layout()

        loss_plot = plot_to_base64(fig)

        # Generate Predicted vs Actual scatter plot
        fig2, ax2 = plt.subplots(figsize=(8, 8))
        ax2.scatter(y_true, y_pred, alpha=0.6, s=50)
        ax2.plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--', lw=2, label='Perfect Prediction')
        ax2.set_xlabel('Actual Values', fontsize=12)
        ax2.set_ylabel('Predicted Values', fontsize=12)
        ax2.set_title('Predicted vs Actual', fontsize=14, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.grid(True, alpha=0.3)
        plt.tight_layout()

        predicted_vs_actual_plot = plot_to_base64(fig2)

        # Generate Residual plot
        residuals = y_true.flatten() - y_pred.flatten()

        fig3, ax3 = plt.subplots(figsize=(8, 6))
        ax3.scatter(y_true, residuals, alpha=0.6, s=50)
        ax3.axhline(0, color='red', linestyle='--', lw=2, label='Zero Error')
        ax3.set_xlabel('Actual Values', fontsize=12)
        ax3.set_ylabel('Residuals', fontsize=12)
        ax3.set_title('Residual Plot', fontsize=14, fontweight='bold')
        ax3.legend(fontsize=10)
        ax3.grid(True, alpha=0.3)
        plt.tight_layout()

        residual_plot = plot_to_base64(fig3)

        # Generate Histogram of Residuals
        fig4, ax4 = plt.subplots(figsize=(8, 6))
        ax4.hist(residuals, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
        ax4.set_xlabel('Residual', fontsize=12)
        ax4.set_ylabel('Frequency', fontsize=12)
        ax4.set_title('Histogram of Residuals', fontsize=14, fontweight='bold')
        ax4.grid(True, alpha=0.3, axis='y')
        plt.tight_layout()

        residual_histogram = plot_to_base64(fig4)

        # Save model
        model_id = f"ann_model_{hashlib.sha256(file_id.encode()).hexdigest()[:16]}_{int(time.time())}"
        model_path = MODEL_DIR / f"{model_id}.pkl"

        with open(model_path, 'wb') as f:
            pickle.dump(ann_model, f)

        # Store in memory
        ACTIVE_MODELS[model_id] = ann_model

        print(f"[ANN TRAIN] Model saved: {model_id}")
        print(f"[ANN TRAIN] Total time: {time.time() - start_time:.2f}s")
        print(f"{'='*70}\n")

        return {
            "model_id": model_id,
            "metrics": metrics,
            "training_history": {
                "epochs": list(range(epochs)),
                "train_loss": [float(x) for x in ann_model.history.history['loss']],
                "val_loss": [float(x) for x in ann_model.history.history['val_loss']]
            },
            "loss_plot": loss_plot,
            "predicted_vs_actual_plot": predicted_vs_actual_plot,
            "residual_plot": residual_plot,
            "residual_histogram": residual_histogram,
            "feature_columns": feature_cols,
            "target_column": target_column,
            "input_bounds": ann_model.input_bounds,
            "status": "success"
        }

    except Exception as e:
        print(f"[ANN TRAIN ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.options("/predict")
async def options_ann_predict():
    return {}


@router.post("/predict")
async def predict_ann(
    model_id: str = Form(...),
    input_values: str = Form(...)  # JSON string of input values
):
    """
    Make prediction using trained model.
    input_values should be JSON like: {"cr": 0.5, "cf": 1.2}
    """
    try:
        # Load model
        if model_id in ACTIVE_MODELS:
            ann_model = ACTIVE_MODELS[model_id]
        else:
            model_path = MODEL_DIR / f"{model_id}.pkl"
            if not model_path.exists():
                raise HTTPException(status_code=404, detail="Model not found")

            with open(model_path, 'rb') as f:
                ann_model = pickle.load(f)
                ACTIVE_MODELS[model_id] = ann_model

        # Parse input values
        inputs = json.loads(input_values)

        # Create input array in correct order
        X = np.array([[inputs[col] for col in ann_model.feature_names]])

        # Predict
        y_pred = ann_model.predict(X)

        result = {
            "prediction": float(y_pred[0, 0]),
            "input_values": inputs,
            "target_name": ann_model.target_name,
            "status": "success"
        }

        print(f"[ANN PREDICT] Input: {inputs} → Output: {y_pred[0, 0]:.4f}")

        return result

    except Exception as e:
        print(f"[ANN PREDICT ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.options("/inverse-solve")
async def options_ann_inverse():
    return {}


@router.post("/inverse-solve")
async def inverse_solve_ann(
    model_id: str = Form(...),
    desired_output: float = Form(...),
    steps: int = Form(200),
    learning_rate: float = Form(0.1)
):
    """
    Solve inverse problem: find input values that produce desired output.
    EXACT implementation matching professor's code - single optimization from [0.0, 0.0].
    Returns optimized inputs and convergence history.
    """
    try:
        start_time = time.time()
        print(f"\n[ANN INVERSE] Starting inverse optimization")
        print(f"[ANN INVERSE] Desired output: {desired_output}")

        # Load model
        if model_id in ACTIVE_MODELS:
            ann_model = ACTIVE_MODELS[model_id]
        else:
            model_path = MODEL_DIR / f"{model_id}.pkl"
            if not model_path.exists():
                raise HTTPException(status_code=404, detail="Model not found")

            with open(model_path, 'rb') as f:
                ann_model = pickle.load(f)
                ACTIVE_MODELS[model_id] = ann_model

        # Perform inverse optimization (single attempt from [0.0, 0.0])
        result = ann_model.inverse_solve(
            desired_output=desired_output,
            steps=steps,
            lr=learning_rate
        )

        # Generate convergence plot
        history = result['optimization_history']
        steps_list = [h['step'] for h in history]
        losses = [h['loss'] for h in history]
        outputs = [h['predicted_output'] for h in history]

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # Loss convergence
        axes[0, 0].plot(steps_list, losses, marker='o', markersize=4, color='blue', alpha=0.7)
        axes[0, 0].set_xlabel('Optimization Step')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].set_title('Loss Convergence')
        axes[0, 0].grid(True, alpha=0.3)
        axes[0, 0].set_yscale('log')

        # Output convergence
        axes[0, 1].plot(steps_list, outputs, marker='o', markersize=4, color='green', alpha=0.7)
        axes[0, 1].axhline(desired_output, color='red', linestyle='--', lw=2, label='Target')
        axes[0, 1].set_xlabel('Optimization Step')
        axes[0, 1].set_ylabel(f'{ann_model.target_name}')
        axes[0, 1].set_title('Output Convergence')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        # Individual feature convergence
        if len(ann_model.feature_names) >= 1:
            feature_vals = [h[ann_model.feature_names[0]] for h in history]
            axes[1, 0].plot(steps_list, feature_vals, marker='o', markersize=4, color='orange', alpha=0.7)
            axes[1, 0].set_xlabel('Optimization Step')
            axes[1, 0].set_ylabel(ann_model.feature_names[0])
            axes[1, 0].set_title(f'{ann_model.feature_names[0]} Convergence')
            axes[1, 0].grid(True, alpha=0.3)

        if len(ann_model.feature_names) >= 2:
            feature_vals = [h[ann_model.feature_names[1]] for h in history]
            axes[1, 1].plot(steps_list, feature_vals, marker='o', markersize=4, color='purple', alpha=0.7)
            axes[1, 1].set_xlabel('Optimization Step')
            axes[1, 1].set_ylabel(ann_model.feature_names[1])
            axes[1, 1].set_title(f'{ann_model.feature_names[1]} Convergence')
            axes[1, 1].grid(True, alpha=0.3)

        plt.suptitle(f'Inverse Optimization for {ann_model.target_name} = {desired_output}',
                     fontsize=16, fontweight='bold', y=0.995)
        plt.tight_layout()

        convergence_plot = plot_to_base64(fig)

        result['convergence_plot'] = convergence_plot
        result['optimization_time'] = f"{time.time() - start_time:.2f}s"
        result['status'] = 'success'

        print(f"[ANN INVERSE] Solution: {[result[f'found_{f}'] for f in ann_model.feature_names]}")
        print(f"[ANN INVERSE] Predicted output: {result['predicted_output']:.4f}, Error: {result['error']:.4f}")
        print(f"[ANN INVERSE] Completed in {time.time() - start_time:.2f}s\n")

        return result

    except Exception as e:
        print(f"[ANN INVERSE ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inverse optimization error: {str(e)}")


@router.options("/evaluate/{model_id}")
async def options_ann_evaluate():
    return {}


@router.get("/evaluate/{model_id}")
async def evaluate_ann_model(model_id: str):
    """
    Get evaluation metrics and plots for trained model.
    Returns metrics and visualization plots.
    """
    try:
        # Load model
        if model_id in ACTIVE_MODELS:
            ann_model = ACTIVE_MODELS[model_id]
        else:
            model_path = MODEL_DIR / f"{model_id}.pkl"
            if not model_path.exists():
                raise HTTPException(status_code=404, detail="Model not found")

            with open(model_path, 'rb') as f:
                ann_model = pickle.load(f)
                ACTIVE_MODELS[model_id] = ann_model

        return {
            "model_id": model_id,
            "feature_names": ann_model.feature_names,
            "target_name": ann_model.target_name,
            "input_bounds": ann_model.input_bounds,
            "architecture": [layer.units for layer in ann_model.model.layers if hasattr(layer, 'units')],
            "status": "success"
        }

    except Exception as e:
        print(f"[ANN EVALUATE ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


@router.get("/models")
async def list_ann_models():
    """List all available ANN models"""
    try:
        models = []

        # Check disk
        for model_file in MODEL_DIR.glob("ann_model_*.pkl"):
            model_id = model_file.stem.replace('.pkl', '')

            # Load basic info
            try:
                if model_id in ACTIVE_MODELS:
                    ann_model = ACTIVE_MODELS[model_id]
                else:
                    with open(model_file, 'rb') as f:
                        ann_model = pickle.load(f)

                models.append({
                    "model_id": model_id,
                    "feature_names": ann_model.feature_names,
                    "target_name": ann_model.target_name,
                    "n_features": len(ann_model.feature_names),
                    "created": model_file.stat().st_mtime
                })
            except:
                continue

        return {
            "models": models,
            "count": len(models),
            "status": "success"
        }

    except Exception as e:
        print(f"[ANN LIST ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing models: {str(e)}")
