# Cloudflare Deployment - Quick Reference

## 🚀 Quick Deploy (3 Commands)

```bash
cd frontend
bun install
bun run deploy
```

## 📋 Common Commands

### First Time Setup
```bash
# Login to Cloudflare
bunx wrangler login

# Verify authentication
bunx wrangler whoami
```

### Development
```bash
# Local Next.js development
bun run dev

# Preview Cloudflare build locally
bun run preview
```

### Deployment
```bash
# Build for Cloudflare
bun run pages:build

# Deploy to production
bun run deploy

# Deploy without rebuild (if already built)
bunx wrangler deploy
```

### Monitoring
```bash
# View live logs
bunx wrangler tail

# List deployments
bunx wrangler pages deployments list

# View deployment details
bunx wrangler pages deployment view <DEPLOYMENT_ID>
```

### Environment Variables
```bash
# Set secret (interactive)
bunx wrangler secret put SECRET_NAME

# Delete secret
bunx wrangler secret delete SECRET_NAME

# List secrets
bunx wrangler secret list
```

### Domains
```bash
# Add custom domain
bunx wrangler pages custom-domain add your-domain.com

# List domains
bunx wrangler pages custom-domain list

# Remove domain
bunx wrangler pages custom-domain remove your-domain.com
```

### Troubleshooting
```bash
# Clear build cache
rm -rf .open-next .next

# Reinstall dependencies
rm -rf node_modules
bun install

# View project info
bunx wrangler pages project list

# Logout and login again
bunx wrangler logout
bunx wrangler login
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Wrangler configuration |
| `open-next.config.ts` | OpenNext adapter config |
| `package.json` | Scripts and dependencies |
| `.open-next/` | Build output (gitignored) |

## 🔗 Deployment URLs

After deployment, your app is available at:

```
https://feature-extraction-frontend.pages.dev
```

Custom domain (if configured):
```
https://app.sibilytics-ai.in
```

## ⚙️ Configuration

### Update Backend URL in Frontend

If your backend API URL changes, update in your frontend code where API calls are made (typically in `lib/api.ts`).

### Update CORS in Backend

Add your Cloudflare domain to backend CORS:

```python
allow_origins=[
    "http://localhost:3000",
    "https://feature-extraction-frontend.pages.dev",
    "https://app.sibilytics-ai.in",
]
```

## 📊 Build Output

```
.open-next/
├── worker.js          # Main Cloudflare Worker
├── assets/           # Static files (CSS, JS, images)
└── server-functions/ # Server-side rendering functions
```

## ⏱️ Typical Deployment Time

- **Build**: ~2-3 minutes
- **Deploy**: ~30-60 seconds
- **Total**: ~3-4 minutes

## 🎯 Deployment Checklist

- [ ] Code committed to git
- [ ] Backend API accessible
- [ ] CORS configured with Cloudflare domain
- [ ] Environment variables set
- [ ] Custom domain configured (if applicable)
- [ ] Run `bun run deploy`
- [ ] Test deployment URL
- [ ] Check logs with `bunx wrangler tail`

## 🔐 API Keys & Secrets

Never commit API keys to git. Always use:

```bash
bunx wrangler secret put API_KEY_NAME
```

Then access in code via environment variables.

## 📈 Monitoring

Access Cloudflare dashboard for:
- Real-time analytics
- Error logs
- Performance metrics
- Request volume

Dashboard: https://dash.cloudflare.com/

## 🆘 Need Help?

**Full Documentation**: See `CLOUDFLARE_DEPLOYMENT.md`

**Quick Issues**:
- OpenNext error → Use: `bunx --bun @opennextjs/cloudflare@latest build`
- Build fails → Clear cache: `rm -rf .open-next .next`
- Auth error → Re-login: `bunx wrangler logout && bunx wrangler login`
- Module error → Reinstall: `rm -rf node_modules && bun install`

**Logs**:
```bash
bunx wrangler tail --format pretty
```

