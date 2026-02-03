# Header Detection Fix - Code Changes Reference

## Files Modified

- ✅ `backend/main.py` - Lines 48-241

## Summary of Changes

### 1. Added New Function (Lines 48-105)

```python
def detect_signal_file_header(content_str: str, delimiter: str = ',') -> bool:
    """
    Detect if a signal file (CSV/TXT/LVM) has a header row.
    Uses the same robust logic as SVM classification header detection.
    """
    # ... implementation ...
```

**Purpose:** Intelligent header detection by analyzing multiple rows and comparing numeric vs non-numeric content.

### 2. Modified LVM Header Detection (Lines 137-155)

**Before:**
```python
# OLD CODE - Only checked first character
next_line = lines[data_start_idx].strip()
if next_line and not next_line[0].isdigit() and not next_line[0] == '-':
    data_start_idx += 1
```

**After:**
```python
# NEW CODE - Checks ALL cells in the row
if next_line:
    cells = next_line.split('\t')
    has_non_numeric = False
    for cell in cells:
        cell_stripped = cell.strip()
        if cell_stripped:
            try:
                float(cell_stripped)
            except ValueError:
                has_non_numeric = True
                break
    
    if has_non_numeric:
        data_start_idx += 1
        print(f"[PARSE] Detected column header in LVM file, skipping line: {next_line[:50]}")
```

### 3. Added Header Detection for TXT Files (Lines 161-171)

**Before:**
```python
# OLD CODE - Always assumed no headers
df = pd.read_csv(StringIO(content_str), delimiter='\t', header=None)
```

**After:**
```python
# NEW CODE - Detects headers automatically
has_header = detect_signal_file_header(content_str, '\t')
if has_header:
    print(f"[PARSE] Detected header in TXT/LVM file")
    df = pd.read_csv(StringIO(content_str), delimiter='\t')
    # Convert column names to indices for consistency
    df.columns = range(len(df.columns))
else:
    print(f"[PARSE] No header detected in TXT/LVM file")
    df = pd.read_csv(StringIO(content_str), delimiter='\t', header=None)
```

### 4. Added Header Detection for CSV Files (Lines 173-209)

**Before:**
```python
# OLD CODE - Always used header=None
for delimiter in [',', '\t', ';']:
    try:
        df = pd.read_csv(StringIO(content_str), delimiter=delimiter, header=None)
        if df.shape[1] > 1:
            break
    except:
        continue
```

**After:**
```python
# NEW CODE - Detects headers for each delimiter
for delimiter in [',', '\t', ';']:
    try:
        has_header = detect_signal_file_header(content_str, delimiter)
        
        if has_header:
            print(f"[PARSE] Detected header in CSV file (delimiter: '{delimiter}')")
            df = pd.read_csv(StringIO(content_str), delimiter=delimiter)
            df.columns = range(len(df.columns))
        else:
            print(f"[PARSE] No header detected in CSV file (delimiter: '{delimiter}')")
            df = pd.read_csv(StringIO(content_str), delimiter=delimiter, header=None)
        
        if df.shape[1] > 1:
            break
    except Exception as parse_error:
        print(f"[PARSE] Failed with delimiter '{delimiter}': {parse_error}")
        continue
```

### 5. Improved Excel Header Detection (Lines 211-230)

**Before:**
```python
# OLD CODE - Always used header=None
df = pd.read_excel(BytesIO(contents), header=None, engine='openpyxl')
```

**After:**
```python
# NEW CODE - Detects numeric vs text column names
df_test = pd.read_excel(BytesIO(contents), nrows=2, engine='openpyxl')
if len(df_test) >= 1:
    first_col = str(df_test.columns[0])
    is_numeric_header = first_col.replace('.', '', 1).replace('-', '', 1).replace('e', '', 1).replace('E', '', 1).replace('+', '', 1).isdigit()
    
    if is_numeric_header:
        print(f"[PARSE] No header detected in Excel file")
        df = pd.read_excel(BytesIO(contents), header=None, engine='openpyxl')
    else:
        print(f"[PARSE] Detected header in Excel file")
        df = pd.read_excel(BytesIO(contents), engine='openpyxl')
        df.columns = range(len(df.columns))
```

### 6. Added Success/Error Logging (Lines 237-241)

**New:**
```python
print(f"[PARSE] Successfully parsed {filename}: shape={df.shape}")
return df
except Exception as e:
    print(f"[PARSE ERROR] Failed to parse {filename}: {str(e)}")
    raise ValueError(f"Error parsing {file_ext} file: {str(e)}")
```

## Key Implementation Details

### Column Name Normalization

After detecting and reading files with headers, column names are converted to numeric indices:

```python
df.columns = range(len(df.columns))
```

This ensures:
- Signal processing code can use column indices (0, 1, 2...) consistently
- No breaking changes to existing code that expects numeric column indices
- Headers are properly handled during parsing but don't affect downstream processing

### Default Behavior

When uncertain, the system defaults to:
- **Signal files (CSV/TXT/LVM):** Assume NO header (conservative approach)
- **SVM files:** Assume HAS header (matching user expectations for ML datasets)

This is intentional to prevent accidentally treating data rows as headers in signal processing.

## Testing the Changes

### View Logs in Real-Time

```bash
# If running with Docker:
docker logs -f backend-container

# If running locally:
cd backend
python main.py
```

### Upload a File and Check Logs

You should see output like:
```
[PARSE] Detected header in CSV file (delimiter: ',')
[PARSE] Successfully parsed Iris.csv: shape=(150, 5)
```

Or:
```
[PARSE] No header detected in CSV file (delimiter: ',')
[PARSE] Successfully parsed signal_data.csv: shape=(830000, 2)
```

## Rollback Instructions (If Needed)

If you need to revert these changes:

```bash
cd backend
git diff main.py  # Review changes
git checkout main.py  # Revert to previous version
```

## Related Files

- `backend/main.py` - Main implementation (MODIFIED)
- `docs/SIGNAL_FILE_HEADER_DETECTION_ISSUE.md` - Detailed problem analysis and solution
- `docs/SIGNAL_HEADER_FIX_SUMMARY.md` - User-friendly summary

## Questions?

Check the documentation files or review the backend logs for detailed information about how files are being parsed.







