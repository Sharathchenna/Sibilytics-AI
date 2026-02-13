import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings("ignore")

# -------------------------
# LOAD ANY FILE FORMAT
# -------------------------
def load_data(file_path):
    ext = os.path.splitext(file_path)[1].lower()

    if ext in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path)
    elif ext == '.csv':
        df = pd.read_csv(file_path)
    elif ext in ['.txt', '.lvm']:
        df = pd.read_csv(file_path, delimiter=None, engine='python')
    else:
        raise ValueError("Unsupported file format")

    return df

# -------------------------
# USER INPUT
# -------------------------
file_path = input("Enter full dataset file path: ").strip()
df = load_data(file_path)

print("\nPreview of dataset:")
print(df.head())

# -------------------------
# HANDLE DATA WITHOUT HEADERS
# -------------------------
if isinstance(df.columns[0], int):
    df.columns = [f"Column_{i}" for i in range(df.shape[1])]

# -------------------------
# AUTO TARGET COLUMN DETECTION
# -------------------------
target_col = None
for col in df.columns[::-1]:
    if df[col].nunique() <= 20:
        target_col = col
        break

if target_col is None:
    target_col = df.columns[-1]

print("\nAuto-Detected Target Column:", target_col)

X = df.drop(columns=[target_col])
y = df[target_col]

# -------------------------
# ENCODE TARGET IF NEEDED
# -------------------------
if y.dtype == "object":
    le = LabelEncoder()
    y = le.fit_transform(y)

num_classes = len(np.unique(y))
print("Detected Number of Classes:", num_classes)

# -------------------------
# SCALE FEATURES
# -------------------------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# -------------------------
# AUTO SPLIT + MODEL SEARCH
# -------------------------
splits = [0.2, 0.25, 0.3]

best_score = 0
best_model = None
best_params = None
best_split = None

for test_size in splits:
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

# -------------------------
# FINAL TRAINING
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=best_split, random_state=42
)

best_model.fit(X_train, y_train)
y_pred = best_model.predict(X_test)

print("\nBEST MODEL FOUND")
print("Accuracy:", best_score)
print("Best Parameters:", best_params)

print("\nCLASSIFICATION REPORT:")
print(classification_report(y_test, y_pred))

# -------------------------
# CONFUSION MATRIX PLOT
# -------------------------
cm = confusion_matrix(y_test, y_pred)

plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
plt.title("Confusion Matrix")
plt.xlabel("Predicted Class")
plt.ylabel("True Class")
plt.show()

# -------------------------
# PRINT FINAL LOGISTIC EQUATION
# -------------------------
print("\nFINAL MODEL EQUATION:")
coef = best_model.coef_
intercept = best_model.intercept_

for cls in range(num_classes):
    eq = f"logit(Class {cls}) = {intercept[cls]:.4f} "
    for i, col in enumerate(X.columns):
        eq += f"+ ({coef[cls][i]:.4f} × {col}) "
    print(eq)

# -------------------------
# VARIABLE vs ACCURACY IMPORTANCE PLOT
# -------------------------
importance = np.mean(np.abs(coef), axis=0)

plt.figure(figsize=(8, 5))
plt.barh(X.columns, importance)
plt.title("Feature Importance (Effect on Prediction Accuracy)")
plt.xlabel("Impact Strength")
plt.ylabel("Variables")
plt.show()

# -------------------------
# FEATURE vs CLASS PROBABILITY (LABELED)
# -------------------------
probs = best_model.predict_proba(X_scaled)

for i, col in enumerate(X.columns):
    plt.figure(figsize=(7, 5))
    for cls in range(num_classes):
        plt.scatter(X[col], probs[:, cls], alpha=0.5, label=f"Class {cls}")
    plt.xlabel(col)
    plt.ylabel("Predicted Probability")
    plt.title(f"{col} vs Class Probability")
    plt.legend()
    plt.show()

# -------------------------
# MANUAL PREDICTION MODE
# -------------------------
while True:
    print("\nEnter values to predict class or type 'exit':")
    inputs = []

    for col in X.columns:
        val = input(f"{col}: ")
        if val.lower() == "exit":
            exit()
        inputs.append(float(val))

    inputs = np.array(inputs).reshape(1, -1)
    inputs_scaled = scaler.transform(inputs)

    pred_class = best_model.predict(inputs_scaled)[0]
    pred_prob = best_model.predict_proba(inputs_scaled)

    print("\nPredicted Class:", pred_class)
    print("Class Probabilities:", pred_prob)
