# CT2 Path 2 RelTwin Production Proof - Request/Response Evidence

## Production identity

Checked: 2026-06-14T20:53:08Z

Endpoint: `https://flowai-dun.vercel.app/api/health`

Redacted summary:

```json
{
  "ok": true,
  "status": "ready",
  "service": "flowai",
  "env": "production",
  "commit": "d6b92d54e169",
  "commitFull": "d6b92d54e1693fd18f37b5549df9d68285204449",
  "branch": "main",
  "deploymentUrl": "https://flowai-22fb3bmld-veu-ai-studio.vercel.app",
  "githubAppReady": true,
  "inngestReady": true,
  "githubApp": {
    "status": "PASS",
    "configured": true,
    "patFallback": true,
    "installationIdAlias": "GITHUB_APP_INSTALLATION_ID"
  }
}
```

Endpoint: `https://flowai-dun.vercel.app/api/version`

Redacted summary:

```json
{
  "name": "flowai-platform",
  "commit": "d6b92d54e169",
  "commitFull": "d6b92d54e1693fd18f37b5549df9d68285204449",
  "branch": "main",
  "env": "production",
  "deployUrl": "flowai-22fb3bmld-veu-ai-studio.vercel.app",
  "featureFlags": {
    "githubAppReady": true,
    "inngestReady": true
  }
}
```

## Run request

Checked: 2026-06-14T20:53:28Z

Endpoint: `POST https://flowai-dun.vercel.app/api/run-construction`

Payload:

```json
{
  "url": "https://reltwin.com",
  "mode": "BACKGROUND",
  "runId": "ct2-path2-reltwin-postmerge-20260614",
  "productScope": "reltwin",
  "maxIterations": 1,
  "structuralLayer": "autonomous",
  "operationalMode": "auto",
  "analysisDepth": "standard",
  "flowHubPath": "production"
}
```

HTTP response:

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
X-Ratelimit-Backend: memory
X-Ratelimit-Limit: 10
X-Ratelimit-Remaining: 8
```

Response body:

```json
{
  "ok": true,
  "async": true,
  "runId": "ct2-path2-reltwin-postmerge-20260614",
  "status": "queued",
  "statusUrl": "/api/run-construction-status?runId=ct2-path2-reltwin-postmerge-20260614",
  "transport": "kv",
  "inngestReady": true,
  "flowHubAxes": {
    "structuralLayer": "autonomous",
    "operationalMode": "auto",
    "analysisDepth": "standard",
    "flowHubPath": "production"
  },
  "eventIds": [
    "01KV3YJBBQPGA8EQTNP9NB5E4C"
  ]
}
```

