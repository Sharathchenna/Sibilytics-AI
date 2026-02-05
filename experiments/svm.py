import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import roc_auc_score, roc_curve, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.preprocessing import label_binarize

# Load data
df2 = pd.read_excel(r'D:\Feature Extraction Post princi\charm_results\entropy_mp.xlsx')

# Define the kernel types and test sizes
kernel_types = ["poly", "rbf", "linear", "sigmoid"]
test_sizes = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]

# Results storage for each test size
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

for test_size in test_sizes:
    # Data preparation
    X = df2[['adoc', 'Microphone']]
    y = df2['class']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    y_train_bin = label_binarize(y_train, classes=[0, 1])
    y_test_bin = label_binarize(y_test, classes=[0, 1])

    # Results storage for each kernel
    results = {}
    comparison_metrics = {'Kernel': [], 'Accuracy': [], 'Precision': [], 'Recall': [], 'F1 Score': [], 'AUC Score': []}
    roc_curves = {}
    cm_results = {}
    gs_results = {}

    # Loop through each kernel
    for kernel in kernel_types:
        # SVM and GridSearch
        svm = SVC(kernel=kernel, probability=True)
        parameters = {"C": np.arange(1, 10, 1), 'gamma': [0.00001, 0.0001, 0.001, 0.01, 0.1]}
        if kernel == "poly":
            parameters['degree'] = [3]

        searcher = GridSearchCV(svm, parameters, n_jobs=-1, cv=5, refit=True, verbose=3)
        searcher.fit(X_train, y_train_bin.ravel())

        # Best model and metrics
        best_model = searcher.best_estimator_
        y_pred = best_model.predict(X_test)
        y_pred_proba = best_model.predict_proba(X_test)[:, 1]
        auc_score = roc_auc_score(y_test_bin, y_pred_proba)
        accuracy = accuracy_score(y_test_bin, y_pred)
        precision = precision_score(y_test_bin, y_pred)
        recall = recall_score(y_test_bin, y_pred)
        f1 = f1_score(y_test_bin, y_pred)

        # Store comparison metrics, ROC curve, and confusion matrix
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

        # Plot and save ROC Curve
        fpr, tpr, _ = roc_curve(y_test_bin, y_pred_proba)
        plt.figure(figsize=(10, 6))
        plt.plot(fpr, tpr, label=f"AUC for {kernel} Kernel: {auc_score:.2f}")
        plt.plot([0, 1], [0, 1], 'k--')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title(f'ROC Curve for {kernel} Kernel - Test Size {test_size}')
        plt.legend(loc="lower right")
        plt.savefig(f'{save_directory}\\ROC_Curve_{kernel}_testsize_{test_size}.png', dpi=400)
        plt.close()

        # Plot and save Scatter Plot
        xx, yy = make_meshgrid(X['adoc'], X['Microphone'])
        plt.figure(figsize=(10, 6))
        ax = plt.subplot(1, 1, 1)
        plot_contours(ax, searcher, xx, yy, cmap=plt.cm.viridis, alpha=0.8)
        plt.scatter(X.loc[y == 0, 'adoc'], X.loc[y == 0, 'Microphone'], c='blue', s=22, edgecolor='blue', label='Class 0')
        plt.scatter(X.loc[y == 1, 'adoc'], X.loc[y == 1, 'Microphone'], c='red', s=22, edgecolor='red', label='Class 1')
        plt.xlabel('adoc')
        plt.ylabel('Entropy')
        plt.title(f"Decision Surface of {kernel} Kernel - Test Size {test_size}")
        plt.legend(loc="upper right")
        plt.savefig(f'{save_directory}\\Scatter_Plot_{kernel}_testsize_{test_size}.png', dpi=400, bbox_inches='tight')
        plt.close()

        # Plot and save Heatmap
        scores_matrix = np.array(gs_results[kernel]["mean_test_score"]).reshape(len(parameters['C']), len(parameters['gamma']))
        plt.figure(figsize=(8, 6))
        sns.heatmap(scores_matrix, annot=True, fmt='.3f', xticklabels=parameters['gamma'], yticklabels=parameters['C'], cmap='viridis')
        plt.xlabel('Gamma')
        plt.ylabel('C')
        plt.title(f'Grid Search Scores Heatmap for {kernel} Kernel - Test Size {test_size}')
        plt.savefig(f'{save_directory}\\Grid_Search_Heatmap_{kernel}_testsize_{test_size}.png', dpi=400, bbox_inches='tight')
        plt.close()

    # Store results for the test size
    all_test_size_results[test_size] = {
        'Kernel Results': pd.DataFrame.from_dict(results, orient='index'),
        'Comparison Metrics': pd.DataFrame(comparison_metrics),
        'roc_curves': roc_curves
    }
    confusion_matrices[test_size] = cm_results
    gridsearch_results[test_size] = gs_results


