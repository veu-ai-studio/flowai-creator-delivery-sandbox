# SSOT Parking Lot

## Purpose
Items identified during operating sessions that should be considered for inclusion in future SSOT amendment cycles. This file is NOT canonical SSOT. Items here are CANDIDATES awaiting Panel review and MG2 disposition.

## Workflow
1. When CEO or W03 identifies an item that belongs in a future SSOT amendment, W03 dispatches an APPEND-only entry to this file BEFORE responding further to the CEO.
2. Every SSOT amendment cycle reviews this file. Items with sufficient evidence are promoted to Panel consultation per bias-management rules.
3. Disposed items (accepted into canonical SSOT, rejected, or merged with other amendments) are marked with their disposition + the commit/dispatch that resolved them. They remain in the file for audit history; nothing is deleted.

## Entry format
Each entry includes:
- ID (sequential: ENTRY 001, 002, ...)
- Date identified
- Source (CEO or W03 + brief context)
- Description (1-3 sentences)
- Disposition (NEW | UNDER REVIEW | ACCEPTED [commit hash] | REJECTED [rationale] | MERGED [into which other entry])

## Entries

### ENTRY 001 — 2026-05-14
- **Source**: CEO 2026-05-13 (during deployed FlowAI manual test session, after W03 conflated Lovable's "Ready to build, Victor?" greeting with FlowAI's non-personalized dashboard)
- **Description**: Personalization affordance requirement. FlowAI's dashboard AND every product FlowAI generates (Native App, Mobile App, SaaS, Agentic AI) must surface a personalized greeting to authenticated users by default. Pattern reference: Lovable's "Ready to build, [Name]?". Apply at FlowAI UI layer AND at FlowAI's output product template, so personalization is inherited by every vendor-built product downstream.
- **Disposition**: NEW (awaiting next SSOT amendment cycle review)

---

*File created 2026-05-14 by W5b per W03 dispatch. First entry logged at creation.*
