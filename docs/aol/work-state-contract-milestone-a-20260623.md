# AOL Work-State Contract: Milestone A

Date: 2026-06-23

Status: Routed to AOL. This is not a FlowAI runtime directive and does not amend FlowAI canonical documents.

## Target

NETWORK -> Connect Buyer

## Objective

A single card click must put the operator directly into work, not into another UI surface.

## Work-State Contract

After the Connect Buyer card click:

- The card grid is gone.
- The work state is full-bleed.
- There is exactly one primary input.
- The input is auto-focused.
- There is exactly one primary action button.
- There is exactly one Back affordance.
- Optional fields are behind one closed Advanced disclosure.
- No dashboard, stats, charts, tabs, breadcrumbs, second card, setup page, or long explainer appears on the work path.

## Required First Work State

Input:

`What do you want to buy?`

Action:

`Find Sellers`

First useful output:

Seller Results or No-Match Queue.

For a fresh account with no seller data, No-Match Queue is an acceptable output if it is actionable and not a setup screen.

## Failure Detector

The view fails if any of these appear before the first useful output:

- More than one input.
- A visible card grid.
- A second card.
- Navigation menu, tab bar, or breadcrumb.
- Dashboard, Overview, Settings, Configure, or Set up label.
- Metric, statistic, count tile, or chart.
- Explanatory text block over 20 words.
- Any intermediate configure/setup step.

## Sequencing

Milestone A only:

Prove Connect Buyer first.

Milestone B only starts after independent Milestone A PASS.

## Verification

Builder evidence:

- before/after summary
- route or preview URL
- commit SHA
- detector checklist

Independent CT2 evidence:

- fresh operator state
- tested URL and commit SHA
- screen recording or equivalent browser evidence
- detector checklist
- one click -> work state
- one input + one action -> first output

Builder must not be verifier.

## Stops

- Do not upload real contacts.
- Do not run real sends.
- Do not route this into FlowAI capability claims.
