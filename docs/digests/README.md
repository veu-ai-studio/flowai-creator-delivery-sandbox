# FlowAI Daily Digests

## What this is

A single CEO-ready status report consolidating everything the CEO needs to glance at without asking "what's outstanding?". One markdown file per day, written to `docs/digests/<YYYY-MM-DD>.md`.

Each digest has 8 sections, in this order:

1. **✅ Wins Since Last Digest** — substantive commits landed in the delta window.
2. **🚧 In-Flight Right Now** — which worker (if any) holds the stage lock right now and for how long.
3. **📋 Your Open Decisions** — parking-lot entries with `NEW` disposition + recent Panel docs flagged for CEO disposition. Numbered. Max 5.
4. **🟢 Deployed FlowAI Status** — live URL, deployed commit, feature-flag boolean-name summary, health PASS/DEGRADED/FAILED.
5. **📝 Parking Lot Snapshot** — six most-recent parking-lot entries with current disposition.
6. **🎯 Recent Panel Verdicts** — Panel consultations from the last 7 days, verdict + supermajority status.
7. **📜 SSOT Canonical State** — latest canonical version + amendments promoted since the last digest.
8. **⚠️ Soft Signals + Risks** — explicit soft-signal flags from Panel synthesis, parking-lot age-based escalations, stale-lock warnings.

The digest is a **supplement** to W03 → CEO communication, not a replacement. CEO still talks to W03; W03 still dispatches workers. The digest just answers the "what's outstanding?" question deterministically.

## How to trigger

Manual:

```sh
npm run digest
```

Equivalent:

```sh
node scripts/daily-digest/build.mjs
```

Both write `docs/digests/<today>.md` (overwriting if same day) and update `.w03-cache/last-digest-marker.txt` so the next run reports only the delta.

The generator is **read-only against canonical artifacts** — it never modifies SSOT, the parking lot, panel consultations, or `CANONICAL_HISTORY.md`. Output goes only to `docs/digests/` and `.w03-cache/`.

## Delta tracking

`.w03-cache/last-digest-marker.txt` records `commit=<HEAD>` and `timestamp=<ISO>` after each successful run. Subsequent runs:

- **Wins** are commits in `<marker-commit>..HEAD` (or `--since=<marker-timestamp>` if the marker commit is gone).
- **SSOT promotions** are entries from CANONICAL_HISTORY § 8 with `date > marker-date`.
- **Recent panel verdicts** still use a fixed 7-day mtime window regardless of marker (so historically-relevant findings stay visible until they age out).

Running twice in close succession produces a second digest with empty "Wins" and "Promoted since last digest" — that's the expected delta-tracking signature.

To reset and force a full snapshot, delete the marker file:

```sh
rm .w03-cache/last-digest-marker.txt
```

## Scheduling (TBD)

This dispatch (2026-05-14, W5b) builds the generator only. Automatic scheduling is **deferred to a follow-up dispatch** where the CEO chooses the platform:

- **GitHub Actions cron** — daily run on the repo, commits the digest to `main`. Pros: no infra, transparent log. Cons: needs a PAT, push permissions.
- **Vercel cron** — `api/cron/daily-digest.js` triggered by Vercel's cron scheduler. Pros: same infrastructure as the deployed app. Cons: Vercel cron has runtime caps; need a separate path to write the file back to git (likely just send the digest by email instead of committing).
- **Local scheduler** — Windows Task Scheduler / launchd / cron on the CEO's box. Pros: zero new infra. Cons: requires the box to be on; no audit trail across machines.

Pick one and a follow-up dispatch wires it.

## How to add a new collector

The collector (`scripts/daily-digest/collect.mjs`) returns a single state object the renderer consumes. To extend:

1. Add a new collector function in `collect.mjs` that returns a plain JSON-serializable value. It must:
   - Tolerate missing inputs gracefully (return `null` / empty array / "rawAvailable: false" sentinel, never throw).
   - Run with read-only access — no writes to canonical artifacts.
   - Time-bounded — use AbortController for any network probe.
2. Add it to the `Promise.all` in `collect()`. Spread its result into the returned state object.
3. Add a renderer in `scripts/daily-digest/render.mjs` that consumes the new field. Render gracefully on `null` / empty.
4. Insert the rendered section into `render()` at the appropriate position in the 8-section order. If the new content is a NEW section, update this README and the dispatch contract before shipping it (section order is part of the CEO interface).

## How to add a new soft-signal trigger

Soft signals are surfaced in section 8. To add a new trigger, edit `renderSoftSignals` in `scripts/daily-digest/render.mjs`. Keep the cap at 4 items per digest — the section's value is from being a small, scannable list of "things to actually worry about today," not an exhaustive log.

## Failure modes + invariants

- **Network probe to `/api/version` fails** → section 4 renders as `🟡 Health: DEGRADED — probe failed: <reason>`. The digest still completes.
- **`doppler` not on PATH** → bypass-secret resolution returns `null` and the probe is sent without the bypass header. If the deployment requires the bypass, the probe gets a 401 and section 4 renders DEGRADED with the HTTP status as the reason.
- **`.w03-cache/last-digest-marker.txt` missing** → treated as first run. Full snapshot. Marker is created at the end.
- **`docs/SSOT_PARKING_LOT.md` missing** → section 5 renders "Parking lot is empty"; section 3 just has the Panel-derived decisions.
- **No Panel consultations in the last 7 days** → section 6 renders "None in window."
- **No git history accessible** → wins section renders "None in window."

## Where the files live

- `scripts/daily-digest/collect.mjs` — read-only data collector.
- `scripts/daily-digest/render.mjs`  — markdown renderer (8 sections).
- `scripts/daily-digest/build.mjs`   — trigger entry-point.
- `docs/digests/<YYYY-MM-DD>.md`     — daily output.
- `docs/digests/README.md`           — this file.
- `.w03-cache/last-digest-marker.txt`— delta state (untracked).
- `package.json` script `digest`     — `node scripts/daily-digest/build.mjs`.
