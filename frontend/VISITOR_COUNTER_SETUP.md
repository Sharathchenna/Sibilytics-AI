# Visitor Counter Setup Guide

This guide will help you set up the visitor counter for your website using Cloudflare KV storage.

## Prerequisites

- Cloudflare account with Workers enabled
- `wrangler` CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)

## Setup Steps

### 1. Create a KV Namespace

✅ **Already completed!** The KV namespace has been created with ID: `61917fc0926842ca8a62a395c81262d3`

For reference, the command used was:
```bash
npx wrangler kv namespace create VISITOR_COUNT
```

Note: In Wrangler v4+, use spaces (not colons) in commands: `kv namespace` instead of `kv:namespace`

### 2. Update wrangler.toml

✅ **Already completed!** The `wrangler.toml` has been updated with the KV namespace ID.

### 3. Deploy Your Application

```bash
npm run build
npx wrangler deploy
```

## How It Works

1. **API Endpoint**: `/api/visitors` tracks and increments the visitor count
2. **Storage**: Cloudflare KV stores the count persistently across all requests
3. **Display**: The footer automatically fetches and displays the count when the page loads
4. **Auto-increment**: Each page visit increments the counter by 1

## Testing Locally

To test locally with Cloudflare Workers:

```bash
npm run dev
# or
npx wrangler dev
```

Note: For local development, the KV namespace might not be available, and the counter will show 0 or a fallback message.

## Resetting the Counter

If you need to reset the visitor count:

```bash
npx wrangler kv key put total_visitors "0" --namespace-id=61917fc0926842ca8a62a395c81262d3
```

Or delete the key entirely:

```bash
npx wrangler kv key delete total_visitors --namespace-id=61917fc0926842ca8a62a395c81262d3
```

## Viewing the Counter Value

To check the current visitor count:

```bash
npx wrangler kv key get total_visitors --namespace-id=61917fc0926842ca8a62a395c81262d3
```

## Troubleshooting

### Counter not showing
- Check browser console for errors
- Verify KV namespace is created and ID is correct in wrangler.toml
- Ensure you've deployed the latest changes

### Counter always shows 0
- Verify the KV binding is correctly configured
- Check that the API route is accessible at `/api/visitors`
- Ensure the Edge runtime is working correctly

### Counter incrementing too fast
- This is normal behavior - each page load increments the counter
- If you want to track unique visitors instead, you'll need to implement session tracking with cookies

## Future Enhancements

Consider implementing:
- Unique visitor tracking (using cookies/localStorage)
- Daily/weekly/monthly visitor statistics
- Visitor analytics (geographic location, device type)
- Rate limiting to prevent counter abuse
- Admin dashboard to view detailed statistics

## Files Modified

1. `wrangler.toml` - Added KV namespace binding
2. `app/api/visitors/route.ts` - Created API endpoint
3. `app/page.tsx` - Added visitor counter display in footer
