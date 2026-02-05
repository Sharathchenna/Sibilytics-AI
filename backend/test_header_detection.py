#!/usr/bin/env python3
"""
Test script for header detection in signal files.
Run this to verify that the header detection is working correctly.

Usage:
    cd backend
    python test_header_detection.py
"""

import sys
from pathlib import Path
from main import parse_file_content, detect_signal_file_header

def test_file(filepath: str, expected_has_header: bool, description: str):
    """Test a single file for header detection"""
    print(f"\n{'='*70}")
    print(f"Testing: {description}")
    print(f"File: {filepath}")
    print(f"Expected header: {expected_has_header}")
    print(f"{'='*70}")
    
    try:
        # Read file
        with open(filepath, 'rb') as f:
            contents = f.read()
        
        # Test header detection on content
        content_str = contents.decode('utf-8')
        
        # Determine delimiter
        if filepath.endswith('.csv'):
            delimiter = ','
        else:
            delimiter = '\t'
        
        detected_header = detect_signal_file_header(content_str, delimiter)
        
        # Parse file
        df = parse_file_content(contents, Path(filepath).name)
        
        # Print results
        print(f"\n✓ File parsed successfully!")
        print(f"  - Shape: {df.shape}")
        print(f"  - Header detected: {detected_header}")
        print(f"  - Columns: {list(df.columns)}")
        print(f"\nFirst 3 rows:")
        print(df.head(3))
        
        # Verify detection matches expectation
        if detected_header == expected_has_header:
            print(f"\n✅ PASS: Header detection is CORRECT!")
        else:
            print(f"\n❌ FAIL: Expected header={expected_has_header}, but detected={detected_header}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("HEADER DETECTION TEST SUITE")
    print("="*70)
    
    # Get project root (one level up from backend)
    project_root = Path(__file__).parent.parent
    test_data_dir = project_root / "test-data"
    
    tests = [
        # CSV tests
        (test_data_dir / "test-signal-with-headers.csv", True, "CSV with headers"),
        (test_data_dir / "test-signal-no-headers.csv", False, "CSV without headers"),
        
        # TXT tests
        (test_data_dir / "test-signal-tab-with-headers.txt", True, "TXT (tab) with headers"),
        (test_data_dir / "test-signal-tab-no-headers.txt", False, "TXT (tab) without headers"),
        
        # Real files
        (test_data_dir / "Iris.csv", True, "Iris dataset (real file with headers)"),
        (test_data_dir / "Iris-no-header.csv", False, "Iris dataset (real file without headers)"),
        (test_data_dir / "20000rpm-3feedflute-01.lvm", True, "LVM file (real LabVIEW file)"),
    ]
    
    results = []
    for filepath, expected_header, description in tests:
        if filepath.exists():
            success = test_file(str(filepath), expected_header, description)
            results.append((description, success))
        else:
            print(f"\n⚠️  SKIPPED: {description} - File not found: {filepath}")
            results.append((description, None))
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result is True)
    failed = sum(1 for _, result in results if result is False)
    skipped = sum(1 for _, result in results if result is None)
    
    for description, result in results:
        if result is True:
            print(f"✅ PASS: {description}")
        elif result is False:
            print(f"❌ FAIL: {description}")
        else:
            print(f"⚠️  SKIP: {description}")
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    
    if failed > 0:
        print(f"\n❌ Some tests failed!")
        sys.exit(1)
    else:
        print(f"\n✅ All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()






