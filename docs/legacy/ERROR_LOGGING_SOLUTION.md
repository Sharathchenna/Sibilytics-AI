# Backend to Frontend Error Logging Solution

## Overview
Comprehensive error logging system that sends structured error information from backend to frontend, with environment-aware detail levels (verbose in development, minimal in production).

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Error Occurs                                      │   │
│  │     ↓                                                 │   │
│  │  2. Custom Exception Handler Catches                 │   │
│  │     ↓                                                 │   │
│  │  3. Log to Server (always)                           │   │
│  │     ↓                                                 │   │
│  │  4. Create Structured Error Response                 │   │
│  │     - Error message                                  │   │
│  │     - Error code/type                                │   │
│  │     - Timestamp                                      │   │
│  │     - Stack trace (dev only)                         │   │
│  │     - Request context                                │   │
│  │     ↓                                                 │   │
│  │  5. Send JSON Response                               │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP Response
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                       Frontend                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Catch API Error                                   │   │
│  │     ↓                                                 │   │
│  │  2. Parse Error Response                             │   │
│  │     ↓                                                 │   │
│  │  3. Display in ErrorDisplay Component                │   │
│  │     - User-friendly message                          │   │
│  │     - Expandable details (dev)                       │   │
│  │     - Copy to clipboard button                       │   │
│  │     - Stack trace viewer (dev)                       │   │
│  │     ↓                                                 │   │
│  │  4. Log to Browser Console                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Backend: Structured Error Response

#### A. Create Error Models (`backend/main.py`)

```python
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import traceback
import os
from datetime import datetime

# Environment detection
IS_DEVELOPMENT = os.getenv("ENVIRONMENT", "development") == "development"

class ErrorDetail(BaseModel):
    """Detailed error information"""
    error_id: str  # Unique error ID for tracking
    error_type: str  # Type of error (ValueError, HTTPException, etc.)
    message: str  # User-friendly error message
    detail: Optional[str] = None  # Technical details
    timestamp: str  # When the error occurred
    endpoint: Optional[str] = None  # Which endpoint failed
    request_id: Optional[str] = None  # Request tracking ID
    
    # Development-only fields
    stack_trace: Optional[List[str]] = None  # Full stack trace
    context: Optional[Dict[str, Any]] = None  # Additional context
    line_number: Optional[int] = None  # Where error occurred
    file_path: Optional[str] = None  # Which file
    
class ErrorResponse(BaseModel):
    """Standard error response structure"""
    success: bool = False
    error: ErrorDetail
    suggestion: Optional[str] = None  # Helpful suggestion to fix
```

#### B. Create Global Exception Handler

```python
import uuid
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

def generate_error_id() -> str:
    """Generate unique error ID"""
    return f"ERR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler that catches all unhandled exceptions
    and returns structured error responses
    """
    error_id = generate_error_id()
    timestamp = datetime.utcnow().isoformat()
    
    # Log error on server (always)
    print(f"\n{'='*70}")
    print(f"[ERROR {error_id}] {timestamp}")
    print(f"Endpoint: {request.method} {request.url.path}")
    print(f"Error Type: {type(exc).__name__}")
    print(f"Message: {str(exc)}")
    print(f"{'='*70}\n")
    traceback.print_exc()
    
    # Prepare error detail
    error_detail = ErrorDetail(
        error_id=error_id,
        error_type=type(exc).__name__,
        message=str(exc),
        timestamp=timestamp,
        endpoint=f"{request.method} {request.url.path}"
    )
    
    # Add development-only information
    if IS_DEVELOPMENT:
        tb = traceback.extract_tb(exc.__traceback__)
        error_detail.stack_trace = traceback.format_tb(exc.__traceback__)
        error_detail.context = {
            "query_params": dict(request.query_params),
            "path_params": dict(request.path_params),
        }
        if tb:
            last_frame = tb[-1]
            error_detail.line_number = last_frame.lineno
            error_detail.file_path = last_frame.filename
    
    # Create suggestion based on error type
    suggestion = get_error_suggestion(exc)
    
    error_response = ErrorResponse(
        error=error_detail,
        suggestion=suggestion
    )
    
    # Determine HTTP status code
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
    elif isinstance(exc, ValueError):
        status_code = status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, FileNotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.dict(exclude_none=not IS_DEVELOPMENT)
    )

def get_error_suggestion(exc: Exception) -> Optional[str]:
    """Provide helpful suggestions based on error type"""
    error_type = type(exc).__name__
    message = str(exc).lower()
    
    suggestions = {
        "FileNotFoundError": "The file may have been deleted or the session expired. Please re-upload the file.",
        "ValueError": "Please check your input values and try again.",
        "KeyError": "A required field is missing. Please ensure all required fields are provided.",
        "ConnectionError": "Cannot connect to the service. Please check your internet connection.",
        "TimeoutError": "The request took too long. Please try again with a smaller dataset.",
    }
    
    # Check for specific error patterns
    if "column" in message:
        return "The specified column may not exist in the dataset. Please verify column names."
    elif "header" in message or "delimiter" in message:
        return "There may be an issue with the file format. Please check if the file has proper headers and delimiters."
    elif "memory" in message:
        return "The dataset is too large. Please try with a smaller file or reduce the data size."
    elif "classes" in message or "class" in message:
        return "Please ensure your target column has at least 2 unique classes for classification."
    
    return suggestions.get(error_type, "An unexpected error occurred. Please try again or contact support.")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors (e.g., wrong parameter types)"""
    error_id = generate_error_id()
    
    error_detail = ErrorDetail(
        error_id=error_id,
        error_type="ValidationError",
        message="Invalid request parameters",
        detail=str(exc.errors()) if IS_DEVELOPMENT else "Please check your input parameters",
        timestamp=datetime.utcnow().isoformat(),
        endpoint=f"{request.method} {request.url.path}"
    )
    
    if IS_DEVELOPMENT:
        error_detail.context = {"validation_errors": exc.errors()}
    
    error_response = ErrorResponse(
        error=error_detail,
        suggestion="Please verify that all required fields are provided with correct data types."
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.dict(exclude_none=not IS_DEVELOPMENT)
    )
```

