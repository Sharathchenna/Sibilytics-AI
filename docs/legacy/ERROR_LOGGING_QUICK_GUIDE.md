# Quick Implementation Guide: Error Logging

## TL;DR - 3 Simple Steps

### Step 1: Add to Backend (5 minutes)
Add structured error handling to `backend/main.py`

### Step 2: Add to Frontend (10 minutes)
Create error types and display component

### Step 3: Test (2 minutes)
Test with sample errors

---

## Detailed Steps

### 📦 Step 1: Backend Setup

#### Option A: Minimal (Quick & Easy)

Add this to your existing `backend/main.py`:

```python
# At the top, add imports
from datetime import datetime
import uuid
import traceback

# Add after your FastAPI app initialization
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all errors and return structured response"""
    error_id = f"ERR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    # Log on server
    print(f"\n❌ ERROR {error_id}: {type(exc).__name__}: {str(exc)}")
    traceback.print_exc()
    
    # Create response
    error_response = {
        "success": False,
        "error": {
            "error_id": error_id,
            "error_type": type(exc).__name__,
            "message": str(exc),
            "timestamp": datetime.utcnow().isoformat(),
        },
        "suggestion": get_error_suggestion(exc)
    }
    
    # Add stack trace in development
    if os.getenv("ENVIRONMENT", "development") == "development":
        error_response["error"]["stack_trace"] = traceback.format_tb(exc.__traceback__)
    
    return JSONResponse(
        status_code=500,
        content=error_response
    )

def get_error_suggestion(exc: Exception) -> str:
    """Quick suggestions for common errors"""
    message = str(exc).lower()
    
    if "column" in message:
        return "The specified column may not exist. Please verify column names."
    elif "class" in message:
        return "Please ensure your target column has at least 2 unique classes."
    elif "file" in message:
        return "The file may have been deleted. Please re-upload the file."
    else:
        return "Please try again or contact support if the issue persists."
```

That's it for backend! ✅

---

### 🎨 Step 2: Frontend Setup

#### A. Create Error Types

Create `frontend/types/errors.ts`:

```typescript
export interface ErrorResponse {
  success: false;
  error: {
    error_id: string;
    error_type: string;
    message: string;
    timestamp: string;
    stack_trace?: string[];
  };
  suggestion?: string;
}

export const isErrorResponse = (data: any): data is ErrorResponse => {
  return data && data.success === false && data.error;
};
```

#### B. Create Simple Error Component

Create `frontend/app/components/ErrorAlert.tsx`:

```tsx
'use client';

import { AlertCircle, X } from 'lucide-react';

interface ErrorAlertProps {
  error: any;
  onDismiss?: () => void;
}

export default function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  // Parse error
  const errorData = typeof error === 'string' 
    ? { error: { message: error, error_id: 'UNKNOWN' } }
    : error;

  const message = errorData?.error?.message || errorData?.message || 'An error occurred';
  const errorId = errorData?.error?.error_id;
  const suggestion = errorData?.suggestion;

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-red-800 mb-1">Error Occurred</h3>
              <p className="text-red-700 text-sm mb-2">{message}</p>
              {errorId && (
                <p className="text-xs text-red-600">Error ID: {errorId}</p>
              )}
              {suggestion && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800">
                    <strong>💡 Suggestion:</strong> {suggestion}
                  </p>
                </div>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-red-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### C. Update API Helper

In `frontend/lib/api.ts`, update error handling:

```typescript
// Add this helper function
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // Throw the structured error response
    throw data;
  }
  return response.json();
}

// Update your API functions to use it:
export const uploadSVMDataset = async (file: File): Promise<SVMUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/svm/upload-dataset`, {
    method: 'POST',
    body: formData,
  });

  return await handleApiResponse<SVMUploadResponse>(response);
};

// Do the same for other API functions...
```

#### D. Use in Components

In your component (e.g., `SVMClassifier.tsx`):

