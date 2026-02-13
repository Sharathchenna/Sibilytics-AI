import base64
import hashlib
import os
import re
from io import BytesIO, StringIO
from pathlib import Path
from typing import Callable, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import LabelEncoder, PolynomialFeatures, StandardScaler
from scipy.optimize import curve_fit


router = APIRouter(prefix="/api/regression", tags=["Regression"])

CACHE_DIR = Path("/tmp/regression_cache")
CACHE_DIR.mkdir(exist_ok=True)


def _to_base64(fig: plt.Figure) -> str:
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=140, bbox_inches="tight")
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return encoded


def _split_csv(values: str) -> List[str]:
    return [v.strip() for v in values.split(",") if v.strip()]


def _detect_header(content_str: str, delimiter: str) -> bool:
    lines = [line for line in content_str.splitlines() if line.strip()]
    if len(lines) < 2:
        return True

    first = lines[0].split(delimiter)
    second = lines[1].split(delimiter)

    def is_num(cell: str) -> bool:
        try:
            float(cell.strip())
            return True
        except ValueError:
            return False

    first_numeric = sum(1 for cell in first if is_num(cell))
    second_numeric = sum(1 for cell in second if is_num(cell))

    if first_numeric == len(first):
        return False
    if first_numeric < second_numeric:
        return True
    if first_numeric == 0 and second_numeric > 0:
        return True
    return True


def _parse_text_table(content_str: str) -> pd.DataFrame:
    best_df: Optional[pd.DataFrame] = None
    delimiters = [",", "\t", ";", "|"]
    for delimiter in delimiters:
        try:
            has_header = _detect_header(content_str, delimiter)
            if has_header:
                df = pd.read_csv(StringIO(content_str), delimiter=delimiter)
            else:
                df = pd.read_csv(StringIO(content_str), delimiter=delimiter, header=None)
            if df.shape[1] > 1:
                best_df = df
                break
            if best_df is None:
                best_df = df
        except Exception:
            continue

    if best_df is None:
        raise ValueError("Unable to parse file with supported delimiters.")
    return best_df


def _load_dataframe(contents: bytes, filename: str) -> pd.DataFrame:
    ext = os.path.splitext(filename)[1].lower()

    if ext in [".xlsx", ".xls"]:
        df_preview = pd.read_excel(BytesIO(contents), nrows=2)
        first_col = str(df_preview.columns[0]) if len(df_preview.columns) else ""
        header_is_numeric = False
        try:
            float(first_col)
            header_is_numeric = True
        except ValueError:
            header_is_numeric = False

        if header_is_numeric:
            df = pd.read_excel(BytesIO(contents), header=None)
        else:
            df = pd.read_excel(BytesIO(contents))
    elif ext in [".csv", ".txt", ".lvm"]:
        content_str = contents.decode("utf-8", errors="ignore")
        if content_str.startswith("LabVIEW Measurement"):
            lines = content_str.splitlines()
            start_idx = 0
            for idx, line in enumerate(lines):
                if "***End_of_Header***" in line:
                    start_idx = idx + 1
            content_str = "\n".join(lines[start_idx:])
        df = _parse_text_table(content_str)
    else:
        raise ValueError("Unsupported file format. Use xlsx, xls, csv, txt, or lvm.")

    if isinstance(df.columns[0], int):
        df.columns = [f"Column_{i + 1}" for i in range(df.shape[1])]
    else:
        df.columns = [str(c) for c in df.columns]

    df = df.dropna(how="all", axis=0).dropna(how="all", axis=1)
    return df


def _load_cached_dataset(file_id: str) -> pd.DataFrame:
    cache_path = CACHE_DIR / file_id
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset not found for file_id={file_id}")
    contents = cache_path.read_bytes()
    filename = file_id.split("_", 1)[1] if "_" in file_id else file_id
    return _load_dataframe(contents, filename)


