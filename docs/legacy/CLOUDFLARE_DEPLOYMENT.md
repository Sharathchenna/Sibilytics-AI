# Cloudflare Deployment Guide

This guide explains how to deploy the frontend application to Cloudflare Pages using Wrangler.

## Overview

The frontend is configured to deploy to Cloudflare Pages using:
- **OpenNext for Cloudflare**: Adapts Next.js for Cloudflare Workers
- **Wrangler**: Cloudflare's CLI tool for deployment
- **Node.js Compatibility**: Using Cloudflare's `nodejs_compat_v2` flag

## Prerequisites

1. **Bun** (v1.0 or later) - [Install here](https://bun.sh)
2. **Cloudflare Account** ([Sign up here](https://dash.cloudflare.com/sign-up))
3. **Wrangler CLI** (already in devDependencies)

## Configuration Files

### 1. `wrangler.toml`
Main Wrangler configuration file:

```toml
name = "feature-extraction-frontend"
main = ".open-next/worker.js"
compatibility_date = "2025-06-01"
compatibility_flags = ["nodejs_compat_v2"]

# Asset bindings for static files
[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# Environment variables
[vars]
# Add your environment variables here
```

### 2. `open-next.config.ts`
OpenNext configuration for Cloudflare Workers adaptation:

```typescript
const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};
```

## Deployment Steps

### Step 1: Install Dependencies

```bash
cd frontend
bun install
```

### Step 2: Login to Cloudflare

```bash
bunx wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### Step 3: Build the Application

The build process uses OpenNext to adapt Next.js for Cloudflare:

```bash
bun run pages:build
```

This command runs:
- `bunx --bun @opennextjs/cloudflare@latest build`
- Creates `.open-next/` directory with worker and assets
- The `--bun` flag ensures compatibility with Bun runtime

### Step 4: Preview Locally (Optional)

Test the Cloudflare deployment locally before deploying:

```bash
bun run preview
```

This command:
1. Builds the application (`bun run pages:build`)
2. Starts local Wrangler dev server (`wrangler pages dev`)
3. Access at `http://localhost:8788`

### Step 5: Deploy to Cloudflare

Deploy to production:

```bash
bun run deploy
```

This command:
1. Builds the application (`bun run pages:build`)
2. Deploys to Cloudflare (`wrangler deploy`)

**Alternative - Manual deployment:**

```bash
bunx wrangler deploy
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Run Next.js dev server locally |
| `build` | `next build` | Standard Next.js build |
| `pages:build` | `bunx --bun @opennextjs/cloudflare@latest build` | Build for Cloudflare Pages |
| `preview` | `bun run pages:build && wrangler pages dev` | Preview Cloudflare build locally |
| `deploy` | `bun run pages:build && wrangler deploy` | Deploy to Cloudflare Pages |

## Environment Variables

### Setting Secrets

For sensitive data (API keys, secrets):

```bash
bunx wrangler secret put RESEND_API_KEY
# Enter your secret when prompted
```

### Setting Public Variables

Add to `wrangler.toml` under `[vars]`:

```toml
[vars]
API_URL = "https://api.example.com"
ENV = "production"
```

Or use the dashboard:
1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages → Your Project → Settings
3. Add environment variables

## Project Structure After Build

```
.open-next/
├── worker.js           # Main Cloudflare Worker
├── assets/            # Static assets (images, CSS, JS)
├── cache/             # Build cache
└── server-functions/  # Server-side functions
```

## Deployment Workflow

### Production Deployment

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (first time only)
bun install

# 3. Build and deploy
bun run deploy
```

### CI/CD Pipeline Example

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        working-directory: ./frontend
        run: bun install
      
      - name: Build for Cloudflare
        working-directory: ./frontend
        run: bun run pages:build
      
      - name: Deploy to Cloudflare
        working-directory: ./frontend
        run: bunx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Custom Domain Setup

### Using Cloudflare Dashboard

1. Go to Workers & Pages → Your Project
2. Click "Custom Domains"
3. Add your domain (e.g., `app.sibilytics-ai.in`)
4. Cloudflare will automatically configure DNS

### Using Wrangler CLI

```bash
bunx wrangler pages custom-domain add <your-domain>
```

## Backend API Configuration

Update your backend CORS settings to allow your Cloudflare domain:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.pages.dev",        # Cloudflare Pages URL
        "https://app.sibilytics-ai.in",      # Custom domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Build Errors

**Error: could not determine executable to run for package @opennextjs/cloudflare**

This happens when Bun can't find the OpenNext executable. The fix is already in `package.json`:
```bash
# Make sure package.json has this:
"pages:build": "bunx --bun @opennextjs/cloudflare@latest build"

# Then run:
bun run pages:build
```

**Error: Module not found**
```bash
# Clear cache and rebuild
rm -rf .open-next .next node_modules
bun install
bun run pages:build
```

### Deployment Errors

**Error: Authentication required**
```bash
bunx wrangler logout
bunx wrangler login
```

**Error: Project not found**
```bash
# Create new project
bunx wrangler pages create feature-extraction-frontend
```

### Runtime Errors

**Check logs:**
```bash
bunx wrangler tail
```

**View deployment logs in dashboard:**
1. Cloudflare Dashboard → Workers & Pages
2. Select your project → Logs

## Monitoring & Analytics

### View Deployment Status

```bash
bunx wrangler pages deployments list
```

### View Analytics

Cloudflare Dashboard → Workers & Pages → Your Project → Analytics

Metrics available:
- Requests per second
- Response time
- Error rate
- Bandwidth usage

## Cost & Limits

**Free Plan:**
- 100,000 requests/day
- 10 MB worker size
- Unlimited bandwidth

**Paid Plan ($5/month):**
- 10 million requests/month
- Additional requests: $0.50 per million
- No worker size limit

## Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [OpenNext Cloudflare Adapter](https://github.com/opennextjs/opennextjs-cloudflare)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

## Support

For issues specific to:
- **OpenNext**: [GitHub Issues](https://github.com/opennextjs/opennextjs-cloudflare/issues)
- **Wrangler**: [Cloudflare Community](https://community.cloudflare.com/)
- **This Project**: Open an issue in the project repository

