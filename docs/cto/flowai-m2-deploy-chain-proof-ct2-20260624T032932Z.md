# CT2 Independent Browser Verification

- Result: PASS
- Timestamp: 2026-06-24T03:29:32.188Z
- URL: https://flowai-m2-deploy-chain-proof.vercel.app/
- Method: local Playwright Chromium using installed Chrome executable, fresh browser context
- HTTP status: 200
- Visible marker observed in rendered body: yes
- Marker: `FlowAI M2 deployed software verified 6b93b67`
- proofRunId visible: yes
- proofRunId present in source: yes
- proofRunId: `flowai-build-20260624T032047-c1216bbd`
- Screenshot: `screenshots/ct2/flowai-m2-deploy-chain-proof-playwright-chrome-ct2-20260624T032932Z.png`

Raw evidence snippets:

```text
markerSnippet: FlowAI M2 deployed software verified 6b93b67 FlowAI deploy-chain proof flowai-build-20260624T032047-c1216bbd
proofRunIdVisibleSnippet: FlowAI M2 deployed software verified 6b93b67 FlowAI deploy-chain proof flowai-build-20260624T032047-c1216bbd
proofRunIdSourceSnippet: <!DOCTYPE html><html lang="en" data-flowai-proof-run-id="flowai-build-20260624T032047-c1216bbd"><head> <meta charset="UTF-8"> <meta name="viewport" content="width=dev
```

HTTP status cross-check:

```text
curl.exe -sS -L -o NUL -w "%{http_code} %{url_effective}\n" https://flowai-m2-deploy-chain-proof.vercel.app
200 https://flowai-m2-deploy-chain-proof.vercel.app/
```
