# Test Files for Header Detection

This directory contains test files to verify the signal file header detection functionality.

## Test Files

### CSV Files (Comma-delimited)

#### `test-signal-with-headers.csv`
- **Format:** CSV with comma delimiter
- **Headers:** `Time_s,Amplitude_V,Force_N`
- **Rows:** 41 data rows (plus 1 header row)
- **Columns:** 3
- **Purpose:** Test header detection for CSV files

#### `test-signal-no-headers.csv`
- **Format:** CSV with comma delimiter
- **Headers:** None
- **Rows:** 41 data rows
- **Columns:** 3
- **Purpose:** Test that CSV files without headers are correctly parsed

### TXT Files (Tab-delimited)

#### `test-signal-tab-with-headers.txt`
- **Format:** TXT with tab delimiter
- **Headers:** `Time\tSignal\tForce`
- **Rows:** 31 data rows (plus 1 header row)
- **Columns:** 3
- **Purpose:** Test header detection for tab-delimited TXT files

#### `test-signal-tab-no-headers.txt`
- **Format:** TXT with tab delimiter
- **Headers:** None
- **Rows:** 31 data rows
- **Columns:** 3
- **Purpose:** Test that TXT files without headers are correctly parsed

## Running Tests

### Automated Test Suite

Run all tests at once:

```bash
cd backend
python test_header_detection.py
```

Expected output:
```
✅ All tests passed!
Total: 7 tests
Passed: 7
Failed: 0
Skipped: 0
```

### Manual Testing via API

#### 1. Start the Backend

```bash
cd backend
python main.py
```

#### 2. Upload a Test File

**CSV with headers:**
```bash
curl -X POST http://localhost:8000/api/upload-with-progress \
  -F "file=@test-signal-with-headers.csv"
```

**Expected response:**
```json
{
  "filename": "test-signal-with-headers.csv",
  "file_id": "abc123_test-signal-with-headers.csv",
  "columns": 3,
  "rows": 41,
  "status": "success"
}
```

**Check backend logs:**
```
[PARSE] Detected header in CSV file (delimiter: ',')
[PARSE] Successfully parsed test-signal-with-headers.csv: shape=(41, 3)
```

#### 3. Process the Signal

```bash
curl -X POST http://localhost:8000/api/process \
  -F "file_id=abc123_test-signal-with-headers.csv" \
  -F "time_column=0" \
  -F "signal_column=1" \
  -F "wavelet_type=db4" \
  -F "n_levels=3"
```

## Test Data Format

All test files contain synthetic signal data with:
- **Time column:** Evenly spaced timestamps (0.00000 to 0.00200 seconds)
- **Signal columns:** Synthetic amplitude values (-1.0 to 1.0)
- **Sample rate:** 20 kHz equivalent spacing

Example data:
```
Time_s,Amplitude_V,Force_N
0.00000,0.123456,-0.234567
0.00005,0.234567,-0.345678
0.00010,0.345678,-0.456789
```

## Verifying Header Detection

### Files WITH Headers

When a file WITH headers is uploaded, you should see:

**Backend logs:**
```
[PARSE] Detected header in CSV file (delimiter: ',')
[PARSE] Successfully parsed test-signal-with-headers.csv: shape=(41, 3)
```

**First data row should be:** `0.00000, 0.123456, -0.234567` (NOT the header text)

### Files WITHOUT Headers

When a file WITHOUT headers is uploaded, you should see:

**Backend logs:**
```
[PARSE] No header detected in CSV file (delimiter: ',')
[PARSE] Successfully parsed test-signal-no-headers.csv: shape=(41, 3)
```

**First data row should be:** `0.00000, 0.123456, -0.234567`

## Troubleshooting

### Test fails with "File not found"

Make sure you're running the test from the correct directory:
```bash
cd /path/to/Dop-Project/backend
python test_header_detection.py
```

### Backend can't parse a test file

Check the backend logs for `[PARSE ERROR]` messages:
```bash
# If using Docker:
docker logs -f backend-container

# If running locally:
python backend/main.py
```

### Header detected incorrectly

The detection algorithm checks:
1. Are all cells in the first row numeric? → No header
2. Does first row have fewer numeric cells than second row? → Has header
3. Are the first 2-3 rows similar patterns? → No header

If detection is wrong, file a bug report with:
- The test file
- Expected behavior
- Actual behavior
- Backend logs

## Real File Tests

The test suite also tests with real files:

- ✅ `Iris.csv` - 150 rows, 5 columns, has headers
- ✅ `Iris-no-header.csv` - 20 rows, 5 columns, no headers  
- ✅ `20000rpm-3feedflute-01.lvm` - 222,500 rows, 4 columns, LabVIEW format with headers

These verify that the fix works with actual production data.

## Test Results

See `docs/HEADER_DETECTION_TEST_RESULTS.md` for detailed test results and analysis.

## Adding New Test Cases

To add a new test case:

1. Create the test file in the project root
2. Add it to the `tests` list in `backend/test_header_detection.py`:

```python
tests = [
    # ... existing tests ...
    (project_root / "your-new-test-file.csv", True, "Description of your test"),
]
```

3. Run the test suite:
```bash
cd backend
python test_header_detection.py
```

## Documentation

For more information, see:
- `docs/SIGNAL_FILE_HEADER_DETECTION_ISSUE.md` - Original problem analysis
- `docs/SIGNAL_HEADER_FIX_SUMMARY.md` - Fix summary
- `docs/HEADER_FIX_CODE_CHANGES.md` - Code changes reference
- `docs/HEADER_DETECTION_TEST_RESULTS.md` - Test results and analysis






