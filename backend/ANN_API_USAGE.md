# ANN API Usage Guide

This guide explains how to use the ANN (Artificial Neural Network) endpoints for regression and inverse problem solving.

## Overview

The ANN module provides:
1. **Training**: Train neural network models on your data
2. **Prediction**: Use trained models to predict outputs from inputs
3. **Inverse Solving**: Find input values that produce a desired output (inverse optimization)
4. **Evaluation**: Get model performance metrics and visualizations

## Endpoints

### 1. Upload Dataset

**Endpoint:** `POST /api/ann/upload-dataset`

Upload an Excel (.xlsx) or CSV file containing your training data.

**Request:**
```bash
curl -X POST http://localhost:8000/api/ann/upload-dataset \
  -F "file=@your_data.xlsx"
```

**Response:**
```json
{
  "file_id": "ann_abc123_your_data.xlsx",
  "filename": "your_data.xlsx",
  "columns": ["cr", "cf", "t"],
  "rows": 1000,
  "sample_data": [...],
  "column_stats": {
    "cr": {
      "type": "numeric",
      "min": 0.1,
      "max": 2.5,
      "mean": 1.3,
      "std": 0.5
    },
    ...
  },
  "status": "success"
}
```

### 2. Train Model

**Endpoint:** `POST /api/ann/train`

Train an ANN model on your uploaded dataset.

**Parameters:**
- `file_id`: File ID from upload response
- `feature_columns`: Comma-separated input column names (e.g., "cr,cf")
- `target_column`: Output column name (e.g., "t")
- `test_size`: Fraction of data for testing (default: 0.1)
- `epochs`: Number of training epochs (default: 350)
- `batch_size`: Batch size for training (default: 16)
- `architecture`: Comma-separated layer sizes (default: "30,10,8")
- `use_bounds`: Compute input bounds from data (default: true)

**Request:**
```bash
curl -X POST http://localhost:8000/api/ann/train \
  -F "file_id=ann_abc123_your_data.xlsx" \
  -F "feature_columns=cr,cf" \
  -F "target_column=t" \
  -F "test_size=0.1" \
  -F "epochs=350" \
  -F "batch_size=16" \
  -F "architecture=30,10,8" \
  -F "use_bounds=true"
```

**Response:**
```json
{
  "model_id": "ann_model_xyz789_1234567890",
  "metrics": {
    "mae": 1.23,
    "mse": 2.45,
    "rmse": 1.56,
    "r2": 0.95,
    "train_samples": 900,
    "test_samples": 100
  },
  "training_history": {
    "epochs": [0, 1, 2, ...],
    "train_loss": [10.5, 8.3, 6.2, ...],
    "val_loss": [11.2, 9.1, 7.3, ...]
  },
  "loss_plot": "data:image/png;base64,...",
  "feature_columns": ["cr", "cf"],
  "target_column": "t",
  "input_bounds": [[0.1, 2.5], [0.2, 3.0]],
  "status": "success"
}
```

### 3. Make Predictions (Forward Problem)

**Endpoint:** `POST /api/ann/predict`

Use a trained model to predict output from input values.

**Parameters:**
- `model_id`: Model ID from training response
- `input_values`: JSON string of input values (e.g., `{"cr": 1.5, "cf": 2.0}`)

**Request:**
```bash
curl -X POST http://localhost:8000/api/ann/predict \
  -F "model_id=ann_model_xyz789_1234567890" \
  -F 'input_values={"cr": 1.5, "cf": 2.0}'
```

**Response:**
```json
{
  "prediction": 320.45,
  "input_values": {
    "cr": 1.5,
    "cf": 2.0
  },
  "target_name": "t",
  "status": "success"
}
```

### 4. Inverse Problem Solving

**Endpoint:** `POST /api/ann/inverse-solve`

Find input values that produce a desired output (inverse optimization).

**Parameters:**
- `model_id`: Model ID from training response
- `desired_output`: Target output value you want to achieve
- `n_attempts`: Number of optimization attempts with different initializations (default: 5)
- `steps`: Optimization steps per attempt (default: 200)
- `learning_rate`: Learning rate for optimization (default: 0.1)

**Request:**
```bash
curl -X POST http://localhost:8000/api/ann/inverse-solve \
  -F "model_id=ann_model_xyz789_1234567890" \
  -F "desired_output=320" \
  -F "n_attempts=5" \
  -F "steps=200" \
  -F "learning_rate=0.1"
```

**Response:**
```json
{
  "desired_output": 320,
  "best_cr": 1.48,
  "best_cf": 2.03,
  "predicted_output": 319.98,
  "error": 0.02,
  "final_loss": 0.0001,
  "all_attempts": [
    {
      "attempt": 1,
      "final_loss": 0.0001,
      "cr": 1.48,
      "cf": 2.03,
      "predicted_output": 319.98,
      "error": 0.02,
      "history": [...]
    },
    ...
  ],
  "convergence_plot": "data:image/png;base64,...",
  "optimization_time": "2.45s",
  "status": "success"
}
```

### 5. Evaluate Model

**Endpoint:** `GET /api/ann/evaluate/{model_id}`

Get model information and architecture.

**Request:**
```bash
curl -X GET http://localhost:8000/api/ann/evaluate/ann_model_xyz789_1234567890
```

**Response:**
```json
{
  "model_id": "ann_model_xyz789_1234567890",
  "feature_names": ["cr", "cf"],
  "target_name": "t",
  "input_bounds": [[0.1, 2.5], [0.2, 3.0]],
  "architecture": [30, 10, 8, 1],
  "status": "success"
}
```

### 6. List Models

**Endpoint:** `GET /api/ann/models`

