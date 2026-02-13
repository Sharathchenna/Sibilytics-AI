import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Load data
df = pd.read_excel(r'C:\Users\Kundan Kumar Singh\Downloads\dataT.xlsx')

print("Available columns:")
for col in df.columns:
    print("-", col)

# User input
x_cols = input("\nEnter X columns (comma separated): ").split(',')
y_cols = input("Enter Y columns (comma separated): ").split(',')

x_cols = [c.strip() for c in x_cols]
y_cols = [c.strip() for c in y_cols]

# Select data
X = df[x_cols]
y = df[y_cols]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ==============================
# Polynomial Feature Expansion
# ==============================
degree = int(input("\nEnter polynomial degree (e.g., 2 or 3): "))

poly = PolynomialFeatures(degree=degree, include_bias=False)
X_train_poly = poly.fit_transform(X_train)
X_test_poly = poly.transform(X_test)

# ==============================
# Train Polynomial Model
# ==============================
model = LinearRegression()
model.fit(X_train_poly, y_train)

# Predict
y_pred = model.predict(X_test_poly)

# ==============================
# Evaluation
# ==============================
print("\nR2 score (overall):", r2_score(y_test, y_pred))
print("MSE:", mean_squared_error(y_test, y_pred))

# Convert to numpy
X_test_np = np.array(X_test)
y_test_np = np.array(y_test)
y_pred_np = np.array(y_pred)

# ==============================
# Plot Actual vs Predicted vs ALL Input Features
# ==============================
for f_idx, feature in enumerate(x_cols):

    # Sort for clean plots
    sorted_idx = np.argsort(X_test_np[:, f_idx])
    X_sorted = X_test_np[sorted_idx]
    y_test_sorted = y_test_np[sorted_idx]
    y_pred_sorted = y_pred_np[sorted_idx]

    # Plot each output
    for i, target in enumerate(y_cols):
        plt.figure()

        plt.plot(X_sorted[:, f_idx], y_test_sorted[:, i], label="Actual")
        plt.plot(X_sorted[:, f_idx], y_pred_sorted[:, i], label="Predicted")

        plt.xlabel(feature)
        plt.ylabel(target)
        plt.title(f"{target} vs {feature} (Polynomial Degree {degree})")
        plt.legend()
        plt.show()
feature_names = poly.get_feature_names_out(x_cols)

print("\nFITTED POLYNOMIAL EQUATIONS:\n")

for i, target in enumerate(y_cols):
    equation = f"{target} = {model.intercept_[i]:.4f}"

    for coef, name in zip(model.coef_[i], feature_names):
        if abs(coef) > 1e-8:  # avoid printing near-zero terms
            equation += f" + ({coef:.4f} * {name})"

    print(equation)