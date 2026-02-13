import numpy as np
import main

# Test the safe_float function
test_values = [1.0, float('inf'), float('-inf'), float('nan'), 0.0, -5.0]

print("Testing safe_float function:")
for val in test_values:
    result = main.safe_float(val)
    print(f"{val} -> {result}")

# Test with dummy signal
print("\nTesting calculate_statistical_data:")
signal = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
noise = np.array([0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.1, 0.2])
fs = 20000  # Test sampling frequency

try:
    stats = main.calculate_statistical_data(signal, noise, fs)
    print("Success! Statistics computed:")
    print(f"Mean: {stats['Mean']}")
    print(f"Std Dev: {stats['Std Dev']}")
    print(f"RMS: {stats['RMS']}")
    print(f"All values are JSON-safe: {all(np.isfinite(float(v)) for v in stats.values() if isinstance(v, (int, float)))}")
except Exception as e:
    print(f"Error: {e}")