def _ensure_columns(df: pd.DataFrame, columns: List[str]) -> None:
    missing = [c for c in columns if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown columns: {', '.join(missing)}")


def _coerce_numeric(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    converted = df.copy()
    for col in columns:
        converted[col] = pd.to_numeric(converted[col], errors="coerce")
    converted = converted.dropna(subset=columns)
    if converted.empty:
        raise HTTPException(status_code=400, detail="No valid numeric rows found for selected columns.")
    return converted


def _evaluate_curve_choice(
    choice: str,
    x_col: str,
    y_col: str,
    degree: int,
    custom_equation: Optional[str],
) -> Tuple[Callable, int, str]:
    model_type = choice.lower()

    if model_type == "polynomial":
        if degree < 1:
            raise HTTPException(status_code=400, detail="Polynomial degree must be >= 1.")

        def poly_model(xy, *params):
            x, y = xy
            terms = []
            idx = 0
            for i in range(degree + 1):
                for j in range(degree + 1 - i):
                    terms.append(params[idx] * (x ** i) * (y ** j))
                    idx += 1
            return sum(terms)

        n_params = (degree + 1) * (degree + 2) // 2
        return poly_model, n_params, "polynomial"

    if model_type == "exponential":
        def exp_model(xy, a, b, c):
            x, y = xy
            return a * np.exp(b * x + c * y)

        return exp_model, 3, "exponential"

    if model_type == "logarithmic":
        def log_model(xy, a, b, c):
            x, y = xy
            return a + b * np.log(x) + c * np.log(y)

        return log_model, 3, "logarithmic"

    if model_type == "power":
        def power_model(xy, a, b, c):
            x, y = xy
            return a * (x ** b) * (y ** c)

        return power_model, 3, "power"

    if model_type == "custom":
        if not custom_equation:
            raise HTTPException(status_code=400, detail="custom_equation is required for custom model.")

        expr = custom_equation.replace("^", "**")
        found_params = sorted(set(re.findall(r"\b[a-z]\b", expr)))
        found_params = [p for p in found_params if p not in ["x", "y"]]
        if not found_params:
            raise HTTPException(status_code=400, detail="Custom equation must include parameters like a, b, c.")

        def custom_model(xy, *params):
            x, y = xy
            param_dict = {found_params[i]: params[i] for i in range(len(found_params))}
            return eval(expr, {"np": np, "x": x, "y": y, **param_dict})

        custom_model._params = found_params  # type: ignore[attr-defined]
        custom_model._expr = expr  # type: ignore[attr-defined]
        return custom_model, len(found_params), "custom"

    raise HTTPException(
        status_code=400,
        detail="curve_model must be one of: polynomial, exponential, logarithmic, power, custom.",
    )


@router.options("/upload-dataset")
async def options_upload_dataset():
    return {}


@router.post("/upload-dataset")
async def upload_regression_dataset(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = _load_dataframe(contents, file.filename)

        file_hash = hashlib.sha256(contents).hexdigest()[:16]
        file_id = f"reg_{file_hash}_{file.filename}"
        (CACHE_DIR / file_id).write_bytes(contents)

        numeric_columns = [
            c for c in df.columns if pd.to_numeric(df[c], errors="coerce").notna().sum() > 0
        ]
        categorical_columns = [c for c in df.columns if c not in numeric_columns]

        return {
            "status": "success",
            "file_id": file_id,
            "filename": file.filename,
            "rows": int(df.shape[0]),
            "columns": df.columns.tolist(),
            "numeric_columns": numeric_columns,
            "categorical_columns": categorical_columns,
            "sample_data": df.head(10).fillna("").to_dict("records"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(exc)}")


@router.post("/linear")
async def run_linear_regression(
    file_id: str = Form(...),
    x_columns: str = Form(...),
    y_columns: str = Form(...),
    test_size: float = Form(0.2),
    random_state: int = Form(42),
):
    try:
        x_cols = _split_csv(x_columns)
        y_cols = _split_csv(y_columns)
        if not x_cols or not y_cols:
            raise HTTPException(status_code=400, detail="x_columns and y_columns are required.")

        df = _load_cached_dataset(file_id)
        _ensure_columns(df, x_cols + y_cols)
        work_df = _coerce_numeric(df, x_cols + y_cols)

        X = work_df[x_cols]
        y = work_df[y_cols]

        if len(work_df) < 5:
            raise HTTPException(status_code=400, detail="Not enough valid rows after cleaning.")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        model = LinearRegression()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        r2 = float(r2_score(y_test, y_pred))
        mse = float(mean_squared_error(y_test, y_pred))

        equations = []
        for i, target in enumerate(y_cols):
            eq = f"{target} = {model.intercept_[i]:.6f}"
            for coef, feature in zip(model.coef_[i], x_cols):
                eq += f" + ({coef:.6f} * {feature})"
            equations.append(eq)

        plots = {}
        x_test_np = np.asarray(X_test)
        y_test_np = np.asarray(y_test)
        y_pred_np = np.asarray(y_pred)
        plot_count = 0
        for f_idx, feature in enumerate(x_cols):
            sorted_idx = np.argsort(x_test_np[:, f_idx])
            xs = x_test_np[sorted_idx, f_idx]
            ys_actual = y_test_np[sorted_idx]
            ys_pred = y_pred_np[sorted_idx]

            for i, target in enumerate(y_cols):
                if plot_count >= 8:
                    break
                fig, ax = plt.subplots(figsize=(7, 4))
                ax.scatter(xs, ys_actual[:, i], label="Actual", alpha=0.8)
                ax.scatter(xs, ys_pred[:, i], label="Predicted", alpha=0.8)
                ax.set_xlabel(feature)
                ax.set_ylabel(target)
                ax.set_title(f"{target} vs {feature}")
                ax.legend()
                plots[f"{target}_vs_{feature}"] = _to_base64(fig)
                plot_count += 1

        return {
            "status": "success",
            "model": "linear_regression",
            "metrics": {"r2": r2, "mse": mse},
            "x_columns": x_cols,
            "y_columns": y_cols,
            "coefficients": np.asarray(model.coef_).tolist(),
            "intercepts": np.asarray(model.intercept_).tolist(),
            "equations": equations,
            "plots": plots,
            "rows_used": int(len(work_df)),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Linear regression failed: {str(exc)}")


@router.post("/polynomial")
async def run_polynomial_regression(
    file_id: str = Form(...),
    x_columns: str = Form(...),
    y_columns: str = Form(...),
    degree: int = Form(...),
    test_size: float = Form(0.2),
    random_state: int = Form(42),
):
    try:
        x_cols = _split_csv(x_columns)
        y_cols = _split_csv(y_columns)
        if not x_cols or not y_cols:
            raise HTTPException(status_code=400, detail="x_columns and y_columns are required.")
        if degree < 1:
            raise HTTPException(status_code=400, detail="degree must be >= 1.")

        df = _load_cached_dataset(file_id)
        _ensure_columns(df, x_cols + y_cols)
        work_df = _coerce_numeric(df, x_cols + y_cols)

        X = work_df[x_cols]
        y = work_df[y_cols]

        if len(work_df) < 5:
            raise HTTPException(status_code=400, detail="Not enough valid rows after cleaning.")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        poly = PolynomialFeatures(degree=degree, include_bias=False)
        X_train_poly = poly.fit_transform(X_train)
        X_test_poly = poly.transform(X_test)

        model = LinearRegression()
        model.fit(X_train_poly, y_train)
        y_pred = model.predict(X_test_poly)

        r2 = float(r2_score(y_test, y_pred))
        mse = float(mean_squared_error(y_test, y_pred))

        feature_names = poly.get_feature_names_out(x_cols)
        equations = []
        for i, target in enumerate(y_cols):
            eq = f"{target} = {model.intercept_[i]:.6f}"
            for coef, name in zip(model.coef_[i], feature_names):
                if abs(coef) > 1e-10:
                    eq += f" + ({coef:.6f} * {name})"
            equations.append(eq)

        plots = {}
        x_test_np = np.asarray(X_test)
        y_test_np = np.asarray(y_test)
        y_pred_np = np.asarray(y_pred)
        plot_count = 0
        for f_idx, feature in enumerate(x_cols):
            sorted_idx = np.argsort(x_test_np[:, f_idx])
            xs = x_test_np[sorted_idx, f_idx]
            ys_actual = y_test_np[sorted_idx]
            ys_pred = y_pred_np[sorted_idx]

            for i, target in enumerate(y_cols):
                if plot_count >= 8:
                    break
                fig, ax = plt.subplots(figsize=(7, 4))
                ax.plot(xs, ys_actual[:, i], label="Actual")
                ax.plot(xs, ys_pred[:, i], label="Predicted")
                ax.set_xlabel(feature)
                ax.set_ylabel(target)
                ax.set_title(f"{target} vs {feature} (Degree {degree})")
                ax.legend()
                plots[f"{target}_vs_{feature}"] = _to_base64(fig)
                plot_count += 1

        return {
            "status": "success",
            "model": "polynomial_regression",
            "metrics": {"r2": r2, "mse": mse},
            "degree": degree,
            "x_columns": x_cols,
            "y_columns": y_cols,
            "equations": equations,
            "feature_terms": feature_names.tolist(),
            "plots": plots,
            "rows_used": int(len(work_df)),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Polynomial regression failed: {str(exc)}")


@router.post("/logistic")
async def run_logistic_regression(
    file_id: str = Form(...),
    target_column: Optional[str] = Form(None),
    feature_columns: Optional[str] = Form(None),
    test_sizes: str = Form("0.2,0.25,0.3"),
    c_values: str = Form("0.01,0.1,1,5,10"),
    solvers: str = Form("lbfgs,newton-cg,saga"),
    max_iters: str = Form("1000,2000,3000"),
):
    try:
        df = _load_cached_dataset(file_id)
        columns = df.columns.tolist()
        if not columns:
            raise HTTPException(status_code=400, detail="Dataset has no columns.")

        chosen_target = target_column.strip() if target_column else None
        if chosen_target:
            if chosen_target not in df.columns:
                raise HTTPException(status_code=400, detail=f"Unknown target column: {chosen_target}")
        else:
            chosen_target = None
            for col in reversed(columns):
                if df[col].nunique(dropna=True) <= 20:
                    chosen_target = col
                    break
            if chosen_target is None:
                chosen_target = columns[-1]

        if feature_columns:
            chosen_features = _split_csv(feature_columns)
        else:
            chosen_features = [c for c in columns if c != chosen_target]

        if not chosen_features:
            raise HTTPException(status_code=400, detail="No feature columns available.")

        _ensure_columns(df, chosen_features + [chosen_target])

        work_df = df[chosen_features + [chosen_target]].dropna()
        if work_df.empty:
            raise HTTPException(status_code=400, detail="No usable rows after dropping missing values.")

        X = pd.get_dummies(work_df[chosen_features], drop_first=False)
        y_series = work_df[chosen_target]

        label_encoder = None
        if y_series.dtype == "object" or str(y_series.dtype).startswith("category"):
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(y_series.astype(str))
        else:
            y = pd.to_numeric(y_series, errors="coerce")
            if y.isna().any():
                raise HTTPException(status_code=400, detail="Target column contains non-numeric mixed values.")
            y = y.to_numpy()

        classes = np.unique(y)
        if len(classes) < 2:
            raise HTTPException(status_code=400, detail="Target must contain at least 2 classes.")

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        split_values = [float(v) for v in _split_csv(test_sizes)]
        c_list = [float(v) for v in _split_csv(c_values)]
        solver_list = _split_csv(solvers)
        iter_list = [int(v) for v in _split_csv(max_iters)]

        best_score = -1.0
        best_model = None
        best_params = None
        best_split = None
        final_y_test = None
        final_y_pred = None

        for split in split_values:
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled,
                y,
                test_size=split,
                random_state=42,
                stratify=y if len(np.unique(y)) > 1 else None,
            )

            grid = GridSearchCV(
                LogisticRegression(),
                param_grid={"C": c_list, "solver": solver_list, "max_iter": iter_list},
                cv=5,
                scoring="accuracy",
                n_jobs=1,
            )
            grid.fit(X_train, y_train)

            preds = grid.best_estimator_.predict(X_test)
            acc = accuracy_score(y_test, preds)

            if acc > best_score:
                best_score = float(acc)
                best_model = grid.best_estimator_
                best_params = grid.best_params_
                best_split = split
                final_y_test = y_test
                final_y_pred = preds

        if best_model is None or final_y_test is None or final_y_pred is None or best_split is None:
            raise HTTPException(status_code=400, detail="Could not train logistic regression model.")

        report = classification_report(final_y_test, final_y_pred, output_dict=True, zero_division=0)
        cm = confusion_matrix(final_y_test, final_y_pred)

        fig_cm, ax_cm = plt.subplots(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax_cm)
        ax_cm.set_title("Confusion Matrix")
        ax_cm.set_xlabel("Predicted Class")
        ax_cm.set_ylabel("True Class")
        cm_plot = _to_base64(fig_cm)

        coef = np.asarray(best_model.coef_)
        intercept = np.asarray(best_model.intercept_)
        importance = np.mean(np.abs(coef), axis=0)
        feature_names = X.columns.tolist()

        fig_imp, ax_imp = plt.subplots(figsize=(8, 5))
        order = np.argsort(importance)
        ax_imp.barh(np.array(feature_names)[order], importance[order], color="#2563eb")
        ax_imp.set_title("Feature Importance")
        ax_imp.set_xlabel("Impact Strength")
        importance_plot = _to_base64(fig_imp)

        equations = []
        if coef.shape[0] == 1 and len(best_model.classes_) == 2:
            positive_class = best_model.classes_[1]
            eq = f"logit(class={positive_class}) = {intercept[0]:.6f}"
            for coef_val, col_name in zip(coef[0], feature_names):
                eq += f" + ({coef_val:.6f} * {col_name})"
            equations.append(eq)
        else:
            for idx, cls in enumerate(best_model.classes_):
                eq = f"logit(class={cls}) = {intercept[idx]:.6f}"
                for coef_val, col_name in zip(coef[idx], feature_names):
                    eq += f" + ({coef_val:.6f} * {col_name})"
                equations.append(eq)

        class_mapping = None
        if label_encoder is not None:
            class_mapping = {int(i): label for i, label in enumerate(label_encoder.classes_)}

        return {
            "status": "success",
            "model": "logistic_regression",
            "target_column": chosen_target,
            "feature_columns": chosen_features,
            "expanded_feature_columns": feature_names,
            "num_classes": int(len(classes)),
            "best_accuracy": best_score,
            "best_params": best_params,
            "best_split": best_split,
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "confusion_matrix_plot": cm_plot,
            "feature_importance": dict(zip(feature_names, importance.tolist())),
            "feature_importance_plot": importance_plot,
            "equations": equations,
            "class_mapping": class_mapping,
            "rows_used": int(len(work_df)),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Logistic regression failed: {str(exc)}")


@router.post("/curve-fit")
async def run_curve_fit(
    file_id: str = Form(...),
    x_column: str = Form(...),
    y_column: str = Form(...),
    z_column: str = Form(...),
    curve_model: str = Form("polynomial"),
    degree: int = Form(2),
    custom_equation: Optional[str] = Form(None),
):
    try:
        df = _load_cached_dataset(file_id)
        selected = [x_column, y_column, z_column]
        _ensure_columns(df, selected)
        work_df = _coerce_numeric(df, selected)

        x = work_df[x_column].to_numpy()
        y = work_df[y_column].to_numpy()
        z = work_df[z_column].to_numpy()

        if len(work_df) < 5:
            raise HTTPException(status_code=400, detail="Not enough valid rows after cleaning.")

        model_fn, n_params, resolved_model = _evaluate_curve_choice(
            curve_model, x_column, y_column, degree, custom_equation
        )

        if resolved_model == "logarithmic":
            if np.any(x <= 0) or np.any(y <= 0):
                raise HTTPException(status_code=400, detail="Logarithmic model requires x and y to be > 0.")

        initial_guess = np.ones(n_params)
        params, _ = curve_fit(model_fn, (x, y), z, p0=initial_guess, maxfev=200000)
        z_pred = model_fn((x, y), *params)

        r2 = float(r2_score(z, z_pred))
        mse = float(mean_squared_error(z, z_pred))

        equation = ""
        if resolved_model == "polynomial":
            terms = []
            idx = 0
            for i in range(degree + 1):
                for j in range(degree + 1 - i):
                    coeff = params[idx]
                    term = f"{coeff:.6f}"
                    if i > 0:
                        term += f" * {x_column}^{i}"
                    if j > 0:
                        term += f" * {y_column}^{j}"
                    terms.append(term)
                    idx += 1
            equation = f"{z_column} = " + " + ".join(terms)
        elif resolved_model == "exponential":
            equation = (
                f"{z_column} = {params[0]:.6f} * exp({params[1]:.6f} * {x_column} + {params[2]:.6f} * {y_column})"
            )
        elif resolved_model == "logarithmic":
            equation = (
                f"{z_column} = {params[0]:.6f} + {params[1]:.6f} * log({x_column}) + {params[2]:.6f} * log({y_column})"
            )
        elif resolved_model == "power":
            equation = f"{z_column} = {params[0]:.6f} * {x_column}^{params[1]:.6f} * {y_column}^{params[2]:.6f}"
        else:
            found_params = getattr(model_fn, "_params")
            expr = getattr(model_fn, "_expr")
            resolved_expr = expr
            for name, val in zip(found_params, params):
                resolved_expr = re.sub(rf"\b{re.escape(name)}\b", f"{val:.6f}", resolved_expr)
            equation = f"{z_column} = {resolved_expr}"

        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(111, projection="3d")
        ax.scatter(x, y, z, label="Actual", color="#1d4ed8", alpha=0.8)
        x_grid = np.linspace(x.min(), x.max(), 40)
        y_grid = np.linspace(y.min(), y.max(), 40)
        xg, yg = np.meshgrid(x_grid, y_grid)
        zg = model_fn((xg, yg), *params)
        ax.plot_surface(xg, yg, zg, alpha=0.4, cmap="viridis")
        ax.set_xlabel(x_column)
        ax.set_ylabel(y_column)
        ax.set_zlabel(z_column)
        ax.set_title("Surface Curve Fit")
        plot = _to_base64(fig)

        return {
            "status": "success",
            "model": "curve_fit",
            "curve_model": resolved_model,
            "metrics": {"r2": r2, "mse": mse},
            "parameters": params.tolist(),
            "equation": equation,
            "surface_plot": plot,
            "rows_used": int(len(work_df)),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Curve fitting failed: {str(exc)}")
