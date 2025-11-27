import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt

class ANNInverseSolver:
    """
    ANN-based inverse problem solver for temperature prediction.
    Trains a model to predict temperature from (cr, cf) inputs,
    then optimizes inputs to achieve desired temperature.
    """

    def __init__(self):
        self.model = None
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()
        self.history = None

    def load_data(self, filepath):
        """Load data from Excel file"""
        df = pd.read_excel(filepath)
        X = df.iloc[:, :2].values  # cr, cf
        y = df.iloc[:, 2].values   # t
        return X, y

    def prepare_data(self, X, y, test_size=0.1, random_state=42):
        """Split and normalize data"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        # Normalize features
        X_train = self.scaler_X.fit_transform(X_train)
        X_test = self.scaler_X.transform(X_test)

        # Normalize target
        y_train = self.scaler_y.fit_transform(y_train.reshape(-1, 1)).flatten()
        y_test = self.scaler_y.transform(y_test.reshape(-1, 1)).flatten()

        return X_train, X_test, y_train, y_test

    def build_model(self, architecture=[30, 10, 8], activation='relu'):
        """Build ANN model with configurable architecture"""
        model = keras.Sequential([
            layers.Dense(architecture[0], activation=activation, input_shape=(2,))
        ])

        for units in architecture[1:]:
            model.Dense(units, activation=activation)

        model.add(layers.Dense(1))  # Output layer
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])

        self.model = model
        return model

    def train(self, X_train, y_train, epochs=350, batch_size=16, validation_split=0.2, verbose=1):
        """Train the model"""
        if self.model is None:
            self.build_model()

        self.history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=verbose
        )
        return self.history

    def evaluate(self, X_test, y_test):
        """Evaluate model performance"""
        y_pred_scaled = self.model.predict(X_test)

        # Convert back to original scale
        y_pred = self.scaler_y.inverse_transform(y_pred_scaled)
        y_true = self.scaler_y.inverse_transform(y_test.reshape(-1, 1))

        metrics = {
            'mae': float(np.mean(np.abs(y_pred - y_true))),
            'mse': float(mean_squared_error(y_true, y_pred)),
            'rmse': float(np.sqrt(mean_squared_error(y_true, y_pred))),
            'r2': float(r2_score(y_true, y_pred))
        }

        return metrics, y_true, y_pred

    def inverse_solve(self, desired_t, input_bounds=None, n_attempts=5, steps=200, lr=0.1):
        """
        Solve inverse problem: find (cr, cf) for desired temperature.

        Args:
            desired_t: Target temperature
            input_bounds: [(cr_min, cr_max), (cf_min, cf_max)] or None
            n_attempts: Number of optimization attempts with different initializations
            steps: Optimization steps per attempt
            lr: Learning rate

        Returns:
            dict with best inputs, prediction, and optimization history
        """
        desired_t_scaled = self.scaler_y.transform([[desired_t]])[0][0]

        best_loss = float('inf')
        best_input = None
        best_prediction = None
        all_attempts = []

        for attempt in range(n_attempts):
            # Initialize within bounds or randomly
            if input_bounds:
                init_val = np.array([[
                    np.random.uniform(input_bounds[0][0], input_bounds[0][1]),
                    np.random.uniform(input_bounds[1][0], input_bounds[1][1])
                ]])
                init_val_scaled = self.scaler_X.transform(init_val)
            else:
                init_val_scaled = np.random.randn(1, 2) * 0.5  # Small random init

            input_var = tf.Variable(init_val_scaled, dtype=tf.float32)
            optimizer = tf.keras.optimizers.Adam(learning_rate=lr)

            history = []

            for step in range(steps):
                with tf.GradientTape() as tape:
                    pred = self.model(input_var)
                    loss = tf.reduce_mean((pred - desired_t_scaled) ** 2)

                    # Add penalty for out-of-bounds values
                    if input_bounds:
                        input_original = self.scaler_X.inverse_transform(input_var.numpy())
                        penalty = 0.0

                        # Penalty for cr out of bounds
                        if input_original[0, 0] < input_bounds[0][0]:
                            penalty += (input_bounds[0][0] - input_original[0, 0]) ** 2
                        if input_original[0, 0] > input_bounds[0][1]:
                            penalty += (input_original[0, 0] - input_bounds[0][1]) ** 2

                        # Penalty for cf out of bounds
                        if input_original[0, 1] < input_bounds[1][0]:
                            penalty += (input_bounds[1][0] - input_original[0, 1]) ** 2
                        if input_original[0, 1] > input_bounds[1][1]:
                            penalty += (input_original[0, 1] - input_bounds[1][1]) ** 2

                        loss = loss + 100.0 * penalty

                grads = tape.gradient(loss, [input_var])
                optimizer.apply_gradients(zip(grads, [input_var]))

                if step % 50 == 0:
                    input_original = self.scaler_X.inverse_transform(input_var.numpy())
                    pred_original = self.scaler_y.inverse_transform(pred.numpy())
                    history.append({
                        'step': step,
                        'loss': float(loss.numpy()),
                        'cr': float(input_original[0, 0]),
                        'cf': float(input_original[0, 1]),
                        'predicted_t': float(pred_original[0, 0])
                    })

            # Final results for this attempt
            final_loss = float(loss.numpy())
            input_original = self.scaler_X.inverse_transform(input_var.numpy())
            pred_original = self.scaler_y.inverse_transform(self.model(input_var).numpy())

            all_attempts.append({
                'attempt': attempt + 1,
                'final_loss': final_loss,
                'cr': float(input_original[0, 0]),
                'cf': float(input_original[0, 1]),
                'predicted_t': float(pred_original[0, 0]),
                'error': abs(float(pred_original[0, 0]) - desired_t),
                'history': history
            })

            if final_loss < best_loss:
                best_loss = final_loss
                best_input = input_original[0]
                best_prediction = pred_original[0, 0]

        return {
            'desired_temperature': desired_t,
            'best_cr': float(best_input[0]),
            'best_cf': float(best_input[1]),
            'predicted_temperature': float(best_prediction),
            'error': abs(float(best_prediction) - desired_t),
            'final_loss': best_loss,
            'all_attempts': all_attempts
        }

    def plot_training_history(self):
        """Plot training and validation loss"""
        if self.history is None:
            print("No training history available")
            return

        plt.figure(figsize=(10, 6))
        plt.plot(self.history.history['loss'], label='Training Loss', marker='o', markersize=3)
        plt.plot(self.history.history['val_loss'], label='Validation Loss', marker='s', markersize=3)
        plt.xlabel('Epochs', fontsize=12)
        plt.ylabel('Loss (MSE)', fontsize=12)
        plt.title('Training vs Validation Loss', fontsize=14, fontweight='bold')
        plt.legend(fontsize=10)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        return plt.gcf()

    def plot_predictions(self, y_true, y_pred):
        """Plot actual vs predicted values"""
        plt.figure(figsize=(8, 8))
        plt.scatter(y_true, y_pred, alpha=0.6, s=50)

        # Perfect prediction line
        min_val, max_val = y_true.min(), y_true.max()
        plt.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction')

        plt.xlabel("Actual Temperature (t)", fontsize=12)
        plt.ylabel("Predicted Temperature (t)", fontsize=12)
        plt.title("Predicted vs Actual Temperature", fontsize=14, fontweight='bold')
        plt.legend(fontsize=10)
        plt.grid(True, alpha=0.3)
        plt.axis('equal')
        plt.tight_layout()
        return plt.gcf()

    def plot_residuals(self, y_true, y_pred):
        """Plot residuals"""
        residuals = y_true - y_pred

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # Residual scatter plot
        axes[0].scatter(y_true, residuals, alpha=0.6, s=50)
        axes[0].axhline(0, color='red', linestyle='--', lw=2)
        axes[0].set_xlabel("Actual Temperature (t)", fontsize=12)
        axes[0].set_ylabel("Residuals", fontsize=12)
        axes[0].set_title("Residual Plot", fontsize=14, fontweight='bold')
        axes[0].grid(True, alpha=0.3)

        # Residual histogram
        axes[1].hist(residuals, bins=30, edgecolor='black', alpha=0.7)
        axes[1].axvline(0, color='red', linestyle='--', lw=2)
        axes[1].set_xlabel("Residual", fontsize=12)
        axes[1].set_ylabel("Frequency", fontsize=12)
        axes[1].set_title("Histogram of Residuals", fontsize=14, fontweight='bold')
        axes[1].grid(True, alpha=0.3, axis='y')

        plt.tight_layout()
        return fig

    def plot_inverse_optimization(self, inverse_results):
        """Plot inverse optimization convergence"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        for attempt_data in inverse_results['all_attempts']:
            history = attempt_data['history']
            steps = [h['step'] for h in history]
            losses = [h['loss'] for h in history]
            crs = [h['cr'] for h in history]
            cfs = [h['cf'] for h in history]
            temps = [h['predicted_t'] for h in history]

            label = f"Attempt {attempt_data['attempt']}"

            # Loss convergence
            axes[0, 0].plot(steps, losses, marker='o', markersize=4, label=label, alpha=0.7)

            # CR convergence
            axes[0, 1].plot(steps, crs, marker='o', markersize=4, label=label, alpha=0.7)

            # CF convergence
            axes[1, 0].plot(steps, cfs, marker='o', markersize=4, label=label, alpha=0.7)

            # Temperature convergence
            axes[1, 1].plot(steps, temps, marker='o', markersize=4, label=label, alpha=0.7)

        # Add desired temperature line
        axes[1, 1].axhline(inverse_results['desired_temperature'],
                           color='red', linestyle='--', lw=2, label='Target')

        axes[0, 0].set_xlabel('Optimization Step')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].set_title('Loss Convergence')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        axes[0, 0].set_yscale('log')

        axes[0, 1].set_xlabel('Optimization Step')
        axes[0, 1].set_ylabel('cr Value')
        axes[0, 1].set_title('CR Parameter Convergence')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        axes[1, 0].set_xlabel('Optimization Step')
        axes[1, 0].set_ylabel('cf Value')
        axes[1, 0].set_title('CF Parameter Convergence')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)

        axes[1, 1].set_xlabel('Optimization Step')
        axes[1, 1].set_ylabel('Predicted Temperature')
        axes[1, 1].set_title('Temperature Convergence')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)

        plt.suptitle(f'Inverse Optimization for T = {inverse_results["desired_temperature"]}',
                     fontsize=16, fontweight='bold', y=1.00)
        plt.tight_layout()
        return fig


