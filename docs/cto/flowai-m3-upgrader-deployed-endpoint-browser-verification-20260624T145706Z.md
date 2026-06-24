# FlowAI M3 Upgrader Deployed-Endpoint Browser Verification

Result: PASS

Timestamp: 2026-06-24T14:59:24Z

Method/tool used: local Playwright Chromium, fresh browser page, HTTP/browser DOM checks, screenshots.

Before URL: https://flowai-m3-upgrader-before.vercel.app/

After URL: https://flowai-m3-upgrader-proof-1loco6i3x-veu-ai-studio.vercel.app/

ProofRunId: flowai-build-20260624T145706-2f08872c

Marker: FlowAI M3 deployed-endpoint upgrade verified c8e91cc

## Results

| Check | Before | After |
| --- | --- | --- |
| HTTP/browser load | PASS | PASS |
| Visible before defect | yes | no |
| Upgrade marker visible | no | yes |
| proofRunId visible | no | yes |
| proofRunId present in source | no | yes |
| `Generate outreach plan` button present | yes | yes |
| Button disabled | yes | no |

## Screenshots

- Before: `screenshots/ct2/flowai-m3-before-deployed-endpoint-20260624T145706Z.png`
- After: `screenshots/ct2/flowai-m3-after-deployed-endpoint-20260624T145706Z.png`

## Raw Evidence Snippets

Before visible text:

```text
Community Aid Matcher

M3 BEFORE DEFECT: resource matching is unavailable because the intake action is disabled.

Generate outreach plan
```

After visible text:

```text
Community Aid Matcher

FlowAI M3 deployed-endpoint upgrade verified c8e91cc

Generate outreach plan
FlowAI deploy-chain proof flowai-build-20260624T145706-2f08872c
```

Before button state:

```json
{
  "buttonFound": true,
  "buttonDisabled": true,
  "buttonText": "Generate outreach plan"
}
```

After button state:

```json
{
  "buttonFound": true,
  "buttonDisabled": false,
  "buttonText": "Generate outreach plan"
}
```
