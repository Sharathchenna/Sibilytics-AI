import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import numpy as np
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
x_cols = input("\nEnter X columns (comma separated): ").split(',')
y_cols = input("Enter Y columns (comma separated): ").split(',')
x_cols = [c.strip() for c in x_cols]
y_cols = [c.strip() for c in y_cols]

# Select data
X = df[x_cols]
y = df[y_cols]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Evaluation
print("\nCoefficients:")
print(model.coef_)       # shape: (n_targets, n_features)

print("\nIntercepts:")
print(model.intercept_)  # one intercept per target

print("\nR2 score (overall):", r2_score(y_test, y_pred))
print("MSE:", mean_squared_error(y_test, y_pred))

X_test_np = np.array(X_test)
y_test_np = np.array(y_test)
y_pred_np = np.array(y_pred)


# Loop through all input features
for f_idx, feature in enumerate(x_cols):

    # Sort data by this feature for smooth plots
    sorted_idx = np.argsort(X_test_np[:, f_idx])
    X_sorted = X_test_np[sorted_idx]
    y_test_sorted = y_test_np[sorted_idx]
    y_pred_sorted = y_pred_np[sorted_idx]

    # Loop through all output targets
    for i, target in enumerate(y_cols):
        plt.figure()

        # Actual values
        plt.scatter(X_sorted[:, f_idx], y_test_sorted[:, i], label="Actual")

        # Predicted values
        plt.scatter(X_sorted[:, f_idx], y_pred_sorted[:, i], label="Predicted")

        plt.xlabel(feature)
        plt.ylabel(target)
        plt.title(f"{target} vs {feature}")
        plt.legend()
        plt.show()

print("\nFITTED REGRESSION EQUATIONS:\n")

for i, target in enumerate(y_cols):
    equation = f"{target} = {model.intercept_[i]:.4f}"
    for coef, feature in zip(model.coef_[i], x_cols):
        equation += f" + ({coef:.4f} * {feature})"
    print(equation)