```tsx
import ErrorAlert from '@/app/components/ErrorAlert';

export default function SVMClassifier() {
  const [error, setError] = useState<any>(null);

  const handleUpload = async () => {
    try {
      setError(null);  // Clear previous errors
      const response = await uploadSVMDataset(selectedFile);
      // ... handle success
    } catch (err) {
      setError(err);  // Set error for display
      console.error('Upload error:', err);
    }
  };

  return (
    <div>
      {/* Show error if exists */}
      {error && (
        <ErrorAlert 
          error={error} 
          onDismiss={() => setError(null)} 
        />
      )}
      
      {/* Rest of your component */}
    </div>
  );
}
```

---

## ✅ Testing

### 1. Test Backend Error Handling

Add test endpoint to `backend/main.py`:

```python
@app.get("/api/test/error")
async def test_error():
    """Test error handling"""
    raise ValueError("This is a test error for demonstration!")
```

Visit: `http://localhost:8000/api/test/error`

Expected response:
```json
{
  "success": false,
  "error": {
    "error_id": "ERR-20251123-a1b2c3d4",
    "error_type": "ValueError",
    "message": "This is a test error for demonstration!",
    "timestamp": "2025-11-23T12:00:00.000000",
    "stack_trace": ["..."]
  },
  "suggestion": "Please try again or contact support if the issue persists."
}
```

### 2. Test Frontend Display

In your component, trigger an error:
```tsx
<button onClick={() => setError({
  error: {
    error_id: "TEST-001",
    message: "Test error message",
  },
  suggestion: "This is a test suggestion"
})}>
  Test Error Display
</button>
```

You should see a nice red alert box with the error! ✅

---

## 🎯 Benefits You Get

1. **🔍 Trackable Errors:** Every error has a unique ID
2. **💡 Helpful Suggestions:** Users know what to do next
3. **🐛 Easy Debugging:** Stack traces in development
4. **😊 Better UX:** Professional error messages
5. **🔒 Secure:** No sensitive info in production

---

## 📊 What It Looks Like

### Development Mode:
```
❌ Error Occurred
The specified column may not exist in the dataset.

Error ID: ERR-20251123-a1b2c3d4
Type: KeyError

💡 Suggestion: The specified column may not exist. Please verify column names.

[Show Technical Details ▼]
```

### Production Mode:
```
❌ Error Occurred
An error occurred while processing your request.

Error ID: ERR-20251123-a1b2c3d4

💡 Suggestion: Please try again or contact support if the issue persists.
```

---

## 🚀 Next Steps

After basic implementation:

1. ✅ Add error logging to all API calls
2. ✅ Test with different error scenarios
3. ✅ Customize suggestions for your use cases
4. ✅ Add error tracking service (optional: Sentry, LogRocket)

---

## 💻 Complete File Structure

```
backend/
  main.py  (add exception handler)

frontend/
  types/
    errors.ts  (NEW)
  app/
    components/
      ErrorAlert.tsx  (NEW)
      SVMClassifier.tsx  (update to use ErrorAlert)
  lib/
    api.ts  (update error handling)
```

---

## 🆘 Common Issues

**Q: Error not displaying in frontend?**  
A: Check browser console for the actual error object

**Q: Stack traces not showing?**  
A: Make sure `ENVIRONMENT=development` in backend `.env`

**Q: Getting CORS errors?**  
A: This is a different issue - errors should still be caught

---

## 📝 Checklist

Backend:
- [ ] Added exception handler to main.py
- [ ] Added get_error_suggestion function
- [ ] Tested with `/api/test/error` endpoint

Frontend:
- [ ] Created errors.ts types file
- [ ] Created ErrorAlert.tsx component
- [ ] Updated api.ts with handleApiResponse
- [ ] Updated components to use ErrorAlert
- [ ] Tested error display

---

**Time to implement:** ~20 minutes  
**Difficulty:** Easy  
**Impact:** High 🎉