List all available trained models.

**Request:**
```bash
curl -X GET http://localhost:8000/api/ann/models
```

**Response:**
```json
{
  "models": [
    {
      "model_id": "ann_model_xyz789_1234567890",
      "feature_names": ["cr", "cf"],
      "target_name": "t",
      "n_features": 2,
      "created": 1703001234.567
    },
    ...
  ],
  "count": 3,
  "status": "success"
}
```

## Example Workflow

### Complete Example: Temperature Prediction

```python
import requests
import json

BASE_URL = "http://localhost:8000/api/ann"

# 1. Upload dataset
with open('temperature_data.xlsx', 'rb') as f:
    upload_response = requests.post(
        f"{BASE_URL}/upload-dataset",
        files={'file': f}
    )
upload_data = upload_response.json()
print(f"Uploaded: {upload_data['filename']}")
print(f"Columns: {upload_data['columns']}")
print(f"Rows: {upload_data['rows']}")

file_id = upload_data['file_id']

# 2. Train model
train_response = requests.post(
    f"{BASE_URL}/train",
    data={
        'file_id': file_id,
        'feature_columns': 'cr,cf',
        'target_column': 't',
        'epochs': 350,
        'batch_size': 16,
        'architecture': '30,10,8'
    }
)
train_data = train_response.json()
print(f"\nModel trained!")
print(f"Model ID: {train_data['model_id']}")
print(f"MAE: {train_data['metrics']['mae']:.4f}")
print(f"RMSE: {train_data['metrics']['rmse']:.4f}")
print(f"R²: {train_data['metrics']['r2']:.4f}")

model_id = train_data['model_id']

# 3. Make prediction (forward problem)
predict_response = requests.post(
    f"{BASE_URL}/predict",
    data={
        'model_id': model_id,
        'input_values': json.dumps({'cr': 1.5, 'cf': 2.0})
    }
)
pred_data = predict_response.json()
print(f"\nPrediction for cr=1.5, cf=2.0:")
print(f"Temperature: {pred_data['prediction']:.2f}")

# 4. Solve inverse problem
inverse_response = requests.post(
    f"{BASE_URL}/inverse-solve",
    data={
        'model_id': model_id,
        'desired_output': 320,
        'n_attempts': 5,
        'steps': 200
    }
)
inverse_data = inverse_response.json()
print(f"\nInverse optimization for T=320:")
print(f"Optimal cr: {inverse_data['best_cr']:.4f}")
print(f"Optimal cf: {inverse_data['best_cf']:.4f}")
print(f"Predicted T: {inverse_data['predicted_output']:.2f}")
print(f"Error: {inverse_data['error']:.4f}")

# 5. Save convergence plot
import base64
convergence_plot = inverse_data['convergence_plot'].split(',')[1]
with open('convergence.png', 'wb') as f:
    f.write(base64.b64decode(convergence_plot))
print("\nSaved convergence plot to convergence.png")
```

## Key Features

### 1. Automatic Data Preprocessing
- Automatic header detection for CSV/Excel files
- StandardScaler normalization for inputs and outputs
- Train/test splitting with configurable ratio

### 2. Flexible Architecture
- Configurable neural network layers
- Default architecture: [30, 10, 8] hidden units
- Uses ReLU activation and Adam optimizer

### 3. Inverse Problem Solving
- Multiple random initializations to avoid local minima
- Constraint handling with penalty functions
- Convergence visualization with plots

### 4. Input Bounds
- Automatically computed from training data
- Used as constraints during inverse optimization
- Prevents unrealistic solutions

## Tips for Best Results

### Training
1. **Data Quality**: Ensure your data is clean and properly formatted
2. **Epochs**: Start with 350 epochs, increase if underfitting
3. **Batch Size**: Use 16 for balanced speed/accuracy, reduce for small datasets
4. **Architecture**: Deeper networks (more layers) for complex relationships

### Inverse Optimization
1. **Multiple Attempts**: Use 5-10 attempts to find global optimum
2. **Steps**: 200 steps usually sufficient, increase for complex problems
3. **Learning Rate**: Default 0.1 works well, reduce if unstable
4. **Bounds**: Always use bounds to ensure realistic solutions

## Error Handling

All endpoints return proper HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `404`: Resource not found (file_id or model_id)
- `500`: Server error (training/optimization failure)

Error responses include detailed messages:
```json
{
  "detail": "Error message describing the issue"
}
```

## Performance Notes

- **Training Time**: Depends on dataset size and epochs
  - Small datasets (<1000 rows): ~10-30 seconds
  - Medium datasets (1000-10000 rows): ~30-120 seconds
  - Large datasets (>10000 rows): Consider reducing epochs

- **Inverse Optimization**: Typically 2-5 seconds for 5 attempts × 200 steps

- **Model Storage**: Models are cached in memory for fast access
  - Disk storage: `/tmp/ann_models/`
  - In-memory cache: Faster subsequent requests

## Comparison with Original Script

| Feature | Original Script | FastAPI API |
|---------|----------------|-------------|
| File Upload | Manual path | HTTP upload |
| Training | Synchronous | Async endpoint |
| Visualization | matplotlib GUI | Base64 plots |
| Inverse Solving | Single attempt | Multiple attempts |
| Constraints | None | Automatic bounds |
| Model Reuse | No | Saved & cached |
| Remote Access | No | Yes (HTTP API) |

## Next Steps

1. Install dependencies: `pip install -r requirements.txt`
2. Start server: `uvicorn main:app --reload`
3. Test with your data using the example workflow above
4. Integrate with your frontend application

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify input data format matches examples
- Ensure all required parameters are provided
- Test with small datasets first
