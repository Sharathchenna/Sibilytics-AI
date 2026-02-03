# LVM File Parsing Fix

## Issue
The signal processing backend was only working with `thinwall-20micron-cut1.lvm` but not with `20000rpm-3feedflute-01.lvm`.

## Root Cause
The two LVM files have completely different structures:

### File 1: `thinwall-20micron-cut1.lvm`
- **No header** - starts directly with numerical data
- Format: Tab-delimited data starting from line 1
- Example:
```
0.000000	-0.019684	-0.049546	-0.001717	-0.722714	-1.050403	-2.166495
1.953125E-5	0.006859	-0.069176	-0.024668	-0.481122	-0.682589	-1.026855
```

### File 2: `20000rpm-3feedflute-01.lvm`
- **Has LabVIEW header** - Contains metadata section
- Format: LabVIEW Measurement file with proper header
- Structure:
```
LabVIEW Measurement	
Writer_Version	2
Reader_Version	2
...
***End_of_Header***	

Channels	3			
Samples	500	500	500	
...
***End_of_Header***				
X_Value	Force_0	Force_1	Force_2	Comment
0.000000	0.326791	-0.190249	-0.438450
```

The backend was treating all `.lvm` files identically, which only worked for files without headers.

## Solution
Enhanced the `parse_file_content()` function in `/backend/main.py` to:

1. **Detect LabVIEW headers** by checking if file starts with `"LabVIEW Measurement"`
2. **Skip header sections** by finding the last occurrence of `***End_of_Header***`
3. **Skip column name rows** if present (e.g., `X_Value	Force_0	Force_1`)
4. **Parse only the numerical data** portion

### Implementation Details

```python
# Check if this is a LabVIEW file with header
if content_str.startswith('LabVIEW Measurement'):
    # Find the last occurrence of ***End_of_Header***
    lines = content_str.split('\n')
    data_start_idx = 0
    
    for idx, line in enumerate(lines):
        if '***End_of_Header***' in line:
            data_start_idx = idx + 1
    
    # Skip the header line (X_Value, Force_0, etc.) if present
    if data_start_idx < len(lines):
        next_line = lines[data_start_idx].strip()
        if next_line and not next_line[0].isdigit() and not next_line[0] == '-':
            data_start_idx += 1
    
    # Parse from data start
    data_content = '\n'.join(lines[data_start_idx:])
    df = pd.read_csv(StringIO(data_content), delimiter='\t', header=None)
```

## Testing

The fix now supports both LVM file formats:

### Format 1: Direct Data (thinwall-style)
✅ Works - parsed as before

### Format 2: LabVIEW Header (20000rpm-style)
✅ Works - headers are properly skipped

## Benefits

1. **Backward Compatible**: Files without headers continue to work
2. **Standard Compliant**: Properly handles official LabVIEW LVM format
3. **Robust**: Detects format automatically, no user configuration needed
4. **Flexible**: Works with various column counts and data types

## Files Modified

- `/backend/main.py` - Enhanced `parse_file_content()` function (lines 48-91)

## Date
November 23, 2025

