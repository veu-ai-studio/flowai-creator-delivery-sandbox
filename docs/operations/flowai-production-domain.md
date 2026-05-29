# FlowAI Production Domain

FlowAI's renewed product URL is:

- Production URL: `https://flowai.veuaistudio.com`
- GTM demo link: `https://flowai.veuaistudio.com/flowai?url=https%3A%2F%2Fsaigeplatform.com`
- Legacy URL retained during cutover: `https://flowai-dun.vercel.app`

## Vercel And DNS Setup

Victor handles Vercel dashboard and DNS outside this repo.

1. In Vercel, add `flowai.veuaistudio.com` to the FlowAI project domains.
2. In DNS for `veuaistudio.com`, add the CNAME record Vercel provides for `flowai`.
3. Wait for Vercel domain verification and SSL issuance.
4. Keep `flowai-dun.vercel.app` active until the custom domain has been verified in production.
5. Smoke test the GTM demo link against `https://saigeplatform.com`.

The codebase exposes `FLOWAI_CANONICAL_DOMAIN`, `FLOWAI_CANONICAL_URL`, and the GTM demo URL from `src/lib/flowaiDomain.js` for user-facing reports and UI consumers.