# =========================
# Example Usage
# =========================
if __name__ == "__main__":
    # Initialize solver
    solver = ANNInverseSolver()

    # Load and prepare data
    print("Loading data...")
    # NOTE: Update this path to your actual file location
    X, y = solver.load_data("crcfnew.xlsx")  # Change path as needed

    print(f"Data loaded: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Feature ranges - CR: [{X[:, 0].min():.2f}, {X[:, 0].max():.2f}], "
          f"CF: [{X[:, 1].min():.2f}, {X[:, 1].max():.2f}]")
    print(f"Target range - T: [{y.min():.2f}, {y.max():.2f}]")

    # Prepare data
    X_train, X_test, y_train, y_test = solver.prepare_data(X, y)

    # Build and train model
    print("\nBuilding model...")
    solver.build_model(architecture=[30, 10, 8])

    print("Training model...")
    solver.train(X_train, y_train, epochs=350, batch_size=16, verbose=1)

    # Evaluate
    print("\nEvaluating model...")
    metrics, y_true, y_pred = solver.evaluate(X_test, y_test)
    print(f"MAE: {metrics['mae']:.4f}")
    print(f"RMSE: {metrics['rmse']:.4f}")
    print(f"R²: {metrics['r2']:.4f}")

    # Plot results
    print("\nGenerating plots...")
    solver.plot_training_history()
    plt.savefig('training_history.png', dpi=150, bbox_inches='tight')
    print("Saved: training_history.png")

    solver.plot_predictions(y_true, y_pred)
    plt.savefig('predictions.png', dpi=150, bbox_inches='tight')
    print("Saved: predictions.png")

    solver.plot_residuals(y_true, y_pred)
    plt.savefig('residuals.png', dpi=150, bbox_inches='tight')
    print("Saved: residuals.png")

    # Inverse problem
    print("\n" + "="*70)
    print("INVERSE OPTIMIZATION")
    print("="*70)

    desired_temp = 320
    # Define valid input bounds (adjust based on your data)
    input_bounds = [
        (X[:, 0].min(), X[:, 0].max()),  # CR bounds
        (X[:, 1].min(), X[:, 1].max())   # CF bounds
    ]

    print(f"\nFinding inputs for desired temperature: {desired_temp}°C")
    print(f"Input constraints: CR={input_bounds[0]}, CF={input_bounds[1]}")

    inverse_results = solver.inverse_solve(
        desired_t=desired_temp,
        input_bounds=input_bounds,
        n_attempts=5,
        steps=200,
        lr=0.1
    )

    print(f"\nBest Solution:")
    print(f"  CR = {inverse_results['best_cr']:.4f}")
    print(f"  CF = {inverse_results['best_cf']:.4f}")
    print(f"  Predicted T = {inverse_results['predicted_temperature']:.4f}°C")
    print(f"  Error = {inverse_results['error']:.4f}°C")

    print(f"\nAll {len(inverse_results['all_attempts'])} attempts:")
    for attempt in inverse_results['all_attempts']:
        print(f"  Attempt {attempt['attempt']}: "
              f"CR={attempt['cr']:.4f}, CF={attempt['cf']:.4f}, "
              f"T={attempt['predicted_t']:.4f}, Error={attempt['error']:.4f}")

    # Plot inverse optimization
    solver.plot_inverse_optimization(inverse_results)
    plt.savefig('inverse_optimization.png', dpi=150, bbox_inches='tight')
    print("\nSaved: inverse_optimization.png")

    print("\n" + "="*70)
    print("All operations completed successfully!")
    print("="*70)
