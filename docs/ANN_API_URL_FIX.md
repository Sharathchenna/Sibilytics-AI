# ANN API URL Configuration Fix

## Issue
The production frontend (`https://sibilytics-ai.in`) was attempting to connect to `localhost:8000` for ANN API endpoints, causing CORS errors:

```
Access to fetch at 'http://localhost:8000/api/ann/upload-dataset' from origin 'https://sibilytics-ai.in' has been blocked by CORS policy: Permission was denied for this request to access the `unknown` address space.
```

## Root Cause
The ANN API module (`frontend/lib/ann-api.ts`) was using a simple environment variable fallback:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

This approach doesn't work well for production builds because:
1. The environment variable might not be set at build time
2. There's no runtime detection of the environment
3. It defaults to localhost instead of the production API

Meanwhile, the main API module (`frontend/lib/api.ts`) had smart hostname detection that automatically selected the correct API URL based on where the frontend was running.

## Solution
Updated `frontend/lib/ann-api.ts` to use the same smart detection logic as `api.ts`:

```typescript
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return 'https://api.sibilytics-ai.in';
};

const API_BASE_URL = getApiBaseUrl();
```

## How It Works
1. **Runtime Detection**: Checks the browser's hostname at runtime (not build time)
2. **Local Development**: If running on `localhost` or `127.0.0.1`, uses `http://localhost:8000`
3. **Production**: For any other hostname (including `sibilytics-ai.in`), uses `https://api.sibilytics-ai.in`

## Benefits
- ✅ No environment variables needed
- ✅ Works automatically in both development and production
- ✅ Consistent with the rest of the API configuration
- ✅ No CORS issues when testing production frontend locally
- ✅ Single source of truth for API URL logic

## Testing
After deploying this fix:
1. Local development: Frontend on `localhost:3000` → Backend on `localhost:8000` ✓
2. Production: Frontend on `sibilytics-ai.in` → Backend on `api.sibilytics-ai.in` ✓

## Files Modified
- `frontend/lib/ann-api.ts` - Added smart URL detection function

## Date
November 28, 2025