# Define the directory for saving plots
save_directory = r'D:\My PhD\Year 3\1.Thin wall\Paper 4 - princi_com\After princi comp\4. Feature Extraction Post princi\charm_results\plots2'

# Plotting functions (including plot_all_roc_curves, plot_metric_comparisons, plot_confusion_matrices, and plot_gridsearch_heatmaps)

# ROC Curve Overlay Comparison
def plot_all_roc_curves(all_test_size_results, save_directory):
    plt.figure(figsize=(10, 8))
    for test_size, data in all_test_size_results.items():
        for kernel, (fpr, tpr) in data['roc_curves'].items():
            plt.plot(fpr, tpr, label=f'{kernel} - Test Size {test_size} (AUC = {data["Comparison Metrics"].set_index("Kernel").loc[kernel, "AUC Score"]:.2f})')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve Comparison Across Test Sizes and Kernels')
    plt.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    plt.savefig(f'{save_directory}\\roc_curves_comparison.png', dpi=400, bbox_inches='tight')
    plt.close()

# Metric Comparisons Across Test Sizes
def plot_metric_comparisons(all_test_size_results, metric, save_directory):
    plt.figure(figsize=(12, 8))
    for kernel in kernel_types:
        values = []
        test_sizes = []
        for test_size, data in all_test_size_results.items():
            test_sizes.append(test_size)
            values.append(data['Comparison Metrics'].set_index('Kernel').loc[kernel, metric])
        plt.plot(test_sizes, values, marker='o', label=kernel)
    plt.xlabel('Test Size')
    plt.ylabel(metric)
    plt.title(f'{metric} Comparison Across Test Sizes for Different Kernels')
    plt.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    plt.savefig(f'{save_directory}\\{metric}_comparison.png', dpi=400, bbox_inches='tight')
    plt.close()

# Plotting Confusion Matrices
def plot_confusion_matrices(confusion_matrices, kernel_types, test_sizes, save_directory):
    for kernel in kernel_types:
        plt.figure(figsize=(12, 8))
        for i, test_size in enumerate(test_sizes):
            plt.subplot(2, 3, i + 1)  # Adjust subplot layout based on the number of test sizes
            sns.heatmap(confusion_matrices[test_size][kernel], annot=True, fmt='d', cmap='Blues', cbar=False)
            plt.title(f'Test Size: {test_size}')
            plt.xlabel('Predicted')
            plt.ylabel('Actual')
        plt.suptitle(f'Confusion Matrices for {kernel} Kernel')
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        plt.savefig(f'{save_directory}\\confusion_matrix_{kernel}.png', dpi=400, bbox_inches='tight')
        plt.close()

# Generate and save plots
plot_all_roc_curves(all_test_size_results, save_directory)
for metric in ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC Score']:
    plot_metric_comparisons(all_test_size_results, metric, save_directory)
plot_confusion_matrices(confusion_matrices, kernel_types, test_sizes, save_directory)
plot_gridsearch_heatmaps(gridsearch_results, kernel_types, test_sizes, save_directory)

# Exporting results to Excel
excel_path = f'{save_directory}\\svm_result_comparison.xlsx'
with pd.ExcelWriter(excel_path) as writer:
    for test_size, data in all_test_size_results.items():
        data['Kernel Results'].to_excel(writer, sheet_name=f'TestSize_{test_size}_KernelResults')
        data['Comparison Metrics'].to_excel(writer, sheet_name=f'TestSize_{test_size}_Comparison')
