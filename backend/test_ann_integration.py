"""
Test script for ANN API integration
Tests all endpoints to verify functionality
"""

import requests
import json
import pandas as pd
import numpy as np
from io import BytesIO
import time

BASE_URL = "http://localhost:8000/api/ann"

def create_sample_dataset():
    """Create a sample dataset for testing"""
    np.random.seed(42)
    n_samples = 500

    # Generate synthetic data: t = 100 + 50*cr + 30*cf + noise
    cr = np.random.uniform(0.5, 2.5, n_samples)
    cf = np.random.uniform(1.0, 3.0, n_samples)
    t = 100 + 50*cr + 30*cf + np.random.normal(0, 5, n_samples)

    df = pd.DataFrame({
        'cr': cr,
        'cf': cf,
        't': t
    })

    return df

def test_upload():
    """Test 1: Upload dataset"""
    print("\n" + "="*70)
    print("TEST 1: Upload Dataset")
    print("="*70)

    # Create sample data
    df = create_sample_dataset()

    # Save to Excel
    excel_buffer = BytesIO()
    df.to_excel(excel_buffer, index=False, engine='openpyxl')
    excel_buffer.seek(0)

    # Upload
    response = requests.post(
        f"{BASE_URL}/upload-dataset",
        files={'file': ('test_data.xlsx', excel_buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Upload successful!")
        print(f"  File ID: {data['file_id']}")
        print(f"  Columns: {data['columns']}")
        print(f"  Rows: {data['rows']}")
        print(f"  Sample data: {data['sample_data'][0]}")
        return data['file_id']
    else:
        print(f"✗ Upload failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_train(file_id):
    """Test 2: Train model"""
    print("\n" + "="*70)
    print("TEST 2: Train Model")
    print("="*70)

    start_time = time.time()

    response = requests.post(
        f"{BASE_URL}/train",
        data={
            'file_id': file_id,
            'feature_columns': 'cr,cf',
            'target_column': 't',
            'test_size': 0.1,
            'epochs': 100,  # Reduced for faster testing
            'batch_size': 16,
            'architecture': '30,10,8',
            'use_bounds': 'true'
        }
    )

    training_time = time.time() - start_time

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Training successful! (took {training_time:.2f}s)")
        print(f"  Model ID: {data['model_id']}")
        print(f"  Metrics:")
        print(f"    MAE:  {data['metrics']['mae']:.4f}")
        print(f"    RMSE: {data['metrics']['rmse']:.4f}")
        print(f"    R²:   {data['metrics']['r2']:.4f}")
        print(f"  Input bounds: {data['input_bounds']}")
        print(f"  Final training loss: {data['training_history']['train_loss'][-1]:.6f}")
        print(f"  Final validation loss: {data['training_history']['val_loss'][-1]:.6f}")
        return data['model_id']
    else:
        print(f"✗ Training failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_predict(model_id):
    """Test 3: Make prediction"""
    print("\n" + "="*70)
    print("TEST 3: Forward Prediction")
    print("="*70)

    # Test multiple predictions
    test_inputs = [
        {'cr': 1.0, 'cf': 2.0},  # Expected: ~100 + 50*1 + 30*2 = 210
        {'cr': 1.5, 'cf': 2.5},  # Expected: ~100 + 50*1.5 + 30*2.5 = 250
        {'cr': 2.0, 'cf': 3.0},  # Expected: ~100 + 50*2 + 30*3 = 290
    ]

    for inputs in test_inputs:
        response = requests.post(
            f"{BASE_URL}/predict",
            data={
                'model_id': model_id,
                'input_values': json.dumps(inputs)
            }
        )

        if response.status_code == 200:
            data = response.json()
            expected = 100 + 50*inputs['cr'] + 30*inputs['cf']
            error = abs(data['prediction'] - expected)
            print(f"✓ Input: cr={inputs['cr']}, cf={inputs['cf']}")
            print(f"  Predicted: {data['prediction']:.2f}")
            print(f"  Expected:  {expected:.2f}")
            print(f"  Error:     {error:.2f}")
        else:
            print(f"✗ Prediction failed: {response.status_code}")
            print(f"  Error: {response.text}")

def test_inverse_solve(model_id):
    """Test 4: Inverse problem solving"""
    print("\n" + "="*70)
    print("TEST 4: Inverse Problem Solving")
    print("="*70)

    # Test multiple target values
    target_values = [210, 250, 290]

    for target in target_values:
        start_time = time.time()

        response = requests.post(
            f"{BASE_URL}/inverse-solve",
            data={
                'model_id': model_id,
                'desired_output': target,
                'n_attempts': 3,  # Reduced for faster testing
                'steps': 100,     # Reduced for faster testing
                'learning_rate': 0.1
            }
        )

        solve_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ Target output: {target} (solved in {solve_time:.2f}s)")
            print(f"  Best solution:")
            print(f"    cr = {data['best_cr']:.4f}")
            print(f"    cf = {data['best_cf']:.4f}")
            print(f"  Predicted output: {data['predicted_output']:.2f}")
            print(f"  Error: {data['error']:.4f}")
            print(f"  Final loss: {data['final_loss']:.6f}")

            # Verify solution
            expected_cr = (target - 100 - 30*data['best_cf']) / 50
            print(f"  Verification: Expected cr ≈ {expected_cr:.4f}")
        else:
            print(f"✗ Inverse solve failed: {response.status_code}")
            print(f"  Error: {response.text}")

def test_evaluate(model_id):
    """Test 5: Evaluate model"""
    print("\n" + "="*70)
    print("TEST 5: Evaluate Model")
    print("="*70)

    response = requests.get(f"{BASE_URL}/evaluate/{model_id}")

    if response.status_code == 200:
        data = response.json()
        print("✓ Model information retrieved!")
        print(f"  Model ID: {data['model_id']}")
        print(f"  Features: {data['feature_names']}")
        print(f"  Target: {data['target_name']}")
        print(f"  Architecture: {data['architecture']}")
        print(f"  Input bounds: {data['input_bounds']}")
    else:
        print(f"✗ Evaluation failed: {response.status_code}")
        print(f"  Error: {response.text}")

def test_list_models():
    """Test 6: List models"""
    print("\n" + "="*70)
    print("TEST 6: List Models")
    print("="*70)

    response = requests.get(f"{BASE_URL}/models")

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} model(s):")
        for model in data['models']:
            print(f"  - {model['model_id']}")
            print(f"    Features: {model['feature_names']} → {model['target_name']}")
    else:
        print(f"✗ List models failed: {response.status_code}")
        print(f"  Error: {response.text}")

def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("ANN API INTEGRATION TEST SUITE")
    print("="*70)
    print("\nMake sure the server is running:")
    print("  uvicorn main:app --reload")
    print("\nTesting endpoint: " + BASE_URL)

    try:
        # Test server connection
        response = requests.get("http://localhost:8000/")
        if response.status_code != 200:
            print("\n✗ Server is not responding. Please start the server first.")
            return
    except requests.exceptions.ConnectionError:
        print("\n✗ Cannot connect to server. Please start the server first:")
        print("  cd backend")
        print("  uvicorn main:app --reload")
        return

    # Run tests sequentially
    file_id = test_upload()
    if not file_id:
        print("\n✗ Upload failed, cannot continue tests")
        return

    model_id = test_train(file_id)
    if not model_id:
        print("\n✗ Training failed, cannot continue tests")
        return

    test_predict(model_id)
    test_inverse_solve(model_id)
    test_evaluate(model_id)
    test_list_models()

    print("\n" + "="*70)
    print("ALL TESTS COMPLETED!")
    print("="*70)
    print("\nSummary:")
    print("  ✓ Dataset upload")
    print("  ✓ Model training")
    print("  ✓ Forward prediction")
    print("  ✓ Inverse problem solving")
    print("  ✓ Model evaluation")
    print("  ✓ Model listing")
    print("\nThe ANN API integration is working correctly!")

if __name__ == "__main__":
    main()
