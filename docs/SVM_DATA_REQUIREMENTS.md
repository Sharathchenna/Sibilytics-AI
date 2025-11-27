# SVM Classification - Data Requirements

## Overview
This document describes the data requirements for the SVM (Support Vector Machine) Classification feature.

## Feature Column Requirements

### ✅ Feature Columns (X and Y axes)
- **MUST be numeric values only**
- Examples of valid feature data:
  - Integers: `1, 2, 3, 100, -5`
  - Decimals: `1.5, 2.3, -0.45, 99.99`
  - Scientific notation: `1.5e-3, 2.0e2`

- Examples of **INVALID** feature data:
  - Text strings: `"low", "medium", "high"`
  - Mixed text/numbers: `"5cm", "10kg"`
  - Dates: `"2024-01-01"`
  - Boolean text: `"true", "false"`

### ✅ Target/Class Column
- **Can be either text or numeric values**
- The target column represents the class labels you want to predict
- Examples of valid target/class data:
  - Text labels: `"setosa", "versicolor", "virginica"`
  - Numeric labels: `0, 1, 2`
  - Mixed but consistent: `"Class_1", "Class_2", "Class_3"`

## Why This Requirement?

SVM algorithms require numerical feature inputs to:
1. Calculate distances between data points
2. Find optimal decision boundaries (hyperplanes)
3. Perform mathematical operations (dot products, kernel transformations)

The target/class labels are only used for classification grouping, so they can be text values.

## Data Preparation Examples

### ❌ Example 1: Invalid Data (Text Features)
```csv
Size,Weight,Category
small,light,A
medium,heavy,B
large,light,C
```
**Problem:** "Size" and "Weight" columns contain text

### ✅ Example 1: Valid Data (After Conversion)
```csv
Size,Weight,Category
1,1,A
2,3,B
3,1,C
```
**Solution:** Convert text features to numbers:
- small=1, medium=2, large=3
- light=1, heavy=3

### ✅ Example 2: Valid Iris Dataset
```csv
sepal_length,sepal_width,species
5.1,3.5,setosa
4.9,3.0,setosa
6.2,2.9,versicolor
```
**Valid:** Features are numeric, target (species) can be text

## Converting Text Features to Numbers

If your dataset has text features, you need to encode them before uploading:

### Manual Encoding
1. **Ordinal Encoding** (for ordered categories):
   - Small = 1, Medium = 2, Large = 3
   - Low = 1, Medium = 2, High = 3

2. **Arbitrary Numeric Mapping**:
   - Red = 1, Blue = 2, Green = 3

### Using Excel/Spreadsheet
1. Create a mapping table
2. Use VLOOKUP or IF statements to replace text with numbers

### Using Python/Pandas
```python
import pandas as pd

# Load your data
df = pd.read_csv('data.csv')

# Option 1: Manual mapping
mapping = {'small': 1, 'medium': 2, 'large': 3}
df['Size'] = df['Size'].map(mapping)

# Option 2: Automatic label encoding
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
df['Size'] = le.fit_transform(df['Size'])

# Save converted data
df.to_csv('data_converted.csv', index=False)
```

## Validation Checklist

Before uploading your dataset, verify:
- [ ] Feature columns contain only numbers (integers or decimals)
- [ ] No text values in feature columns
- [ ] Target/class column is present (can be text or numbers)
- [ ] At least 2 different classes in target column
- [ ] No missing values in feature or target columns
- [ ] File format is .csv or .xlsx

## Error Messages

If you try to use text features, you may see errors like:
- `"could not convert string to float"`
- `"Training failed"`
- Unexpected results or poor model performance

## Getting Help

If you have text features that need encoding:
1. Review the conversion examples above
2. Use spreadsheet formulas for simple mappings
3. Use Python/Pandas for complex datasets
4. Ensure all feature columns are numeric before uploading

## Related Documentation
- See sample datasets in project root:
  - `Iris.csv` - Valid example with numeric features
  - `E-commerce Customer Behavior - Sheet1.csv` - Complex dataset example

---

**Last Updated:** 2025-11-23


