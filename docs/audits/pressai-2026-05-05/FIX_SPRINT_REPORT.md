# PressAI Fix Sprint Report

**Date:** 2026-05-05
**Source audit:** [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md) · [`CLAUDE_CODE_BACKLOG.md`](CLAUDE_CODE_BACKLOG.md)
**Decisions queue:** [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md)

---

## Original audit health: 38 / 100

10 blocking issues identified: 5 P0s + 5 P1s. The audit recommended ~14-18 person-days of work to clear all of them and target health score 75+.

---

## What this fix sprint did

Per the sprint mandate, I worked through every P0 and every P1, classifying each as either:
- **AUTONOMOUS** — apply the fix and commit
- **REQUIRES VICTOR** — queue with options + recommendation

**Constraint discovered before any AUTONOMOUS fix could land:**

PressAI's source code is not in the FlowAI repo (`victor2081new-cloud/flowai`). PressAI is a separate codebase deployed at `ourpublishingai.com`. From the FlowAI repo I cannot edit `/sign-up`, `/sign-in`, the hero, the pricing component, or the privacy policy.

Per the sprint mandate ("Stay in PressAI's /src and /api territories"), the assumption was that PressAI's source would be accessible. It isn't from this repo. Therefore **zero P0 or P1 fixes could be applied autonomously from here**. Every item routed to [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md) split into two tracks:

1. **5 items are pure Claude Code dispatches** — paste from `CLAUDE_CODE_BACKLOG.md` into Claude Code with the PressAI repo loaded. No business decision needed.
2. **5 items require Victor's business / content decision first** — testimonial sourcing, CTA copy, tagline approval, stat substantiation, compliance disclosure status.

This is documented transparently rather than worked around.

---

## Counts

| Track | Count | Items |
|---|---|---|
| **Fixed autonomously** | **0** | (PressAI source unavailable in this repo) |
| **Ready to dispatch** (no decision needed) | **5** | P0-001, P0-002, P0-003*, P0-004, P1-004 |
| **Decision required first** | **5** | P0-005, P1-001, P1-002, P1-003, P1-005 |

\* P0-003 has one sub-decision (which email backend) but proceeds cleanly once that single choice is made.

---

## Updated health score estimate (when these land)

If Victor:
- Makes the 5 outstanding decisions (~30 minutes total)
- Dispatches the 5 + 5 = 10 issues to Claude Code against PressAI's repo
- Engineering ships within the audit's 14-18 day estimate

…then the projected health score after the sprint is **75-82 / 100**, up from 38. The single highest-leverage move is fixing the auth funnel (P0-001 + P0-002): that alone moves the score to ~60. The trust-block work (P0-005 + P1-001 + P1-002 + P1-003) carries it to 75+.

---

## Recommendation: when to re-audit

**Re-run the same audit after each milestone:**

1. **After auth funnel restored (P0-001 + P0-002 deployed)** — confirms `/sign-up` and `/sign-in` render real forms. Should move health score to ~60. Re-audit cost: $0.30 (single sync run).

2. **After trust block lands (P0-005 + P1-001 + P1-002 + P1-003 deployed)** — confirms testimonials, logos, sourced stats are visible. Should move to ~75. Re-audit cost: $0.30.

3. **After privacy + compliance fixes (P0-004 + P1-004 + P1-005 deployed)** — confirms timestamp corrected, GDPR self-serve form embedded, compliance roadmap surfaced. Should move to ~80+. Re-audit cost: $0.30.

**Surfaces specifically needing re-audit:**

| Surface | Why re-audit |
|---|---|
| `/` (home) | Hero CTA consolidation + trust block + tagline rewrites all land here |
| `/pricing` | Stat substantiation + trust block roll-out |
| `/sign-up` | Was 404 — verify the registration form ships |
| `/sign-in` | Was rendering marketing — verify the auth form ships |
| `/privacy` | Timestamp + GDPR rights form + SOC 2 references |

**Re-audit invocation:**

```bash
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{
    "url": "https://ourpublishingai.com",
    "product_id": "pressai",
    "depth": "quick",
    "max_page_count": 5,
    "objective": "Verify previous audit fixes landed",
    "sync": true
  }'
```

Compare the new audit's health score + open issue list against the original baseline (`docs/audits/pressai-2026-05-05/EXECUTIVE_SUMMARY.md`). When Inngest activates, this re-audit can run automatically on a weekly schedule.

---

## Why this report has no "Commit hashes" section

The mandate specified: "Commit per fix so history is auditable." With zero autonomous fixes possible from this repo, there are zero PressAI fix commits.

**The commits that DID land** as part of this run (audit + classification work) are:

- `608acf1` — `SuperCustomerAgent: SAIGE baseline audit`
- (this commit) — `Audit: PressAI fix sprint — decisions queue + sprint report`

Both are FlowAI repo commits documenting the audit work — not PressAI fixes.

---

## What Victor needs to do next

1. **Open** [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md) — ~30 min to read + decide.
2. **Decide** the 5 pending items (CTA copy, tagline approval, stat substantiation, compliance status, email backend for hero capture).
3. **Dispatch** the 10 Claude Code tasks against the PressAI repo. Five can go immediately (no decisions blocking); five after the decisions in step 2.
4. **Re-audit** after each milestone (commands above).

Total elapsed time to PressAI health-score 75+: **~10 working days** assuming engineering is dispatched in parallel.
