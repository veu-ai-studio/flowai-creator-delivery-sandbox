# FlowAI Execution Engine — Replit Deployment Guide

## Overview

This guide walks you through deploying the FlowAI Execution Engine on Replit and connecting it to Base44's Self-Verification UI.

The execution engine is a standalone Node.js backend that handles:
- Code generation (using OpenAI)
- Deployment (using Vercel API)
- Runtime validation
- Automated fixes
- Test retry loops

---

## PART 1: Replit Setup (5 minutes)

### Step 1: Create Replit Project

1. Go to [replit.com](https://replit.com)
2. Click **"+ Create"**
3. Select **Node.js** template
4. Name it: `flowai-execution-engine`
5. Click **Create Repl**

### Step 2: Upload Engine Files

1. Delete the default `index.js` and `package.json`
2. Upload the following files from the `deployables/replit-engine/` folder:
   - `package.json`
   - `index.js`
   - `.env.example`

**Via Upload:**
- Click the file icon (left sidebar)
- Click "Upload file"
- Select files one by one

**Via Paste:**
- Click "New file" in left sidebar
- Name it (e.g., `package.json`)
- Paste content from the provided files

### Step 3: Configure Environment Variables

1. Copy `.env.example` content to new `.env` file:
   - Click "New file"
   - Name: `.env`
   - Paste this:
   ```
   OPENAI_API_KEY=sk-...
   VERCEL_TOKEN=...
   PORT=3000
   ```

2. Fill in your actual keys:

   **OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create new API key
   - Copy and paste into `.env`

   **Vercel Token:**
   - Go to https://vercel.com/account/tokens
   - Create new token (Personal Access Token)
   - Copy and paste into `.env`

### Step 4: Install Dependencies

In Replit console (bottom):
```bash
npm install
```

### Step 5: Start the Server

In Replit console:
```bash
npm start
```

You should see:
```
============================================================
FlowAI Execution Engine running on http://localhost:3000
============================================================

Health Check: curl http://localhost:3000/health
Environment: ✓ Ready
```

### Step 6: Test Health Check

Click the **"Webview"** tab (top right) or copy the URL.

Your Replit URL will look like:
```
https://flowai-execution-engine.YOUR_USERNAME.repl.co
```

Test it:
```
curl https://flowai-execution-engine.YOUR_USERNAME.repl.co/health
```

Expected response:
```json
{
  "status": "ready",
  "environment": {
    "openai_key": "✓",
    "vercel_token": "✓"
  }
}
```

---

## PART 2: Connect to Base44 Self-Verification (2 minutes)

### Step 1: Get Your Replit URL

From your Replit project page, look for the **"Webview"** URL:
```
https://flowai-execution-engine.YOUR_USERNAME.repl.co
```

Copy this URL.

### Step 2: Open Base44 Self-Verification

1. In your Base44 app, navigate to: **Search → "self-verification"** (or use sidebar)
2. On the Self-Verification page, look for **"Backend Configuration"** section
3. Paste your Replit URL into the **"Backend Endpoint"** field

### Step 3: Test Connection

1. Click **"Test Connection"** button
2. You should see: **"✓ Backend is ready"**
3. If it fails, verify:
   - Replit server is running
   - API keys are set correctly
   - URL is correct (no typos)

### Step 4: Start Verification

1. Click **"Start Autopilot Verification"**
2. The engine will:
   - Generate 5 test apps
   - Deploy each to Vercel
   - Run validation tests
   - Attempt fixes if needed
   - Redeploy and retest

3. Watch the **Iteration Log** in real-time
4. Download the **JSON Report** when complete

---

## Troubleshooting

### Problem: "Backend is not responding"

**Check:**
1. Is Replit server still running?
   - Look at Replit console for errors
   - Click "Stop" then "Run" again

2. Is the URL correct?
   - Format: `https://flowai-execution-engine.YOUR_USERNAME.repl.co`
   - No trailing slash
   - No `/health` in the URL field

3. Are environment variables set?
   - Click "Secrets" (lock icon) in Replit
   - Verify `OPENAI_API_KEY` and `VERCEL_TOKEN` exist

### Problem: "OPENAI_API_KEY not configured"

**Fix:**
1. In Replit, click "Secrets" (lock icon)
2. Add key: `OPENAI_API_KEY`
3. Add value: Your actual API key from https://platform.openai.com/api-keys
4. Click "Add new secret"
5. Restart the server

### Problem: "Code generation is slow"

**This is normal.** OpenAI API calls take 10-30 seconds per app. For 5 apps, expect 5-15 minutes total.

### Problem: "Deployments are failing"

**Check:**
1. VERCEL_TOKEN is valid and has deployment permissions
2. You have available Vercel deployment quota
3. Run: `curl https://your-replit-url/health` to verify API access

---

## API Reference

### Health Check
```
GET /health
```
Returns: `{ status: "ready", environment: {...} }`

### Generate Code
```
POST /generate
Body: {
  "app_name": "MyApp",
  "context": "App description",
  "tech_stack": ["HTML", "Tailwind", "JavaScript"]
}
```

### Deploy
```
POST /deploy
Body: {
  "app_name": "MyApp",
  "html": "<html>...</html>"
}
```

### Validate
```
POST /validate
Body: {
  "url": "https://deployed-app.vercel.app"
}
```

### Run Full Loop
```
POST /run
Body: {
  "apps": [
    {
      "name": "Buffer",
      "description": "...",
      "tech": ["HTML", "Tailwind", "JavaScript"],
      "components": [...],
      "apis": [...]
    }
  ]
}
```

---

## Production Considerations

For production use:

1. **Store secrets in Replit Secrets** (never in `.env`)
2. **Enable logging** to track requests
3. **Add rate limiting** to prevent abuse
4. **Use Vercel API v2** for real deployments (current version uses mock URLs)
5. **Monitor OpenAI usage** (charges apply)
6. **Set up error alerts** for failed deployments

---

## Support

For issues:
1. Check Replit console for error messages
2. Verify all environment variables are set
3. Test health endpoint: `/health`
4. Review API response body for detailed error

---

## Next Steps

After deployment succeeds:
1. Run a test verification (5 apps)
2. Check generated deployment URLs
3. Download and review the JSON report
4. Adjust validation criteria if needed
5. Scale to more apps/iterations

---

**Engine Version:** 1.0.0  
**Last Updated:** 2026-04-25