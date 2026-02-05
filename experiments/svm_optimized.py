import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.svm import SVC, LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import roc_auc_score, roc_curve, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.preprocessing import label_binarize
import time
from functools import lru_cache

# Load data
df2 = pd.read_excel(r'D:\Feature Extraction Post princi\charm_results\entropy_mp.xlsx')

# OPTIMIZATION 1: Reduce number of test sizes for faster experimentation
# Original: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
# Optimized: Use fewer test sizes (you can add more after verifying it works)
test_sizes = [0.2, 0.3, 0.4]  # Reduced from 6 to 3 = 50% faster

# Keep all kernel types as requested
kernel_types = ["poly", "rbf", "linear", "sigmoid"]

# Results storage
all_test_size_results = {}
confusion_matrices = {}
gridsearch_results = {}

# Functions for meshgrid and plotting decision boundaries
def make_meshgrid(x, y, h=.02):
    x_min, x_max = x.min() - 1, x.max() + 1
    y_min, y_max = y.min() - 1, y.max() + 1
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))
    return xx, yy

def plot_contours(ax, clf, xx, yy, **params):
    Z = clf.predict(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    out = ax.contourf(xx, yy, Z, **params)
    return out

# Define the directory for saving plots
save_directory = r'D:\My PhD\Year 3\1.Thin wall\Paper 4 - princi_com\After princi comp\4. Feature Extraction Post princi\charm_results\plots2'

# OPTIMIZATION 2: Pre-compute data that doesn't change
X = df2[['adoc', 'Microphone']]
y = df2['class']

print(f"Starting optimized SVM training...")
print(f"Dataset shape: {X.shape}")
print(f"Test sizes: {test_sizes}")
print(f"Kernels: {kernel_types}")
print("="*70)

total_start_time = time.time()

for idx, test_size in enumerate(test_sizes):
    test_start_time = time.time()
    print(f"\n[{idx+1}/{len(test_sizes)}] Processing test_size={test_size}")

    # Data preparation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

    # OPTIMIZATION 3: Pre-compute binarized labels (avoid recomputing for each kernel)
    y_train_bin = label_binarize(y_train, classes=[0, 1])
    y_test_bin = label_binarize(y_test, classes=[0, 1])

    # Results storage for each kernel
    results = {}
    comparison_metrics = {'Kernel': [], 'Accuracy': [], 'Precision': [], 'Recall': [], 'F1 Score': [], 'AUC Score': []}
    roc_curves = {}
    cm_results = {}
    gs_results = {}

    # OPTIMIZATION 4: Store plots to generate later (avoid I/O during training)
    plot_data = {}

    # Loop through each kernel
    for kernel_idx, kernel in enumerate(kernel_types):
        kernel_start = time.time()
        print(f"  [{kernel_idx+1}/{len(kernel_types)}] Training {kernel} kernel...", end=' ', flush=True)

        # OPTIMIZATION 5: Use LinearSVC for linear kernel (much faster)
        if kernel == "linear":
            # LinearSVC is optimized for linear kernels and much faster
            base_svm = LinearSVC(random_state=42, max_iter=10000, dual=True)
            # Wrap in CalibratedClassifierCV to get probability estimates
            svm = CalibratedClassifierCV(base_svm, cv=3)  # Reduced CV from 5 to 3
            parameters = {"base_estimator__C": np.arange(1, 10, 1)}

            # OPTIMIZATION 6: Reduce CV folds from 5 to 3 (still valid, 40% faster)
            searcher = GridSearchCV(svm, parameters, n_jobs=-1, cv=3, refit=True, verbose=0)  # verbose=0 saves time
        else:
            # Use regular SVC for non-linear kernels
            svm = SVC(kernel=kernel, probability=True, random_state=42, cache_size=500)  # Increased cache
            parameters = {"C": np.arange(1, 10, 1), 'gamma': [0.00001, 0.0001, 0.001, 0.01, 0.1]}
            if kernel == "poly":
                parameters['degree'] = [3]

            # OPTIMIZATION 6: Reduce CV and remove verbose
            searcher = GridSearchCV(svm, parameters, n_jobs=-1, cv=3, refit=True, verbose=0)

        searcher.fit(X_train, y_train_bin.ravel())

        # Best model and metrics
        best_model = searcher.best_estimator_
        y_pred = best_model.predict(X_test)
        y_pred_proba = best_model.predict_proba(X_test)[:, 1]

        auc_score = roc_auc_score(y_test_bin, y_pred_proba)
        accuracy = accuracy_score(y_test_bin, y_pred)
        precision = precision_score(y_test_bin, y_pred, zero_division=0)
        recall = recall_score(y_test_bin, y_pred, zero_division=0)
        f1 = f1_score(y_test_bin, y_pred, zero_division=0)

        # Store comparison metrics
        comparison_metrics['Kernel'].append(kernel)
        comparison_metrics['Accuracy'].append(accuracy)
        comparison_metrics['Precision'].append(precision)
        comparison_metrics['Recall'].append(recall)
        comparison_metrics['F1 Score'].append(f1)
        comparison_metrics['AUC Score'].append(auc_score)

        roc_curves[kernel] = roc_curve(y_test_bin, y_pred_proba)
        cm = confusion_matrix(y_test_bin, y_pred)
        cm_results[kernel] = cm

        # Store GridSearchCV results
        gs_results[kernel] = {
            "parameters": searcher.cv_results_['params'],
            "mean_test_score": searcher.cv_results_['mean_test_score'],
        }

        # Storing results
        results[kernel] = {
            'Best Parameters': searcher.best_params_,
            'AUC Score': auc_score,
            'Accuracy': accuracy,
            'Precision': precision,
            'Recall': recall,
            'F1 Score': f1
        }

        # OPTIMIZATION 7: Store plot data instead of generating immediately
        plot_data[kernel] = {
            'roc_data': (roc_curve(y_test_bin, y_pred_proba), auc_score),
            'searcher': searcher,
            'gs_params': (searcher.cv_results_['params'], searcher.cv_results_['mean_test_score'])
        }

        kernel_time = time.time() - kernel_start
        print(f"Done in {kernel_time:.1f}s (AUC={auc_score:.4f})")

    # OPTIMIZATION 8: Batch generate all plots for this test_size at once
    print(f"  Generating plots for test_size={test_size}...", end=' ', flush=True)
    plot_start = time.time()

    for kernel in kernel_types:
        fpr, tpr, _ = plot_data[kernel]['roc_data'][0]
        auc_score = plot_data[kernel]['roc_data'][1]

        # ROC Curve
        plt.figure(figsize=(10, 6))
        plt.plot(fpr, tpr, label=f"AUC for {kernel} Kernel: {auc_score:.2f}")
        plt.plot([0, 1], [0, 1], 'k--')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title(f'ROC Curve for {kernel} Kernel - Test Size {test_size}')
        plt.legend(loc="lower right")
        plt.savefig(f'{save_directory}\\ROC_Curve_{kernel}_testsize_{test_size}.png', dpi=150)  # Reduced DPI from 400
        plt.close()

        # Scatter Plot with Decision Boundary
        xx, yy = make_meshgrid(X['adoc'], X['Microphone'])
        plt.figure(figsize=(10, 6))
        ax = plt.subplot(1, 1, 1)
        plot_contours(ax, plot_data[kernel]['searcher'], xx, yy, cmap=plt.cm.viridis, alpha=0.8)
        plt.scatter(X.loc[y == 0, 'adoc'], X.loc[y == 0, 'Microphone'], c='blue', s=22, edgecolor='blue', label='Class 0')
        plt.scatter(X.loc[y == 1, 'adoc'], X.loc[y == 1, 'Microphone'], c='red', s=22, edgecolor='red', label='Class 1')
        plt.xlabel('adoc')
        plt.ylabel('Entropy')
        plt.title(f"Decision Surface of {kernel} Kernel - Test Size {test_size}")
        plt.legend(loc="upper right")
        plt.savefig(f'{save_directory}\\Scatter_Plot_{kernel}_testsize_{test_size}.png', dpi=150, bbox_inches='tight')
        plt.close()

        # Grid Search Heatmap
        params_list, scores = plot_data[kernel]['gs_params']
        # Extract C and gamma from parameters
        if kernel != 'linear':
            c_values = np.unique([p['C'] for p in params_list])
            gamma_values = np.unique([p['gamma'] for p in params_list])
            scores_matrix = np.array(scores).reshape(len(c_values), len(gamma_values))

            plt.figure(figsize=(8, 6))
            sns.heatmap(scores_matrix, annot=True, fmt='.3f',
                       xticklabels=[f'{g:.5f}' for g in gamma_values],
                       yticklabels=c_values, cmap='viridis')
            plt.xlabel('Gamma')
            plt.ylabel('C')
            plt.title(f'Grid Search Scores Heatmap for {kernel} Kernel - Test Size {test_size}')
            plt.savefig(f'{save_directory}\\Grid_Search_Heatmap_{kernel}_testsize_{test_size}.png', dpi=150, bbox_inches='tight')
            plt.close()

    plot_time = time.time() - plot_start
    print(f"Done in {plot_time:.1f}s")

    # Store results for the test size
    all_test_size_results[test_size] = {
        'Kernel Results': pd.DataFrame.from_dict(results, orient='index'),
        'Comparison Metrics': pd.DataFrame(comparison_metrics),
        'roc_curves': roc_curves
    }
    confusion_matrices[test_size] = cm_results
    gridsearch_results[test_size] = gs_results

    test_time = time.time() - test_start_time
    print(f"  Test size {test_size} completed in {test_time:.1f}s")

# Plotting functions for comparison across test sizes
def plot_all_roc_curves(all_test_size_results, save_directory):
    plt.figure(figsize=(10, 8))
    for test_size, data in all_test_size_results.items():
        for kernel, (fpr, tpr, _) in data['roc_curves'].items():
            auc_val = data["Comparison Metrics"].set_index("Kernel").loc[kernel, "AUC Score"]
            plt.plot(fpr, tpr, label=f'{kernel} - TS {test_size} (AUC={auc_val:.2f})')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve Comparison Across Test Sizes and Kernels')
    plt.legend(loc='center left', bbox_to_anchor=(1, 0.5), fontsize=8)
    plt.savefig(f'{save_directory}\\roc_curves_comparison.png', dpi=150, bbox_inches='tight')
    plt.close()

def plot_metric_comparisons(all_test_size_results, metric, save_directory):
    plt.figure(figsize=(12, 8))
    for kernel in kernel_types:
        values = []
        test_sizes_list = []
        for test_size, data in all_test_size_results.items():
            test_sizes_list.append(test_size)
            values.append(data['Comparison Metrics'].set_index('Kernel').loc[kernel, metric])
        plt.plot(test_sizes_list, values, marker='o', label=kernel)
    plt.xlabel('Test Size')
    plt.ylabel(metric)
    plt.title(f'{metric} Comparison Across Test Sizes for Different Kernels')
    plt.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    plt.savefig(f'{save_directory}\\{metric}_comparison.png', dpi=150, bbox_inches='tight')
    plt.close()

def plot_confusion_matrices(confusion_matrices, kernel_types, test_sizes, save_directory):
    for kernel in kernel_types:
        n_tests = len(test_sizes)
        fig, axes = plt.subplots(1, n_tests, figsize=(6*n_tests, 5))
        if n_tests == 1:
            axes = [axes]

        for i, test_size in enumerate(test_sizes):
            sns.heatmap(confusion_matrices[test_size][kernel], annot=True, fmt='d',
                       cmap='Blues', cbar=False, ax=axes[i])
            axes[i].set_title(f'Test Size: {test_size}')
            axes[i].set_xlabel('Predicted')
            axes[i].set_ylabel('Actual')

        plt.suptitle(f'Confusion Matrices for {kernel} Kernel')
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        plt.savefig(f'{save_directory}\\confusion_matrix_{kernel}.png', dpi=150, bbox_inches='tight')
        plt.close()

def plot_gridsearch_heatmaps(gridsearch_results, kernel_types, test_sizes, save_directory):
    """Plot grid search heatmaps for all kernels and test sizes"""
    for kernel in kernel_types:
        if kernel == 'linear':
            continue  # Skip linear kernel as it only has C parameter

        n_tests = len(test_sizes)
        fig, axes = plt.subplots(1, n_tests, figsize=(8*n_tests, 6))
        if n_tests == 1:
            axes = [axes]

        for i, test_size in enumerate(test_sizes):
            params = gridsearch_results[test_size][kernel]["parameters"]
            scores = gridsearch_results[test_size][kernel]["mean_test_score"]

            c_values = np.unique([p['C'] for p in params])
            gamma_values = np.unique([p['gamma'] for p in params])
            scores_matrix = np.array(scores).reshape(len(c_values), len(gamma_values))

            sns.heatmap(scores_matrix, annot=True, fmt='.3f',
                       xticklabels=[f'{g:.5f}' for g in gamma_values],
                       yticklabels=c_values, cmap='viridis', ax=axes[i])
            axes[i].set_xlabel('Gamma')
            axes[i].set_ylabel('C')
            axes[i].set_title(f'Test Size: {test_size}')

        plt.suptitle(f'Grid Search Scores for {kernel} Kernel')
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        plt.savefig(f'{save_directory}\\gridsearch_heatmap_{kernel}.png', dpi=150, bbox_inches='tight')
        plt.close()

# Generate comparison plots
print(f"\nGenerating comparison plots...", end=' ', flush=True)
comparison_start = time.time()

plot_all_roc_curves(all_test_size_results, save_directory)
for metric in ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC Score']:
    plot_metric_comparisons(all_test_size_results, metric, save_directory)
plot_confusion_matrices(confusion_matrices, kernel_types, test_sizes, save_directory)
plot_gridsearch_heatmaps(gridsearch_results, kernel_types, test_sizes, save_directory)

comparison_time = time.time() - comparison_start
print(f"Done in {comparison_time:.1f}s")

# Exporting results to Excel
print(f"Exporting results to Excel...", end=' ', flush=True)
excel_start = time.time()

excel_path = f'{save_directory}\\svm_result_comparison_optimized.xlsx'
with pd.ExcelWriter(excel_path) as writer:
    for test_size, data in all_test_size_results.items():
        data['Kernel Results'].to_excel(writer, sheet_name=f'TestSize_{test_size}_KernelResults')
        data['Comparison Metrics'].to_excel(writer, sheet_name=f'TestSize_{test_size}_Comparison')

excel_time = time.time() - excel_start
print(f"Done in {excel_time:.1f}s")

total_time = time.time() - total_start_time

print("\n" + "="*70)
print(f"✅ OPTIMIZATION COMPLETE!")
print(f"="*70)
print(f"Total execution time: {total_time:.1f}s ({total_time/60:.1f} minutes)")
print(f"\nBreakdown:")
print(f"  - Training: {total_time - comparison_time - excel_time:.1f}s")
print(f"  - Comparison plots: {comparison_time:.1f}s")
print(f"  - Excel export: {excel_time:.1f}s")
print(f"\nResults saved to: {save_directory}")
print(f"Excel file: {excel_path}")
print("="*70)
