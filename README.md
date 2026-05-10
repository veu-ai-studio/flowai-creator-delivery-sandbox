# FlowAI

Portfolio governance platform built by VEU AI Studio.

## Local development

```bash
npm install
npm run dev          # start the dev server
npm run test         # run the test suite (vitest)
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc against jsconfig.json
```

Required environment variables for local runs are documented in internal
team docs. Copy the documented values into a `.env.local` file in the repo
root before starting the dev server.

## Project structure

- `src/` — React UI (pages, components, libs)
- `api/` — serverless function handlers
- `tests/` — vitest test suites
- `docs/` — public documentation

## Contributing

Contribution guidelines and onboarding details are maintained in internal
team docs. Reach out to a current team member for access.

## License

Proprietary — © VEU AI Studio. All rights reserved.
