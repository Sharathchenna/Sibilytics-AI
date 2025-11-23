# Backend Deployment Guide

## Current Issue
Your production frontend at `https://sibilytics-ai.in` is trying to reach the backend at `https://api.sibilytics-ai.in`, but the backend is only running locally. You need to deploy the backend to make the Data Visualization features work in production.

**Error**: `503 Service Unavailable` when uploading files on production site.

## Quick Deployment Options

### Option 1: Railway.app (Recommended - Easiest) ⭐

Railway offers free tier with $5/month credit (500 hours).

**Steps:**

1. **Install Railway CLI**
   ```bash
   curl -fsSL https://railway.app/install.sh | sh
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Get Your Backend URL**
   ```bash
   railway domain
   ```
   You'll get something like: `https://your-app.up.railway.app`

5. **Update DNS (Cloudflare)**
   - Go to Cloudflare DNS settings
   - Add CNAME record: `api` → `your-app.up.railway.app`
   - Or update existing A record for `api.sibilytics-ai.in`

---

### Option 2: Render.com (Free Tier Available)

**Steps:**

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `sibilytics-backend`
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty, Docker will handle it)
   - **Start Command**: (leave empty, Docker CMD will be used)
   - **Docker**: Yes (auto-detected from Dockerfile)
5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. Get your URL: `https://sibilytics-backend.onrender.com`
8. Update Cloudflare DNS: `api.sibilytics-ai.in` → CNAME to Render URL

---

### Option 3: Fly.io (Free Tier: 3 VMs)

**Steps:**

1. **Install flyctl**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   flyctl auth login
   ```

3. **Deploy**
   ```bash
   cd backend
   flyctl launch
   # Follow prompts:
   # - App name: sibilytics-backend
   # - Region: Choose closest to your users
   # - Postgres: No
   # - Redis: No
   flyctl deploy
   ```

4. **Get URL**
   ```bash
   flyctl info
   ```

5. **Update DNS** in Cloudflare

---

### Option 4: Digital Ocean App Platform

**Steps:**

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Select GitHub repository
4. Configure:
   - **Source Directory**: `/backend`
   - **Type**: Web Service
   - **Dockerfile Path**: `/backend/Dockerfile`
   - **HTTP Port**: 8000
5. Choose plan (starts at $5/month)
6. Deploy
7. Update DNS in Cloudflare

---

## After Deployment

Once you have your backend deployed and get a URL (e.g., `https://api.sibilytics-ai.in`), you need to:

### 1. Verify Backend is Running
```bash
curl https://api.sibilytics-ai.in/
# Should return: {"message":"Feature Extraction API","status":"healthy"}
```

### 2. Test Data Viz Endpoint
```bash
curl https://api.sibilytics-ai.in/api/data-viz/upload \
  -X OPTIONS
# Should return: 200 OK
```

### 3. Redeploy Frontend (if needed)
The frontend automatically uses `https://api.sibilytics-ai.in` in production, so no code changes needed. But if the deployment is fresh:

```bash
cd frontend
npm run deploy
```

---

## DNS Configuration in Cloudflare

Once your backend is deployed, you need to point `api.sibilytics-ai.in` to your backend:

### If using Railway/Render/Fly.io (with their domain)

1. Go to Cloudflare Dashboard
2. Click on your domain `sibilytics-ai.in`
3. Go to DNS section
4. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `api`
   - **Target**: `your-backend.up.railway.app` (or your provider's URL)
   - **Proxy status**: ⚪ DNS only (grey cloud)
   - **TTL**: Auto

### If using an IP address

1. Add A record:
   - **Type**: A
   - **Name**: `api`
   - **IPv4 address**: Your server's IP
   - **Proxy status**: 🟠 Proxied (orange cloud)
   - **TTL**: Auto

---

## Environment Variables (If Needed)

If you need to set environment variables in production:

**Railway**:
```bash
railway variables set CORS_ORIGIN=https://sibilytics-ai.in
```

**Render**: Add in dashboard under "Environment" tab

**Fly.io**: Use `flyctl secrets set KEY=VALUE`

---

## Cost Comparison

| Platform | Free Tier | Paid (Monthly) | Notes |
|----------|-----------|----------------|-------|
| **Railway** | $5 credit/month | $5+ | Easy, 500 hrs free |
| **Render** | 750 hrs/month | $7+ | Spins down after inactivity |
| **Fly.io** | 3 VMs free | $1.94+ | Good global edge |
| **Digital Ocean** | Trial credit | $5+ | More control |

---

## Recommended Setup

For your use case, I recommend **Railway** because:
- ✅ Very easy deployment (3 commands)
- ✅ Free tier sufficient for development
- ✅ Automatic HTTPS
- ✅ Good performance
- ✅ Easy to scale later

---

## Quick Start (Railway)

```bash
# 1. Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# 2. Login
railway login

# 3. Deploy backend
cd backend
railway init
railway up

# 4. Get your URL
railway domain

# 5. Update Cloudflare DNS
# Go to Cloudflare → DNS → Add CNAME:
# api → your-app.up.railway.app

# 6. Test
curl https://api.sibilytics-ai.in/
```

**Done!** Your production site will now work! 🎉

---

## Troubleshooting

### 503 Error Still Appearing

1. Check backend is running:
   ```bash
   curl https://api.sibilytics-ai.in/
   ```

2. Check CORS settings in `main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://sibilytics-ai.in"],  # Must include your domain
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. Check DNS propagation:
   ```bash
   dig api.sibilytics-ai.in
   ```

### Deployment Fails

1. Check Dockerfile includes all files:
   ```dockerfile
   COPY main.py .
   COPY data_viz.py .  # ← Must include this
   ```

2. Check all dependencies in `requirements.txt`

3. Check logs:
   - Railway: `railway logs`
   - Render: View in dashboard
   - Fly.io: `flyctl logs`

---

## Need Help?

If you encounter issues:
1. Check the deployment logs on your platform
2. Verify DNS records in Cloudflare
3. Test backend directly with curl
4. Check CORS settings in main.py

---

## Date
November 23, 2025