#### C. Add Request ID Middleware

```python
import contextvars

# Store request ID in context
request_id_var = contextvars.ContextVar('request_id', default=None)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request"""
    request_id = str(uuid.uuid4())[:8]
    request_id_var.set(request_id)
    
    # Add to request state
    request.state.request_id = request_id
    
    # Process request
    response = await call_next(request)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response
```

### 2. Frontend: Error Display Component

#### A. Create Error Types (`frontend/types/errors.ts`)

```typescript
export interface ErrorDetail {
  error_id: string;
  error_type: string;
  message: string;
  detail?: string;
  timestamp: string;
  endpoint?: string;
  request_id?: string;
  
  // Development only
  stack_trace?: string[];
  context?: Record<string, any>;
  line_number?: number;
  file_path?: string;
}

export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
  suggestion?: string;
}

export const isErrorResponse = (data: any): data is ErrorResponse => {
  return data && data.success === false && data.error;
};
```

#### B. Error Display Component (`frontend/app/components/ErrorDisplay.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';
import type { ErrorResponse } from '@/types/errors';

interface ErrorDisplayProps {
  error: ErrorResponse | Error | string;
  onDismiss?: () => void;
}

export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse error into structured format
  const errorData: ErrorResponse = typeof error === 'string' 
    ? {
        success: false,
        error: {
          error_id: 'UNKNOWN',
          error_type: 'Error',
          message: error,
          timestamp: new Date().toISOString(),
        }
      }
    : error instanceof Error
    ? {
        success: false,
        error: {
          error_id: 'CLIENT-ERROR',
          error_type: error.name,
          message: error.message,
          timestamp: new Date().toISOString(),
          stack_trace: error.stack?.split('\n'),
        }
      }
    : error;

  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasDetails = errorData.error.detail || errorData.error.stack_trace || errorData.error.context;

  const copyToClipboard = () => {
    const errorText = JSON.stringify(errorData, null, 2);
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 animate-fade-in">
      {/* Main Error Message */}
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-red-800">
              Error Occurred
            </h3>
            <div className="flex items-center gap-2">
              {/* Copy Button */}
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-red-100 rounded transition-colors"
                title="Copy error details"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-red-600" />
                )}
              </button>
              
              {/* Dismiss Button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100 rounded transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          <p className="text-red-700 font-medium mb-2">
            {errorData.error.message}
          </p>

          {/* Error ID and Timestamp */}
          <div className="flex flex-wrap gap-4 text-xs text-red-600 mb-2">
            <span>
              <strong>Error ID:</strong> {errorData.error.error_id}
            </span>
            <span>
              <strong>Type:</strong> {errorData.error.error_type}
            </span>
            <span>
              <strong>Time:</strong> {new Date(errorData.error.timestamp).toLocaleString()}
            </span>
            {errorData.error.endpoint && (
              <span>
                <strong>Endpoint:</strong> {errorData.error.endpoint}
              </span>
            )}
          </div>

          {/* Suggestion */}
          {errorData.suggestion && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>💡 Suggestion:</strong> {errorData.suggestion}
              </p>
            </div>
          )}

          {/* Expandable Details (Development Only) */}
          {isDevelopment && hasDetails && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Technical Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Technical Details
                  </>
                )}
              </button>

              {expanded && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-300 max-h-96 overflow-auto">
                  {/* Detail Message */}
                  {errorData.error.detail && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-red-800 mb-1">Detail:</h4>
                      <pre className="text-xs text-red-700 whitespace-pre-wrap">
                        {errorData.error.detail}
                      </pre>
                    </div>
                  )}

                  {/* File Location */}
                  {errorData.error.file_path && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-red-800 mb-1">Location:</h4>
                      <p className="text-xs text-red-700">
                        {errorData.error.file_path}
                        {errorData.error.line_number && `:${errorData.error.line_number}`}
                      </p>
                    </div>
                  )}

                  {/* Context */}
                  {errorData.error.context && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-red-800 mb-1">Context:</h4>
                      <pre className="text-xs text-red-700 whitespace-pre-wrap">
                        {JSON.stringify(errorData.error.context, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Stack Trace */}
                  {errorData.error.stack_trace && (
                    <div>
                      <h4 className="font-semibold text-red-800 mb-1">Stack Trace:</h4>
                      <pre className="text-xs text-red-700 whitespace-pre font-mono">
                        {errorData.error.stack_trace.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### C. Update API Helper (`frontend/lib/api.ts`)

```typescript
import type { ErrorResponse } from '@/types/errors';

// Enhanced error handling wrapper
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      
      // Check if it's our structured error response
      if (errorData.error && errorData.success === false) {
        throw errorData as ErrorResponse;
      }
      
      // Fallback for non-structured errors
      throw new Error(errorData.detail || errorData.message || 'API request failed');
    }
    
    // Non-JSON error
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

// Example usage in existing functions
export const uploadSVMDataset = async (file: File): Promise<SVMUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/svm/upload-dataset`, {
      method: 'POST',
      body: formData,
    });

    return await handleApiResponse<SVMUploadResponse>(response);
  } catch (error) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error] uploadSVMDataset:', error);
    }
    throw error;
  }
};
```

#### D. Usage in Components

```tsx
import ErrorDisplay from '@/app/components/ErrorDisplay';
import type { ErrorResponse } from '@/types/errors';
import { isErrorResponse } from '@/types/errors';

