import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
from sklearn.metrics import mean_squared_error, r2_score
from mpl_toolkits.mplot3d import Axes3D
import re
import os

file_path = input("Enter dataset file path: ").strip()
ext = os.path.splitext(file_path)[1].lower()

if not os.path.exists(file_path):
    raise FileNotFoundError(f"File not found: {file_path}")

if ext in ['.xlsx', '.xls']:
    df = pd.read_excel(file_path, header=0)
elif ext == '.csv':
    df = pd.read_csv(file_path, header=0)
elif ext in ['.txt', '.lvm']:
    df = pd.read_csv(file_path, delimiter=None, engine='python', header=0)
else:
    raise ValueError("Unsupported file format!")

# If there’s no header (all column names are numbers), generate headers
if isinstance(df.columns[0], int):
    df.columns = [f"Column_{i}" for i in range(df.shape[1])]
    print("⚠ No header detected — auto-generated column names.")

print("\nAvailable columns:")
for col in df.columns:
    print("-", col)

# ==========================
# User Select Columns
# ==========================
x_col = input("\nEnter X column: ").strip()
y_col = input("Enter Y column: ").strip()
z_col = input("Enter Z column (output): ").strip()

X = df[x_col].values
Y = df[y_col].values
Z = df[z_col].values

# ==========================
# Model Selection
# ==========================
print("\nChoose model type:")
print("1 = Polynomial Surface")
print("2 = Exponential Surface")
print("3 = Logarithmic Surface")
print("4 = Power Law Surface")
print("5 = Custom User Equation")

choice = int(input("Enter choice number: "))

# ==========================
# Define Models
# ==========================
if choice == 1:
    degree = int(input("Enter polynomial degree (2 or 3 recommended): "))

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


elif choice == 2:
    def model(XY, a, b, c):
        x, y = XY
        return a * np.exp(b*x + c*y)
    n_params = 3


elif choice == 3:
    def model(XY, a, b, c):
        x, y = XY
        return a + b*np.log(x) + c*np.log(y)
    n_params = 3


elif choice == 4:
    def model(XY, a, b, c):
        x, y = XY
        return a * (x**b) * (y**c)
    n_params = 3


elif choice == 5:
    print("\nDefine equation using x, y and parameters like a, b, c, d ...")
    print("Example: a*(x^b)*(y^c) or a*np.exp(b*x) + c*y")

    user_eq = input("Enter equation: ").replace("^", "**")

    # Auto-detect parameters
    found_params = sorted(set(re.findall(r"\b[a-z]\b", user_eq)))
    found_params = [p for p in found_params if p not in ["x", "y"]]

    if len(found_params) == 0:
        raise ValueError("No parameters found! Use letters like a, b, c in equation.")

    n_params = len(found_params)

    print(f"Detected parameters: {found_params}")

    def model(XY, *params):
        x, y = XY
        param_dict = {found_params[i]: params[i] for i in range(n_params)}
        return eval(user_eq, {"np": np, "x": x, "y": y, **param_dict})


else:
    raise ValueError("Invalid choice!")

# ==========================
# Fit Model
# ==========================
p0 = np.ones(n_params)
params, _ = curve_fit(model, (X, Y), Z, p0=p0, maxfev=200000)

Z_pred = model((X, Y), *params)

# ==========================
# Evaluation
# ==========================
print("\nR² Score:", r2_score(Z, Z_pred))
print("MSE:", mean_squared_error(Z, Z_pred))

# ==========================
# CLEAN EQUATION PRINT
# ==========================
print("\nCLEAN FITTED EQUATION:\n")

letters = list("abcdefghijklmnopqrstuvwxyz")

# Polynomial
if choice == 1:
    idx = 0
    terms = []
    for i in range(degree + 1):
        for j in range(degree + 1 - i):
            coeff = params[idx]
            term = f"{coeff:.6f}"
            if i > 0:
                term += f"·{x_col}^{i}"
            if j > 0:
                term += f"·{y_col}^{j}"
            terms.append(term)
            idx += 1
    print(f"{z_col} = " + " + ".join(terms))

# Exponential
elif choice == 2:
    print(f"{z_col} = {params[0]:.6f} · exp({params[1]:.6f}·{x_col} + {params[2]:.6f}·{y_col})")

# Logarithmic
elif choice == 3:
    print(f"{z_col} = {params[0]:.6f} + {params[1]:.6f}·log({x_col}) + {params[2]:.6f}·log({y_col})")

# Power Law (Clean Power Format)
elif choice == 4:
    print(f"{z_col} = {params[0]:.6f} · {x_col}^{params[1]:.6f} · {y_col}^{params[2]:.6f}")

# Custom Equation (Auto-detect power law)
elif choice == 5:
    if "x**" in user_eq and "y**" in user_eq and len(params) >= 3:
        print(f"{z_col} = {params[0]:.6f} · {x_col}^{params[1]:.6f} · {y_col}^{params[2]:.6f}")
    else:
        eq = user_eq
        for i, val in enumerate(params):
            eq = eq.replace(found_params[i], f"{val:.6f}")
        print(f"{z_col} = {eq}")

# ==========================
# 3D Surface Plot
# ==========================
fig = plt.figure()
ax = fig.add_subplot(111, projection='3d')

ax.scatter(X, Y, Z, label="Actual")

x_grid = np.linspace(X.min(), X.max(), 40)
y_grid = np.linspace(Y.min(), Y.max(), 40)
xg, yg = np.meshgrid(x_grid, y_grid)

zg = model((xg, yg), *params)

ax.plot_surface(xg, yg, zg, alpha=0.4)

ax.set_xlabel(x_col)
ax.set_ylabel(y_col)
ax.set_zlabel(z_col)
ax.set_title("Surface Curve Fit")

plt.show()
