from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.optimize import curve_fit
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report, confusion_matrix
from io import BytesIO, StringIO
import base64
from typing import List, Optional
import re
import json

router = APIRouter(prefix="/api/regression", tags=["Regression"])

def parse_regression_file(contents: bytes, filename: str) -> pd.DataFrame:
    """Parse uploaded file for regression analysis"""
    ext = filename.lower().split('.')[-1]
    
    try:
        if ext in ['xlsx', 'xls']:
            df = pd.read_excel(BytesIO(contents))
        elif ext == 'csv':
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        elif ext in ['txt', 'lvm']:
            # Try tab-delimited first, then comma
            try:
                df = pd.read_csv(StringIO(contents.decode('utf-8')), delimiter='\t')
            except:
                df = pd.read_csv(StringIO(contents.decode('utf-8')))
        else:
            raise ValueError(f"Unsupported file format: {ext}")
        
        # Auto-generate column names if needed
        if isinstance(df.columns[0], int) or df.columns[0] == 0:
            df.columns = [f"Column_{i}" for i in range(df.shape[1])]
        
        return df
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

def plot_to_base64(fig) -> str:
    """Convert matplotlib figure to base64 string"""
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64

# ============================================================================
# CURVE FIT (3D Surface Fitting)
# ============================================================================
@router.post("/curve-fit")
async def curve_fit_analysis(
    file: UploadFile = File(...),
    x_column: str = Form(...),
    y_column: str = Form(...),
    z_column: str = Form(...),
    model_type: str = Form(...),  # polynomial, exponential, logarithmic, power, custom
    degree: Optional[int] = Form(2),  # For polynomial
    custom_equation: Optional[str] = Form(None)  # For custom models
):
    """
    3D Surface Curve Fitting
    Model types: polynomial, exponential, logarithmic, power, custom
    """
    try:
        contents = await file.read()
        df = parse_regression_file(contents, file.filename)
        
        # Extract columns
        X = df[x_column].values
        Y = df[y_column].values
        Z = df[z_column].values
        
        # Define model based on type
        if model_type == "polynomial":
            def model(XY, *params):
                x, y = XY
                terms = []
                idx = 0
                for i in range(degree + 1):
                    for j in range(degree + 1 - i):
                        terms.append(params[idx] * (x**i) * (y**j))
                        idx += 1
                return sum(terms)
            n_params = (degree + 1) * (degree + 2) // 2
            
        elif model_type == "exponential":
            def model(XY, a, b, c):
                x, y = XY
                return a * np.exp(b*x + c*y)
            n_params = 3
            
        elif model_type == "logarithmic":
            def model(XY, a, b, c):
                x, y = XY
                return a + b*np.log(x) + c*np.log(y)
            n_params = 3
            
        elif model_type == "power":
            def model(XY, a, b, c):
                x, y = XY
                return a * (x**b) * (y**c)
            n_params = 3
            
        elif model_type == "custom" and custom_equation:
            custom_equation = custom_equation.replace("^", "**")
            found_params = sorted(set(re.findall(r"\b[a-z]\b", custom_equation)))
            found_params = [p for p in found_params if p not in ["x", "y"]]
            n_params = len(found_params)
            
            def model(XY, *params):
                x, y = XY
                param_dict = {found_params[i]: params[i] for i in range(n_params)}
                return eval(custom_equation, {"np": np, "x": x, "y": y, **param_dict})
        else:
            raise ValueError("Invalid model type")
        
        # Fit model
        p0 = np.ones(n_params)
        params, _ = curve_fit(model, (X, Y), Z, p0=p0, maxfev=200000)
        Z_pred = model((X, Y), *params)
        
        # Calculate metrics
        r2 = r2_score(Z, Z_pred)
        mse = mean_squared_error(Z, Z_pred)
        
        # Generate equation string
        if model_type == "polynomial":
            idx = 0
            terms = []
            for i in range(degree + 1):
                for j in range(degree + 1 - i):
                    coeff = params[idx]
                    term = f"{coeff:.6f}"
                    if i > 0:
                        term += f"·{x_column}^{i}"
                    if j > 0:
                        term += f"·{y_column}^{j}"
                    terms.append(term)
                    idx += 1
            equation = f"{z_column} = " + " + ".join(terms)
            
        elif model_type == "exponential":
            equation = f"{z_column} = {params[0]:.6f} · exp({params[1]:.6f}·{x_column} + {params[2]:.6f}·{y_column})"
            
        elif model_type == "logarithmic":
            equation = f"{z_column} = {params[0]:.6f} + {params[1]:.6f}·log({x_column}) + {params[2]:.6f}·log({y_column})"
            
        elif model_type == "power":
            equation = f"{z_column} = {params[0]:.6f} · {x_column}^{params[1]:.6f} · {y_column}^{params[2]:.6f}"
            
        else:  # custom
            eq = custom_equation
            for i, val in enumerate(params):
                eq = eq.replace(found_params[i], f"{val:.6f}")
            equation = f"{z_column} = {eq}"
        
        # Create 3D plot
        fig = plt.figure(figsize=(10, 8))
        ax = fig.add_subplot(111, projection='3d')
        
        ax.scatter(X, Y, Z, label="Actual", alpha=0.6)
        
        x_grid = np.linspace(X.min(), X.max(), 40)
        y_grid = np.linspace(Y.min(), Y.max(), 40)
        xg, yg = np.meshgrid(x_grid, y_grid)
        zg = model((xg, yg), *params)
        
        ax.plot_surface(xg, yg, zg, alpha=0.4, cmap='viridis')
        
        ax.set_xlabel(x_column, fontsize=12)
        ax.set_ylabel(y_column, fontsize=12)
        ax.set_zlabel(z_column, fontsize=12)
        ax.set_title(f"3D Surface Fit - {model_type.capitalize()}", fontsize=14)
        ax.legend()
        
        plot_base64 = plot_to_base64(fig)
        
        return {
            "r2_score": float(r2),
            "mse": float(mse),
            "equation": equation,
            "parameters": [float(p) for p in params],
            "plot": plot_base64,
            "model_type": model_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Curve fit error: {str(e)}")

# ============================================================================
# LINEAR REGRESSION
# ============================================================================
@router.post("/linear")
async def linear_regression_analysis(
    file: UploadFile = File(...),
    x_columns: str = Form(...),  # Comma-separated
    y_columns: str = Form(...),  # Comma-separated
    test_size: float = Form(0.2)
):
    """
    Multi-input, multi-output linear regression
    """
    try:
        contents = await file.read()
        df = parse_regression_file(contents, file.filename)
        
        # Parse column names
        x_cols = [c.strip() for c in x_columns.split(',')]
        y_cols = [c.strip() for c in y_columns.split(',')]
        
        # Extract data
        X = df[x_cols]
        y = df[y_cols]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        # Train model
        model = LinearRegression()
        model.fit(X_train, y_train)
        
        # Predict
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        r2 = r2_score(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        
        # Generate equations
        equations = []
        for i, target in enumerate(y_cols):
            eq = f"{target} = {model.intercept_[i]:.4f}"
            for coef, feature in zip(model.coef_[i], x_cols):
                eq += f" + ({coef:.4f} × {feature})"
            equations.append(eq)
        
        # Create plots for each feature-target combination
        plots = []
        X_test_np = np.array(X_test)
        y_test_np = np.array(y_test)
        y_pred_np = np.array(y_pred)
        
        for f_idx, feature in enumerate(x_cols):
            for i, target in enumerate(y_cols):
                fig, ax = plt.subplots(figsize=(8, 6))
                
                # Sort by feature for clean plots
                sorted_idx = np.argsort(X_test_np[:, f_idx])
                
                ax.scatter(X_test_np[sorted_idx, f_idx], y_test_np[sorted_idx, i], 
                          label="Actual", alpha=0.6)
                ax.scatter(X_test_np[sorted_idx, f_idx], y_pred_np[sorted_idx, i], 
                          label="Predicted", alpha=0.6)
                
                ax.set_xlabel(feature, fontsize=12)
                ax.set_ylabel(target, fontsize=12)
                ax.set_title(f"{target} vs {feature}", fontsize=14)
                ax.legend()
                ax.grid(True, alpha=0.3)
                
                plots.append({
                    "feature": feature,
                    "target": target,
                    "plot": plot_to_base64(fig)
                })
        
        return {
            "r2_score": float(r2),
            "mse": float(mse),
            "coefficients": model.coef_.tolist(),
            "intercepts": model.intercept_.tolist(),
            "equations": equations,
            "plots": plots,
            "x_columns": x_cols,
            "y_columns": y_cols
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Linear regression error: {str(e)}")

# ============================================================================
# LOGISTIC REGRESSION
# ============================================================================
@router.post("/logistic")
async def logistic_regression_analysis(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),  # Auto-detect if not provided
    test_sizes: str = Form("0.2,0.25,0.3")  # Comma-separated test sizes to try
):
    """
    Automated logistic regression with hyperparameter tuning
    """
    try:
        contents = await file.read()
        df = parse_regression_file(contents, file.filename)
        
        # Auto-detect target column if not provided
        if not target_column:
            for col in df.columns[::-1]:
                if df[col].nunique() <= 20:
                    target_column = col
                    break
            if not target_column:
                target_column = df.columns[-1]
        
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Encode target if needed
        le = None
        if y.dtype == "object":
            le = LabelEncoder()
            y = le.fit_transform(y)
        
        num_classes = len(np.unique(y))
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Grid search across test sizes
        test_sizes_list = [float(s.strip()) for s in test_sizes.split(',')]
        
        best_score = 0
        best_model = None
        best_params = None
        best_split = None
        best_X_test = None
        best_y_test = None
        best_y_pred = None
        
        for test_size in test_sizes_list:
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=test_size, random_state=42
            )
            
            param_grid = {
                "C": [0.01, 0.1, 1, 5, 10],
                "solver": ["lbfgs", "newton-cg", "saga"],
                "max_iter": [1000, 2000, 3000]
            }
            
            model = LogisticRegression()
            grid = GridSearchCV(model, param_grid, cv=5, scoring="accuracy")
            grid.fit(X_train, y_train)
            
            preds = grid.best_estimator_.predict(X_test)
            acc = accuracy_score(y_test, preds)
            
            if acc > best_score:
                best_score = acc
                best_model = grid.best_estimator_
                best_params = grid.best_params_
                best_split = test_size
                best_X_test = X_test
                best_y_test = y_test
                best_y_pred = preds
        
        # Generate classification report
        report = classification_report(best_y_test, best_y_pred, output_dict=True)
        
        # Create confusion matrix plot
        cm = confusion_matrix(best_y_test, best_y_pred)
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax)
        ax.set_title("Confusion Matrix", fontsize=14)
        ax.set_xlabel("Predicted Class", fontsize=12)
        ax.set_ylabel("True Class", fontsize=12)
        cm_plot = plot_to_base64(fig)
        
        # Feature importance plot
        importance = np.mean(np.abs(best_model.coef_), axis=0)
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.barh(X.columns, importance)
        ax.set_title("Feature Importance", fontsize=14)
        ax.set_xlabel("Impact Strength", fontsize=12)
        ax.set_ylabel("Variables", fontsize=12)
        ax.grid(True, alpha=0.3)
        importance_plot = plot_to_base64(fig)
        
        # Generate equations
        coef = best_model.coef_
        intercept = best_model.intercept_
        equations = []
        
        for cls in range(num_classes):
            eq = f"logit(Class {cls}) = {intercept[cls]:.4f} "
            for i, col in enumerate(X.columns):
                eq += f"+ ({coef[cls][i]:.4f} × {col}) "
            equations.append(eq)
        
        # Feature probability plots
        probs = best_model.predict_proba(X_scaled)
        prob_plots = []
        
        for i, col in enumerate(X.columns):
            fig, ax = plt.subplots(figsize=(8, 6))
            for cls in range(num_classes):
                ax.scatter(df[col], probs[:, cls], alpha=0.5, label=f"Class {cls}")
            ax.set_xlabel(col, fontsize=12)
            ax.set_ylabel("Predicted Probability", fontsize=12)
            ax.set_title(f"{col} vs Class Probability", fontsize=14)
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            prob_plots.append({
                "feature": col,
                "plot": plot_to_base64(fig)
            })
        
        return {
            "accuracy": float(best_score),
            "best_params": best_params,
            "best_test_size": float(best_split),
            "num_classes": int(num_classes),
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "confusion_matrix_plot": cm_plot,
            "feature_importance": importance.tolist(),
            "feature_importance_plot": importance_plot,
            "equations": equations,
            "probability_plots": prob_plots,
            "target_column": target_column,
            "feature_columns": X.columns.tolist()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logistic regression error: {str(e)}")

# ============================================================================
# POLYNOMIAL REGRESSION
# ============================================================================
@router.post("/polynomial")
async def polynomial_regression_analysis(
    file: UploadFile = File(...),
    x_columns: str = Form(...),  # Comma-separated
    y_columns: str = Form(...),  # Comma-separated
    degree: int = Form(2),
    test_size: float = Form(0.2)
):
    """
    Polynomial regression with feature expansion
    """
    try:
        contents = await file.read()
        df = parse_regression_file(contents, file.filename)
        
        # Parse column names
        x_cols = [c.strip() for c in x_columns.split(',')]
        y_cols = [c.strip() for c in y_columns.split(',')]
        
        # Extract data
        X = df[x_cols]
        y = df[y_cols]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        # Polynomial feature expansion
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_train_poly = poly.fit_transform(X_train)
        X_test_poly = poly.transform(X_test)
        
        # Train model
        model = LinearRegression()
        model.fit(X_train_poly, y_train)
        
        # Predict
        y_pred = model.predict(X_test_poly)
        
        # Calculate metrics
        r2 = r2_score(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        
        # Get feature names
        feature_names = poly.get_feature_names_out(x_cols)
        
        # Generate equations
        equations = []
        for i, target in enumerate(y_cols):
            eq = f"{target} = {model.intercept_[i]:.4f}"
            for coef, name in zip(model.coef_[i], feature_names):
                if abs(coef) > 1e-8:  # Avoid printing near-zero terms
                    eq += f" + ({coef:.4f} × {name})"
            equations.append(eq)
        
        # Create plots
        plots = []
        X_test_np = np.array(X_test)
        y_test_np = np.array(y_test)
        y_pred_np = np.array(y_pred)
        
        for f_idx, feature in enumerate(x_cols):
            for i, target in enumerate(y_cols):
                fig, ax = plt.subplots(figsize=(8, 6))
                
                # Sort by feature
                sorted_idx = np.argsort(X_test_np[:, f_idx])
                
                ax.plot(X_test_np[sorted_idx, f_idx], y_test_np[sorted_idx, i], 
                       'o-', label="Actual", alpha=0.6)
                ax.plot(X_test_np[sorted_idx, f_idx], y_pred_np[sorted_idx, i], 
                       'o-', label="Predicted", alpha=0.6)
                
                ax.set_xlabel(feature, fontsize=12)
                ax.set_ylabel(target, fontsize=12)
                ax.set_title(f"{target} vs {feature} (Degree {degree})", fontsize=14)
                ax.legend()
                ax.grid(True, alpha=0.3)
                
                plots.append({
                    "feature": feature,
                    "target": target,
                    "plot": plot_to_base64(fig)
                })
        
        return {
            "r2_score": float(r2),
            "mse": float(mse),
            "degree": degree,
            "coefficients": model.coef_.tolist(),
            "intercepts": model.intercept_.tolist(),
            "equations": equations,
            "feature_names": feature_names.tolist(),
            "plots": plots,
            "x_columns": x_cols,
            "y_columns": y_cols
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Polynomial regression error: {str(e)}")