export default function SVMClassifier() {
  const [error, setError] = useState<ErrorResponse | string | null>(null);

  const handleUpload = async () => {
    try {
      setError(null);
      const response = await uploadSVMDataset(selectedFile);
      // ... handle success
    } catch (err) {
      // Handle structured error response
      if (isErrorResponse(err)) {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div>
      {/* Error Display */}
      {error && (
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)} 
        />
      )}
      
      {/* Rest of component */}
    </div>
  );
}
```

## Features

### ✅ Structured Error Responses
- Unique error IDs for tracking
- Error type classification
- Timestamps for debugging
- Request context

### ✅ Environment-Aware Detail Levels
- **Development:** Full stack traces, context, line numbers
- **Production:** User-friendly messages only

### ✅ User Experience
- Copy error details to clipboard
- Expandable technical details (dev only)
- Helpful suggestions for common errors
- Dismiss functionality
- Visual feedback (icons, colors)

### ✅ Developer Experience
- Consistent error format
- Easy to debug with error IDs
- Stack traces in development
- Request tracking with unique IDs
- Console logging

### ✅ Security
- No sensitive data in production errors
- Stack traces only in development
- Sanitized error messages

## Testing

### Test Error Handling:

```python
# Backend: Add test endpoint
@app.get("/api/test/error")
async def test_error():
    """Test endpoint to trigger errors"""
    raise ValueError("This is a test error!")

@app.get("/api/test/not-found")
async def test_not_found():
    raise FileNotFoundError("Test file not found")
```

## Environment Configuration

```bash
# .env (Backend)
ENVIRONMENT=development  # or 'production'
```

```bash
# .env.local (Frontend)
NODE_ENV=development  # or 'production'
```

## Benefits

1. **Better Debugging:** Error IDs help track issues across logs
2. **Improved UX:** Users get helpful suggestions instead of technical jargon
3. **Faster Issue Resolution:** Stack traces and context speed up debugging
4. **Professional:** Consistent, structured error handling
5. **Secure:** Sensitive info only shown in development
6. **Trackable:** Request IDs link frontend and backend logs

## Future Enhancements

- Error reporting to external services (Sentry, LogRocket)
- Error analytics dashboard
- Automated error categorization
- Email notifications for critical errors
- Error rate limiting and throttling
- Retry mechanisms for transient errors

## Date
November 23, 2025

## Status
📋 **Proposed - Ready for Implementation**
