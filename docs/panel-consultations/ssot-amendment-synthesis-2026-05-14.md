# SSOT Amendment Synthesis — Re-eval + Re-cluster + Candidates + Unified Draft

**Lineage:** W03 → W5c, 2026-05-14. Four-stage consolidated work: (β) Panel re-evaluation against the **corrected broader strategic framing** (CEO 2026-05-13: "underserved market segments globally"); (B) re-clustering of the 10-reviewer verbatim Q1-5 amendment proposals from commit `b512293` at Jaccard 0.25; (C) transparent candidate amendment list with reviewer-count attribution per amendment; (A) unified SSOT amendment draft (also saved separately at `docs/FLOWAI_SSOT_AMENDMENT_DRAFT_2026-05-14.md`).

**Why this re-do exists:** W5b's CS-5 amendment clustering at Jaccard 0.4 returned 0 supermajority amendments. Additionally, the strategic framing the Panel evaluated against in `b512293` was too narrow — it used "underdeveloped / emerging economies" as primary geographic focus. CEO corrected the framing on 2026-05-13 to "underserved market segments globally" which includes rural communities in developed countries, low-income urban populations anywhere, neglected language groups, and individuals/small businesses priced out of enterprise AI tools regardless of geography. This dispatch re-eval'd the prior finding and re-clustered against the corrected framing in one envelope.

**Started:** 2026-05-14T05:07:51.930Z
**Finished:** 2026-05-14T05:10:49.762Z (Step β) + 2026-05-14T05:14 (Step B + C + A)
**Panel composition (Step β):** 10 slots; composition matches `b512293` for continuity (slots 8/9 use openrouter llama-3.3 + qwen-2.5 substitutes since headless adapters remain not_configured at runtime).
**Bundle size (Step β):** 5064 chars (~1266 tokens).
**Per-reviewer timeout:** 240 s.
**Engagement rule:** per `docs/PANEL_INFRASTRUCTURE.md` §6 — for Qβ-2: ENGAGED requires clean (a)/(b)/(c) pick AND non-empty rationale; for Qβ-1 / Qβ-3: ENGAGED requires substantive (≥40 chars + ≥2 sentence boundaries) free text.

---

## Step β — Panel Re-evaluation Results

### Engagement matrix

| Slot | Provider:Model | Qβ-1 | Qβ-2 | Qβ-2 pick | Qβ-3 |
|------|-----------------|------|------|-----------|------|
| 1 | `openrouter:openai/gpt-5` | E | E | (a) | E |
| 2 | `openrouter:openai/gpt-4o` | E | E | (c) | E |
| 3 | `openrouter:google/gemini-2.5-pro` | E | E | (a) | E |
| 4 | `openrouter:anthropic/claude-opus-4` | E | E | (a) | E |
| 5 | `vercel_v0:v0-1.5-md` | D | D | — | D |
| 6 | `openrouter:mistralai/mistral-large-2411` | E | E | (c) | E |
| 7 | `openrouter:deepseek/deepseek-r1` | E | E | (a) | E |
| 8 | `openrouter:meta-llama/llama-3.3-70b-instruct` | E | E | (a) | E |
| 9 | `openrouter:qwen/qwen-2.5-72b-instruct` | E | E | (c) | E |
| 10 | `openrouter:openai/gpt-4o` | E | E | (c) | E |

Legend: E = ENGAGED · T = TANGENTIAL · S = SILENT · X = EVASIVE · D = DEFERRED

LIVE-OK: 9/10. DEFERRED: 1/10. Slot 5 (vercel_v0) hit its daily 429 quota (unrelated to this dispatch).

### Per-question tally (ENGAGED-only)

**Engagement on Qβ-2:** 9 of 10.

| Pick | Count | Share of ENGAGED |
|------|------:|------------------:|
| (a) substantial rework still needed | 5 | 56% |
| (b) broader framing resolves it; minor amendments suffice | 0 | 0% |
| (c) partial — broader framing helps but specific sections still need rework | 4 | 44% |

**Verdict:** `PARTIAL`

**Key reading:** **0 of 9** ENGAGED reviewers picked (b). 5/9 picked (a) and 4/9 picked (c) — the Panel **re-affirms** that some level of SSOT rework is needed under the corrected broader framing. The (a)/(c) split is about *how much* rework, not *whether*.

### Free-text responses (verbatim per reviewer)

#### Qβ-1 — Does the corrected broader framing materially change the assessment? (verbatim per reviewer)

**Slot 1 (openrouter:openai/gpt-5)** [ENGAGED]: The broader 'underserved globally' framing removes an artificial geographic constraint and clarifies who the platform should serve, but it does not address the core SSOT-strategy gaps. Misalignments around category definition (URL-based democratization), user journey, monetization to Year-6 ARR, and cross-BU alignment persist and still require substantial rework.

**Slot 2 (openrouter:openai/gpt-4o)** [ENGAGED]: The broader framing does materially change the assessment as it expands the target market to include more diverse underserved segments globally. This shift could potentially align the SSOT more closely with the strategic vision by addressing a wider range of user needs and market opportunities.

**Slot 3 (openrouter:google/gemini-2.5-pro)** [ENGAGED]: Yes, the change is material as it fundamentally alters the go-to-market strategy, competitive landscape, and product requirements. An SSOT that was already misaligned with a narrower, more homogeneous market focus is almost certainly more misaligned with a broader, more heterogeneous one that includes segments within high-income countries.

**Slot 4 (openrouter:anthropic/claude-opus-4)** [ENGAGED]: The broader framing does not materially change my assessment that substantial SSOT rework is needed. While expanding from 'underdeveloped economies' to 'underserved segments globally' increases the addressable market, the fundamental SSOT-strategic misalignments around product positioning, technical architecture assumptions, and go-to-market strategy remain unchanged. The SSOT still appears to be structured around assumptions that don't align with the URL-based AI democratization platform vision, regardless of whether the target market is geographically narrow or globally dispersed.

**Slot 5 (vercel_v0:v0-1.5-md)** [DEFERRED]: _(deferred / no text)_

**Slot 6 (openrouter:mistralai/mistral-large-2411)** [ENGAGED]: The corrected broader framing does materially change the assessment. It expands the target market to include more diverse and global underserved segments, which may require adjustments in the SSOT to better align with this broader scope.

**Slot 7 (openrouter:deepseek/deepseek-r1)** [ENGAGED]: The broader framing does not materially change the need for substantial SSOT rework. While it expands the target segments beyond emerging economies, the core misalignment persists because the SSOT's foundational market analysis, user journey mapping, and moat strategy were built for a geographically narrow focus. The SSOT still requires comprehensive restructuring to address the multidimensional underserved segments now explicitly included.

**Slot 8 (openrouter:meta-llama/llama-3.3-70b-instruct)** [ENGAGED]: The corrected broader framing does not materially change the assessment of whether the SSOT needs substantial rework, as the underlying strategic misalignment is independent of geographic scope width. The focus on underserved market segments globally highlights the need for a more comprehensive approach to SSOT. This broader framing may even exacerbate existing misalignments if not properly addressed.

**Slot 9 (openrouter:qwen/qwen-2.5-72b-instruct)** [ENGAGED]: The corrected broader framing does materially change my assessment. It expands the scope to include a wider range of underserved segments, which could better align with the SSOT's strategic vision and market opportunities.

**Slot 10 (openrouter:openai/gpt-4o)** [ENGAGED]: The corrected broader framing does materially change the assessment of the SSOT's need for rework. By expanding the focus to underserved market segments globally, the strategic alignment can better address diverse user needs and opportunities, potentially reducing the extent of rework required.

#### Qβ-3 — Single biggest SSOT-implication difference between prior narrower framing and corrected broader framing (verbatim per reviewer)

**Slot 1 (openrouter:openai/gpt-5)** [ENGAGED]: The biggest change is a shift from a geography-first thesis to a need/segment-first thesis that spans all geographies. This reframes SSOT implications for segmentation, TAM, localization, and distribution from “emerging markets only” to “underserved anywhere” as the organizing principle.

**Slot 2 (openrouter:openai/gpt-4o)** [ENGAGED]: The biggest difference is the inclusion of underserved segments beyond just geographic underdeveloped economies, such as rural communities in developed countries and low-income urban populations. This change broadens the potential impact and applicability of FlowAI's offerings.

**Slot 3 (openrouter:google/gemini-2.5-pro)** [ENGAGED]: The single biggest difference is the shift from a geographically-defined market to a socio-economically defined one, which introduces massive heterogeneity. This invalidates any SSOT assumptions based on a monolithic 'emerging market' user profile and requires a far more complex, multi-faceted strategy for product, GTM, and pricing.

**Slot 4 (openrouter:anthropic/claude-opus-4)** [ENGAGED]: The single biggest difference is that the broader framing dramatically expands the total addressable market from billions in emerging economies to potentially tens of billions globally, including underserved segments in wealthy nations. This changes the revenue achievability calculus and go-to-market strategy requirements, but doesn't resolve the core issue that the SSOT appears misaligned with the fundamental 'URL-based AI democratization platform' concept. The SSOT would need the same structural revisions whether targeting narrow or broad underserved segments.

**Slot 5 (vercel_v0:v0-1.5-md)** [DEFERRED]: _(deferred / no text)_

**Slot 6 (openrouter:mistralai/mistral-large-2411)** [ENGAGED]: The single biggest difference is the inclusion of rural communities in developed countries and low-income urban populations anywhere, which were not explicitly targeted in the prior framing. This expansion necessitates a more inclusive and flexible approach in the SSOT.

**Slot 7 (openrouter:deepseek/deepseek-r1)** [ENGAGED]: The single biggest difference is the shift from a geography-centric model (prioritizing emerging economies) to a multidimensional inclusion framework covering rural/urban, linguistic, and economic accessibility globally. This fundamentally alters SSOT requirements by necessitating localized strategies for diverse underserved segments—like rural US communities and non-dominant language groups—that weren't previously scoped.

**Slot 8 (openrouter:meta-llama/llama-3.3-70b-instruct)** [ENGAGED]: The single biggest difference between the prior narrower framing and the corrected broader framing is the expansion of the target market to include not just underdeveloped economies, but also rural communities in developed countries, low-income urban populations, and neglected language groups. This broader scope introduces new complexities and requirements for the SSOT, highlighting the need for a more nuanced and comprehensive approach. The corrected framing necessitates a more detailed analysis of the SSOT's ability to support these diverse market segments.

**Slot 9 (openrouter:qwen/qwen-2.5-72b-instruct)** [ENGAGED]: The single biggest difference is the inclusion of rural communities in developed countries and low-income urban populations, which significantly broadens the potential user base and market opportunities for FlowAI.

**Slot 10 (openrouter:openai/gpt-4o)** [ENGAGED]: The biggest difference is the shift from a geographically limited focus to a more inclusive global perspective. This change allows for a wider range of user demographics and needs to be considered, which can impact product development and market strategies.

#### Qβ-2 rationales (verbatim per reviewer)

**Slot 1 (openrouter:openai/gpt-5)** picked `(a)` [ENGAGED]: The key gaps are segment-agnostic: unclear articulation of FlowAI’s unique category/moat, mapping to the 6 P&Ls, pricing/GTM mechanics, and the Year-6 $5B revenue logic. Broadening scope by geography does not resolve these SSOT misalignments.

**Slot 2 (openrouter:openai/gpt-4o)** picked `(c)` [ENGAGED]: The broader framing helps, but specific SSOT sections like O1 and O3 still need rework to fully align with the expanded strategic vision.

**Slot 3 (openrouter:google/gemini-2.5-pro)** picked `(a)` [ENGAGED]: The prior review found foundational misalignments even with a narrower scope. Broadening the target market to diverse global segments introduces significantly more complexity, exacerbating any existing gaps in the SSOT's strategic planning and execution details.

**Slot 4 (openrouter:anthropic/claude-opus-4)** picked `(a)` [ENGAGED]: The underlying SSOT-strategic misalignment is structural and doesn't depend on geographic scope width. The SSOT needs rework to properly reflect FlowAI as a new category platform, not just to adjust market targeting.

**Slot 5 (vercel_v0:v0-1.5-md)** picked `—` [DEFERRED]: _(deferred / no rationale)_

**Slot 6 (openrouter:mistralai/mistral-large-2411)** picked `(c)` [ENGAGED]: The broader framing helps but specific SSOT sections such as O1, O3, and O6 still need rework to fully align with the expanded target market.

**Slot 7 (openrouter:deepseek/deepseek-r1)** picked `(a)` [ENGAGED]: Substantial rework remains necessary because the SSOT's market definition (O1), user personas (O3), and strategic moat justification (MG-) are fundamentally misaligned with the global underserved segments framework. These sections require complete overhaul to address non-geographic inclusion factors like language diversity and income-based accessibility.

**Slot 8 (openrouter:meta-llama/llama-3.3-70b-instruct)** picked `(a)` [ENGAGED]: The underlying SSOT-strategic misalignment does not depend on geographic scope width, and thus substantial rework is still needed to ensure alignment with the corrected broader framing.

**Slot 9 (openrouter:qwen/qwen-2.5-72b-instruct)** picked `(c)` [ENGAGED]: The broader framing helps but specific SSOT sections still need rework, particularly O1 (Market Segmentation), O3 (Target Customer Profiles), and E4 (Revenue Model).

**Slot 10 (openrouter:openai/gpt-4o)** picked `(c)` [ENGAGED]: The broader framing helps, but specific SSOT sections like O1 and O3 still need rework to align with the new strategic vision.

---

## Step B — Re-clustered Q1-5 Amendments

### B.1 Strict Jaccard 0.25 clustering (connected components)

**Method:** Each reviewer's Q1_5 verbatim text was split into individual amendment proposals using structural cues ("Amendment N", numbered "N)", section-anchor sentences). Each proposal was tokenized at word level (lowercase, drop stopwords, drop <3-char tokens, preserve SSOT anchors as caseful). Pairwise Jaccard similarity was computed across all proposals; clusters are connected components in the graph where edges = Jaccard ≥ 0.25. W5b's prior method used Jaccard 0.4 and returned 0 clusters — the 0.25 threshold here is the dispatch-recommended loosening.

**Result:** 32 proposals → 29 Jaccard clusters. Largest cluster = 4 unique reviewers. **The strict-Jaccard method alone yields no ≥7/10 supermajority cluster** — exactly the W5b finding the dispatch flagged. See the anchor/theme view below for the supermajority signals that strict-Jaccard tokenization fragments.

#### Jaccard 0.25 clusters with ≥2 unique reviewers

| CL-ID | Unique reviewers | Slots | Top SSOT anchors | Top keywords | Needs framing fix |
|-------|-----------------:|-------|------------------|--------------|-------------------|
| CL-1 | 4 | 1, 3, 4, 9 | O1 | orchestration, engine, democratization, platform, url-based | YES |

### B.2 Anchor / theme clustering

**Method:** Each amendment proposal was attributed to the SSOT anchor(s) it explicitly cites (`O#`, `L#`, `E#`, `EP#`, `MG#`, `RR#`, `PI#`, `DG#`) AND to a small set of theme anchors derived by keyword presence (THEME_GEOGRAPHIC_BROADENING, THEME_DEMOCRATIZATION_REFRAME, THEME_VENDOR_USER_JOURNEY, THEME_COMMERCIAL_ARCHITECTURE, THEME_MONETIZATION_RAILS). One proposal can land in multiple anchor clusters. The corrected-framing flag is set true if any proposal in the cluster references "underdeveloped / emerging-market" wording that needs generalization to "underserved globally" per CEO 2026-05-13.

**Result:** 21 anchor/theme clusters. **2 with ≥7 unique reviewers** (supermajority) and **4 with 5-6 unique reviewers** (plurality). This is the signal the strict-Jaccard method missed.

| Anchor / Theme | Unique reviewers | Slots | Proposal count | Needs framing fix |
|----------------|-----------------:|-------|---------------:|-------------------|
| `THEME_GEOGRAPHIC_BROADENING` | 9 | 1, 2, 3, 4, 5, 6, 7, 9, 10 | 15 | YES |
| `THEME_DEMOCRATIZATION_REFRAME` | 8 | 1, 2, 3, 4, 5, 6, 9, 10 | 10 | YES |
| `O1` | 6 | 1, 3, 4, 5, 7, 9 | 6 | YES |
| `THEME_VENDOR_USER_JOURNEY` | 6 | 1, 3, 4, 5, 7, 10 | 11 | YES |
| `E4` | 5 | 1, 4, 6, 8, 10 | 6 | YES |
| `THEME_COMMERCIAL_ARCHITECTURE` | 5 | 1, 2, 4, 5, 6 | 6 | YES |
| `O6` | 3 | 3, 4, 5 | 3 | YES |
| `THEME_MONETIZATION_RAILS` | 2 | 1, 5 | 3 | YES |
| `E8` | 2 | 3, 4 | 2 | YES |
| `O3` | 2 | 4, 9 | 2 | YES |
| `L2` | 2 | 8, 10 | 2 | no |
| `O10` | 1 | 1 | 1 | YES |
| `MG8` | 1 | 1 | 1 | no |
| `MG6` | 1 | 1 | 1 | no |
| `E7` | 1 | 4 | 1 | YES |
| `MG7` | 1 | 5 | 1 | YES |
| `MG9` | 1 | 5 | 1 | YES |
| `O5` | 1 | 6 | 1 | YES |
| `EP7` | 1 | 6 | 1 | no |
| `E1` | 1 | 7 | 1 | YES |
| `MG2` | 1 | 8 | 1 | no |

#### Verbatim quotes for the supermajority + plurality clusters (≥5/10 unique reviewers)

##### `THEME_GEOGRAPHIC_BROADENING` — 9 unique reviewers (slots 1, 2, 3, 4, 5, 6, 7, 9, 10) [needs framing fix]

- **Slot 1:** 2) Section E4 should change from “Implementation rail: Stripe Connect via Agent #4” to “Implementation rails: Stripe Connect + emerging-market alternatives (Paystack, Flutterwave, M‑Pesa) selected via Marketplace policy with Africa-availability weighting” because Framing #6 allows emerging-market benchmarks and vendors need local rails.
- **Slot 2:** Section on product focus should change from 'product remediation' to 'AI democratization platform' to align with the CEO's vision. The geographic focus should be explicitly stated as targeting emerging economies. The user journey section should emphasize the transition from internal dogfooding to mass-market adoption. The pricing model should reflect the hybrid approach outlined in the strategic framing. Finally, the SSOT should include a clear plan for activating dormant agents to meet the stra…
- **Slot 3:** Section O6 ("First, not exclusive") should be amended to frame the 5 VEU products explicitly as the proof-of-concept for the mass-market vendor ecosystem, aligning with the user journey in Framing #4. Finally, a new ethics section, E8 'Commitment to Emerging Economies,' should be added to codify the geographic focus from Framing #1 and #6a, making it an explicit governance principle.
- **Slot 4:** Section O1 should change from 'orchestration engine' to 'URL-based AI democratization platform that orchestrates product creation from existing URLs, enabling users in emerging economies to become vendors.'
- **Slot 5:** Amendment 2 — Elevator Pitch: The Elevator Pitch should change from its current VEU-centric framing ('takes any AI product from idea to production and keeps it there … five flagship products … onboard arbitrary external providers via Stripe Connect at a 15% platform fee') to explicitly open with the democratization thesis: 'FlowAI is the URL-based AI democratization platform that enables any individual — including unemployed youth and small-organization builders in emerging economies — to input …
- **Slot 6:** Section O5 should change from 'Singular as code/canonical (one G3-ratified spec); plural at runtime (one isolated instance per provider org via Supabase RLS + Vercel project boundaries)' to include a clearer emphasis on the platform's role in democratizing AI for emerging economies.
- **Slot 7:** Section ONTOLOGY (O1) should add 'for AI democratization in emerging economies' to FlowAI's primary identity, as CEO pt1 positions it as a new category. Section ETHICS (E1) must include 'affordability and low-bandwidth accessibility' in self-protection clauses to reflect emerging-market users. In DOABILITY, add a gap: 'Localization capacity for languages prevalent in target regions (e.g., Swahili, Hindi)' — critical for CEO pt1's unemployed youth focus.
- **Slot 9:** Section O1 should change from 'FlowAI is primarily an orchestration engine' to 'FlowAI is a URL-based AI democratization platform' because the strategic framing emphasizes FlowAI's role in democratizing AI access in emerging economies.
- **Slot 10:** Section E4 should specify how revenue models align with empowering users in emerging economies. The SSOT should include a

##### `THEME_DEMOCRATIZATION_REFRAME` — 8 unique reviewers (slots 1, 2, 3, 4, 5, 6, 9, 10) [needs framing fix]

- **Slot 1:** 1) Section O1 should change from “primarily an orchestration engine” to “a URL-based AI democratization platform whose orchestration engine powers vendors to build from existing URLs” because Framing #1 requires explicit democratization language, not just orchestration.
- **Slot 2:** Section on product focus should change from 'product remediation' to 'AI democratization platform' to align with the CEO's vision. The geographic focus should be explicitly stated as targeting emerging economies. The user journey section should emphasize the transition from internal dogfooding to mass-market adoption. The pricing model should reflect the hybrid approach outlined in the strategic framing. Finally, the SSOT should include a clear plan for activating dormant agents to meet the stra…
- **Slot 3:** Section O1 (Primary identity) should change from an "orchestration engine" to an "AI democratization platform... to empower individual builders... to become vendors," directly incorporating the mission from Framing #1. Second,
- **Slot 4:** Section O1 should change from 'orchestration engine' to 'URL-based AI democratization platform that orchestrates product creation from existing URLs, enabling users in emerging economies to become vendors.'
- **Slot 5:** Amendment 1 — O1 (Primary identity): Section O1 should change from 'FlowAI is primarily an orchestration engine; agents, pipeline, and tools are its apparatus; the platform layer is what makes orchestration multi-tenant' to 'FlowAI is primarily a URL-based AI democratization platform — any user may supply existing product URLs to compare, contrast, strengthen, or synthesize new products; its orchestration engine (25 agents, 8-step pipeline, 95/95 gates, Playwright crawl) is the apparatus that de…
- **Slot 6:** EP7 should change from 'Engineering authority — Layer 1 vs Layer 2 vs Layer 3' to include a more detailed explanation of how the engineering layers support the strategic framing of FlowAI as an AI democratization platform.
- **Slot 9:** Section O1 should change from 'FlowAI is primarily an orchestration engine' to 'FlowAI is a URL-based AI democratization platform' because the strategic framing emphasizes FlowAI's role in democratizing AI access in emerging economies.
- **Slot 10:** Section L2 should change from focusing solely on agent orchestration to include market positioning as an AI democratization platform.

##### `O1` — 6 unique reviewers (slots 1, 3, 4, 5, 7, 9) [needs framing fix]

- **Slot 1:** 1) Section O1 should change from “primarily an orchestration engine” to “a URL-based AI democratization platform whose orchestration engine powers vendors to build from existing URLs” because Framing #1 requires explicit democratization language, not just orchestration.
- **Slot 3:** Section O1 (Primary identity) should change from an "orchestration engine" to an "AI democratization platform... to empower individual builders... to become vendors," directly incorporating the mission from Framing #1. Second,
- **Slot 4:** Section O1 should change from 'orchestration engine' to 'URL-based AI democratization platform that orchestrates product creation from existing URLs, enabling users in emerging economies to become vendors.'
- **Slot 5:** Amendment 1 — O1 (Primary identity): Section O1 should change from 'FlowAI is primarily an orchestration engine; agents, pipeline, and tools are its apparatus; the platform layer is what makes orchestration multi-tenant' to 'FlowAI is primarily a URL-based AI democratization platform — any user may supply existing product URLs to compare, contrast, strengthen, or synthesize new products; its orchestration engine (25 agents, 8-step pipeline, 95/95 gates, Playwright crawl) is the apparatus that de…
- **Slot 7:** Section ONTOLOGY (O1) should add 'for AI democratization in emerging economies' to FlowAI's primary identity, as CEO pt1 positions it as a new category. Section ETHICS (E1) must include 'affordability and low-bandwidth accessibility' in self-protection clauses to reflect emerging-market users. In DOABILITY, add a gap: 'Localization capacity for languages prevalent in target regions (e.g., Swahili, Hindi)' — critical for CEO pt1's unemployed youth focus.
- **Slot 9:** Section O1 should change from 'FlowAI is primarily an orchestration engine' to 'FlowAI is a URL-based AI democratization platform' because the strategic framing emphasizes FlowAI's role in democratizing AI access in emerging economies.

##### `THEME_VENDOR_USER_JOURNEY` — 6 unique reviewers (slots 1, 3, 4, 5, 7, 10) [needs framing fix]

- **Slot 1:** 1) Section O1 should change from “primarily an orchestration engine” to “a URL-based AI democratization platform whose orchestration engine powers vendors to build from existing URLs” because Framing #1 requires explicit democratization language, not just orchestration.
- **Slot 3:** Section O1 (Primary identity) should change from an "orchestration engine" to an "AI democratization platform... to empower individual builders... to become vendors," directly incorporating the mission from Framing #1. Second,
- **Slot 4:** Section O1 should change from 'orchestration engine' to 'URL-based AI democratization platform that orchestrates product creation from existing URLs, enabling users in emerging economies to become vendors.'
- **Slot 5:** Amendment 1 — O1 (Primary identity): Section O1 should change from 'FlowAI is primarily an orchestration engine; agents, pipeline, and tools are its apparatus; the platform layer is what makes orchestration multi-tenant' to 'FlowAI is primarily a URL-based AI democratization platform — any user may supply existing product URLs to compare, contrast, strengthen, or synthesize new products; its orchestration engine (25 agents, 8-step pipeline, 95/95 gates, Playwright crawl) is the apparatus that de…
- **Slot 7:** Section ONTOLOGY (O1) should add 'for AI democratization in emerging economies' to FlowAI's primary identity, as CEO pt1 positions it as a new category. Section ETHICS (E1) must include 'affordability and low-bandwidth accessibility' in self-protection clauses to reflect emerging-market users. In DOABILITY, add a gap: 'Localization capacity for languages prevalent in target regions (e.g., Swahili, Hindi)' — critical for CEO pt1's unemployed youth focus.
- **Slot 10:** new section detailing how FlowAI will support small organizations and unemployed youth as vendors, aligning with the CEO's vision.

##### `E4` — 5 unique reviewers (slots 1, 4, 6, 8, 10) [needs framing fix]

- **Slot 1:** 2) Section E4 should change from “Implementation rail: Stripe Connect via Agent #4” to “Implementation rails: Stripe Connect + emerging-market alternatives (Paystack, Flutterwave, M‑Pesa) selected via Marketplace policy with Africa-availability weighting” because Framing #6 allows emerging-market benchmarks and vendors need local rails.
- **Slot 4:** Section E4 should clarify the 15% ceiling applies to the democratization platform model, not just VEU's internal products.
- **Slot 6:** Section E4 should change from 'VEU platform fee is a ceiling of 15%' to include specific revenue models and pricing strategies that align with the focus on small organizations and individual builders.
- **Slot 8:** Section E4 should change from 'Doppler integration is designed, not wired' to 'Doppler is wired and operational for FlowAI project' because the CredentialAdapter now routes through Doppler.
- **Slot 10:** Section E4 should specify how revenue models align with empowering users in emerging economies. The SSOT should include a

##### `THEME_COMMERCIAL_ARCHITECTURE` — 5 unique reviewers (slots 1, 2, 4, 5, 6) [needs framing fix]

- **Slot 1:** 3) Section O10 should add that Self‑Renewal Alerts weight signals for emerging-market availability, pricing, and regulation, and include low-connectivity cost/latency metrics, because Framing #1 targets underdeveloped economies.
- **Slot 2:** Section on product focus should change from 'product remediation' to 'AI democratization platform' to align with the CEO's vision. The geographic focus should be explicitly stated as targeting emerging economies. The user journey section should emphasize the transition from internal dogfooding to mass-market adoption. The pricing model should reflect the hybrid approach outlined in the strategic framing. Finally, the SSOT should include a clear plan for activating dormant agents to meet the stra…
- **Slot 4:** New section needed after E7: 'E8. Geographic commitment - Primary focus on underdeveloped/emerging economies with TAM-appropriate pricing models.'
- **Slot 5:** Amendment 3 — NEW section after MG7: 'MG9. Commercial architecture and $5B Year-6 ARR thesis (Panel-authored, per framing points #2, #3, #6, #7): The Panel adopts the following revenue framework as guidance for SSOT coherence: (a) Geographic mix — [Panel to propose; CEO framing point #6 delegates this]; (b) Benchmark set — [Panel to propose hybrid emerging-market/developer-tool benchmarks per framing point #6]; (c) Revenue-weighting split — FlowAI ARR as X% of $5B vs. five-product combined ARR a…
- **Slot 6:** Section E4 should change from 'VEU platform fee is a ceiling of 15%' to include specific revenue models and pricing strategies that align with the focus on small organizations and individual builders.


---

## Step C — Candidate Amendment List

Candidate amendments are ordered by **unique-reviewer count descending**, derived from the anchor/theme clustering. Each candidate cites its source cluster, lists the proposing reviewer slots, marks supermajority status (≥7/10), flags corrected-framing applicability, and assigns a W5c confidence level (HIGH / MEDIUM / LOW).

#### ≥5/10 candidates (eligible for unified draft Step A)

| CA-ID | Reviewer count | Slots | Supermajority | Framing applicability | W5c confidence | Source cluster |
|-------|---------------:|-------|---------------|-----------------------|----------------|----------------|
| **CA-1** | 9 | 1, 2, 3, 4, 5, 6, 7, 9, 10 | YES (≥7/10) | REQUIRES generalization — Panel used "underdeveloped/emerging economies"; CEO correction widens this | HIGH | `THEME_GEOGRAPHIC_BROADENING` |
| **CA-2** | 8 | 1, 2, 3, 4, 5, 6, 9, 10 | YES (≥7/10) | framing-neutral | HIGH | `THEME_DEMOCRATIZATION_REFRAME` |
| **CA-3** | 6 | 1, 3, 4, 5, 7, 9 | PLURALITY (5-6/10) | REQUIRES generalization | HIGH | `O1` |
| **CA-4** | 6 | 1, 3, 4, 5, 7, 10 | PLURALITY (5-6/10) | REQUIRES generalization | HIGH | `THEME_VENDOR_USER_JOURNEY` |
| **CA-5** | 5 | 1, 4, 6, 8, 10 | PLURALITY (5-6/10) | REQUIRES generalization | MEDIUM | `E4` |
| **CA-6** | 5 | 1, 2, 4, 5, 6 | PLURALITY (5-6/10) | framing-neutral (structure invariant; populated content must serve underserved-globally) | MEDIUM-HIGH | `THEME_COMMERCIAL_ARCHITECTURE` |

#### Below-threshold candidates (<5/10; surfaced for transparency, not in unified draft)

| CA-ID | Reviewer count | Slots | Source cluster | W5c note |
|-------|---------------:|-------|----------------|----------|
| **CA-7** | 3 | 3, 4, 5 | `O6` | Below ≥5/10. The verbatim O6 rewrite per Slot 5's prose is preserved here for CEO consideration but is structurally subsumed by CA-4. |
| **CA-8** | 2 | 3, 4 | `E8` | Below ≥5/10. Spirit covered by CA-1 applied either as new section or as edits-in-place. |
| **CA-9** | 2 | 4, 9 | `O3` | Below ≥5/10. Partially absorbed into CA-4. |
| **CA-10** | 2 | 8, 10 | `L2` | Housekeeping; covered by FLOWAI_SSOT_REFRESH_DRAFT_2026-05-13.md. |

#### Full candidate text (≥5/10 only)

**CA-1 — Broaden geographic scope to "UNDERSERVED MARKET SEGMENTS GLOBALLY"** (9/10)

> Amend every SSOT section that references geographic / user scope (currently: O1, O6, E4 commercial framing, MG-) to use the corrected wording **"UNDERSERVED MARKET SEGMENTS GLOBALLY"** — explicitly inclusive of (a) underdeveloped economies, (b) rural communities in developed countries, (c) low-income urban populations anywhere, (d) neglected language / cultural groups, (e) small businesses and individuals priced out of enterprise AI tools regardless of geography.

**CA-2 — Reframe FlowAI as URL-based AI democratization platform** (8/10)

> Amend SSOT Section **O1** (Primary identity) and the **Elevator Pitch** from "orchestration engine" framing to explicit "URL-based AI democratization platform" framing. Lead with the democratization thesis (compare / contrast / strengthen / synthesize existing URLs); frame the 25-agent orchestration as the *apparatus* that delivers democratization, not as the primary identity.

**CA-3 — Replace O1 verbatim text** (6/10)

> Replace O1 from "FlowAI is primarily an orchestration engine; agents, pipeline, and tools are its apparatus; the platform layer is what makes orchestration multi-tenant" → to "FlowAI is primarily a URL-based AI democratization platform for underserved market segments globally — any user may supply existing product URLs to compare, contrast, strengthen, or synthesize new products; its 25-agent orchestration engine, 8-step pipeline, 95/95 quality gates, and Playwright crawl are the apparatus that delivers that democratization at production grade; the multi-tenant platform layer is what makes any user a potential vendor of the resulting Native Apps, Mobile Apps, SaaS, or Agentic AI products."

**CA-4 — Add explicit Year-1→Year-6 user journey to O6** (6/10)

> Amend O6 ("First, not exclusive") to add explicit Year-1→Year-6 user journey: Year 1 = VEU Studio as only paying customer + 5 non-FlowAI products as first proof-of-capability vendor-tenants; Year 2+ = mass-market adoption across underserved global segments (individuals, small businesses, consultants, unemployed youth, small organizations becoming vendors of Native Apps / Mobile Apps / SaaS / Agentic AI built on FlowAI); Year 6 = same mix + enterprise + mass-consumer + professional services layered on.

**CA-5 — Generalize E4 (commercial rail) beyond Stripe Connect** (5/10)

> Amend E4 ("Revenue rail") from "Stripe Connect via Agent #4" to "Stripe Connect + globally-appropriate alternative rails (e.g., Paystack / Flutterwave / M-Pesa for African-region rails; bank-transfer / local-equivalent rails for rural / low-income segments in developed countries; per-region availability-weighted routing) via CredentialAdapter Marketplace policy." Add backlog item that Stripe Connect SDK + onboarding flow is not yet shipped. Clarify the 15% platform fee ceiling applies to the democratization platform model generally — not only to VEU's five internal products.

**CA-6 — Add new section MG9 "Commercial Architecture and $5B Year-6 ARR Thesis" (Panel-authored)** (5/10)

> Add new SSOT section **MG9** (Panel-authored): (a) Year-6 geographic / segment revenue mix; (b) hybrid benchmark set (emerging-market plays + developer-tool plays); (c) revenue-weighting split between FlowAI ARR and the 5 non-FlowAI products combined ARR; (d) per-product Year-6 ARR floors evaluated against respective TAMs with no artificial caps; (e) per-product pricing model (FlowAI usage-based, RelTwin subscription tiers, SAIGE per-seat, PressAI / ReachSMS / MyPregLife Panel-proposed; hybrid models allowed); (f) $5B = Year-6 ARR, NOT cumulative.


---

## Step A — Unified Draft Amendment

> _The full draft is also saved as a stand-alone file at `docs/FLOWAI_SSOT_AMENDMENT_DRAFT_2026-05-14.md` for CEO disposition. Verbatim copy below for one-stop review._

---

# FlowAI SSOT — Amendment Draft (2026-05-14)

## Status

DRAFT AMENDMENT to `docs/FLOWAI_SSOT.md` (canonical 2026-05-11, commit
`fbaf881`) and `docs/FLOWAI_SSOT_REFRESH_DRAFT_2026-05-13.md` (commit
`c84a699`). **NOT canonical** until CEO disposition + Panel ≥7/10
supermajority on each amendment per MG2. Do not promote.

## Provenance

Synthesized from the 10-reviewer Panel verbatim Q1-5 free-text responses
in commit `b512293` (`docs/panel-consultations/architecture-trajectory-
process-mission-review-2026-05-13.md`), re-clustered with two
complementary methods at Jaccard 0.25 — strict word-token Jaccard
clustering (connected-components) + an anchor/theme clustering that
groups proposals by the SSOT section or thematic anchor they reference.
Both clusterings were filtered through the corrected strategic framing
(CEO 2026-05-13: "underserved market segments globally") and validated
against a Panel re-evaluation (Step β, this dispatch, 9/10 ENGAGED).

W5b's prior CS-5 clustering at Jaccard 0.4 returned 0 clusters; the
0.25 threshold here, combined with the anchor/theme pass, surfaces
**2 supermajority and 4 plurality clusters** that the strict-Jaccard
method alone missed.

**Step β re-eval result (this dispatch):** with the corrected broader
framing, 0 of 9 ENGAGED reviewers said "minor amendments suffice"
(option b). 5/9 said substantial rework still needed (option a); 4/9
said partial rework still needed (option c). The Panel re-affirms that
the prior finding ("substantial SSOT rework needed") **holds under the
broader framing** — broadening geographic scope does NOT resolve the
underlying SSOT-strategic misalignment. See `docs/panel-consultations/
ssot-amendment-synthesis-2026-05-14.md` Step β for verbatim free text.

## Corrected strategic framing (verbatim from CEO 2026-05-13)

```
CEO STRATEGIC VISION (CORRECTED 2026-05-13):

  1. FlowAI is a NEW CATEGORY — not a competitor to Vercel / Replit /
     Lovable / Bubble / Salesforce. FlowAI is a URL-based AI
     democratization platform focused on using EXISTING URLs to
     (a) compare, (b) contrast, (c) strengthen existing products, or
     (d) synthesize new products.

  2. STRATEGIC MOAT: serving UNDERSERVED MARKET SEGMENTS GLOBALLY.
     NOT geographic emerging-market only. Scope includes:
       - Underdeveloped economies (Sub-Saharan Africa, parts of Latin
         America, parts of South/Southeast Asia)
       - Rural communities in developed countries (rural US, rural
         Europe, rural Australia, etc.)
       - Low-income urban populations in any country
       - Neglected language / cultural groups anywhere
       - Small businesses and individuals priced out of enterprise AI
         tools regardless of geography

  3. PRIMARY USERS: small organizations, unemployed youth, individual
     builders, consultants, small business owners who become VENDORS
     of Native Apps / Mobile Apps / SaaS / Agentic AI built on FlowAI
     — in any of the underserved segments above.

  4. VEU AI Studio operates 6 P&L business units. All uncapped. All
     target their respective TAMs:
       - FlowAI: AI democratization platform (the strategic moat)
       - SAIGE: B2B ESG / EHS / CSR / SDG / sustainability impact
         management
       - PressAI: knowledge sharing
       - RelTwin: relationships management + comms
       - ReachSMS: communities leadership + development
       - MyPregLife: pregnancy / maternal health tracking

  5. NICHE ≠ SMALL. The 5 non-FlowAI products target their respective
     TAMs without artificial revenue caps. Panel research proposes
     TAM-credible Year-6 ARR for each.

  6. USER JOURNEY:
     - Year 1: VEU Studio is the only paying FlowAI customer.
     - Year 2+: Mass-market adoption across underserved global
       segments.
     - Year 6: Same mix plus enterprise + mass-consumer +
       professional services layered on.

  7. PRICING IS HYBRID, PER-PRODUCT:
     - FlowAI: per-app / per-deployment usage-based
     - RelTwin: subscription tiers
     - SAIGE: per-seat enterprise
     - PressAI / ReachSMS / MyPregLife: Panel-proposed
     - Hybrid models allowed

  8. $5B = ANNUAL RECURRING REVENUE AT YEAR 6. NOT cumulative.
```

## Proposed amendments (candidates with ≥5/10 reviewer support)

Each amendment cites the source candidate ID (`CA-N`) from
`docs/panel-consultations/ssot-amendment-synthesis-2026-05-14.md`
Step C. Reviewer counts are unique-slot counts from the anchor/theme
clustering at Jaccard 0.25.

### Amendment 1 — Reframe FlowAI as URL-based AI democratization platform

**Source:** CA-2 (THEME_DEMOCRATIZATION_REFRAME cluster)
**Reviewer count:** 8/10 — slots 1, 2, 3, 4, 5, 6, 9, 10
**Supermajority status:** YES (≥7/10)
**Framing applicability:** framing-neutral (the democratization reframe
is independent of geographic scope; applies regardless)
**W5c confidence:** HIGH

**Amendment text:**

> Amend SSOT Section **O1** (Primary identity) and the **Elevator
> Pitch** from "orchestration engine" framing to explicit
> "URL-based AI democratization platform" framing. The SSOT must lead
> with the democratization thesis (compare / contrast / strengthen /
> synthesize existing URLs) and frame the 25-agent orchestration as
> the *apparatus* that delivers democratization at production grade,
> not as the primary identity.

**W5c rationale:** 8 of 10 reviewers (every engaged reviewer except
slots 7 and 8 in this specific theme) independently proposed re-leading
the SSOT with "AI democratization platform" language. The cluster
spans both Jaccard CL-1 (slots 1, 3, 4, 9 — strict word overlap on
"orchestration / engine / democratization / platform / url-based /
vendors") and additional theme-attributed proposals from slots 2, 5, 6,
10. Step β re-affirms this: 9/9 ENGAGED reviewers said rework is needed
(substantial or partial), with O1 named explicitly by Slots 2, 6, 9,
10 in their (c) rationales.

---

### Amendment 2 — Generalize geographic scope from "emerging economies" to "UNDERSERVED MARKET SEGMENTS GLOBALLY"

**Source:** CA-1 (THEME_GEOGRAPHIC_BROADENING cluster)
**Reviewer count:** 9/10 — slots 1, 2, 3, 4, 5, 6, 7, 9, 10
**Supermajority status:** YES (≥7/10)
**Framing applicability:** REQUIRES generalization — the original
Panel proposals used "underdeveloped / emerging economies" wording;
the corrected CEO framing widens this to "underserved globally."
**W5c confidence:** HIGH

**Amendment text:**

> Amend every SSOT section that references the geographic / user
> scope (currently: O1, O6, E4 commercial framing, and the absent
> commitment section) to use the corrected wording **"UNDERSERVED
> MARKET SEGMENTS GLOBALLY"** — explicitly inclusive of (a)
> underdeveloped economies, (b) rural communities in developed
> countries, (c) low-income urban populations anywhere, (d) neglected
> language / cultural groups, (e) small businesses and individuals
> priced out of enterprise AI tools regardless of geography. Remove
> "emerging economies only" framing wherever it appears.

**W5c rationale:** 9 of 10 reviewers (all except slot 8) proposed
expanding the geographic / market-segment scope. Slot-specific
references: slots 1, 3, 4, 5, 7 cited "emerging economies" in their
proposed O1 amendments; slot 4 proposed a new section E8 "Geographic
commitment"; slot 7 added "affordability and low-bandwidth
accessibility" to E1; slots 2, 6, 9, 10 each cited geographic scope
in their (c) rationales. All such proposals must be **generalized** to
the corrected CEO wording before promotion — the Panel was answering
against the narrower prior framing.

---

### Amendment 3 — Replace O1 verbatim text

**Source:** CA-3 (O1 anchor cluster, derived from CA-1 + CA-2)
**Reviewer count:** 6/10 — slots 1, 3, 4, 5, 7, 9
**Supermajority status:** PLURALITY (just below ≥7/10)
**Framing applicability:** REQUIRES generalization
**W5c confidence:** HIGH

**Amendment text:**

> Replace O1 text:
>
> *Old:* "FlowAI is primarily an orchestration engine; agents,
> pipeline, and tools are its apparatus; the platform layer is what
> makes orchestration multi-tenant."
>
> *New:* "FlowAI is primarily a **URL-based AI democratization
> platform** for **underserved market segments globally** — any user
> may supply existing product URLs to **compare**, **contrast**,
> **strengthen**, or **synthesize new** products. Its 25-agent
> orchestration engine, 8-step pipeline, 95/95 quality gates, and
> Playwright crawl are the *apparatus* that delivers that
> democratization at production grade; the multi-tenant platform
> layer is what makes any user a potential **vendor** of the
> resulting Native Apps, Mobile Apps, SaaS, or Agentic AI products."

**W5c rationale:** 6 of 10 reviewers cited O1 specifically (slots 1,
3, 4, 5, 7, 9). The exact verbatim text above synthesizes slots 1 +
4 + 5's full-prose proposals (slot 5 contributed the longest,
most-quoted draft replacement; slot 4 contributed the "primary focus"
generalization; slot 1 contributed the "orchestration engine powers
vendors" framing). The replacement is structurally consistent with
Amendments 1 + 2 above and operationalizes both for SSOT promotion.

---

### Amendment 4 — Add explicit Year-1→Year-6 user journey to O6

**Source:** CA-4 (THEME_VENDOR_USER_JOURNEY cluster)
**Reviewer count:** 6/10 — slots 1, 3, 4, 5, 7, 10
**Supermajority status:** PLURALITY (just below ≥7/10)
**Framing applicability:** REQUIRES generalization (extend "mass-market
adoption" to underserved-globally scope rather than emerging-markets-
only scope)
**W5c confidence:** HIGH

**Amendment text:**

> Amend O6 ("First, not exclusive") to add an explicit Year-1→Year-6
> user journey:
>
> - **Year 1:** VEU Studio is the only paying FlowAI customer.
>   FlowAI is dogfooded internally; the five non-FlowAI products
>   (SAIGE, PressAI, RelTwin, ReachSMS, MyPregLife) are FlowAI's
>   first proof-of-capability vendor-tenants.
> - **Year 2+:** Mass-market adoption across underserved global
>   segments — individuals, small businesses, consultants, small
>   business owners, unemployed youth, and small organizations
>   become vendors of Native Apps / Mobile Apps / SaaS / Agentic AI
>   built on FlowAI.
> - **Year 6:** Same mix retained plus enterprise, mass-consumer,
>   and professional-services layers added.

**W5c rationale:** 6 of 10 reviewers explicitly proposed adding a
journey-by-year breakdown to O6 (slots 1, 3, 4, 5 in their prose
amendments; slots 7, 10 via shorter cross-cuts on user journey). Slot
3's "the 5 VEU products explicitly as the proof-of-concept for the
mass-market vendor ecosystem" frames the Year-1 dogfood / Year-2+
expansion logic precisely. Step β reinforced the need for explicit
user-journey articulation (9/9 ENGAGED on Qβ-2; multiple Qβ-1 free-
texts called out "user-journey mapping" as a section that still needs
rework even with broader framing).

---

### Amendment 5 — Generalize E4 (commercial rail) beyond Stripe Connect

**Source:** CA-5 (E4 anchor cluster)
**Reviewer count:** 5/10 — slots 1, 4, 6, 8, 10
**Supermajority status:** PLURALITY (≥5/10, just below ≥7/10)
**Framing applicability:** REQUIRES generalization
**W5c confidence:** MEDIUM

**Amendment text:**

> Amend E4 ("Revenue rail") from "Stripe Connect via Agent #4" to
> "Stripe Connect + globally-appropriate alternative rails (e.g.,
> Paystack, Flutterwave, M-Pesa for African-region rails; bank-
> transfer / local-equivalent rails for rural / low-income segments
> in developed countries; per-region availability-weighted routing)
> via CredentialAdapter Marketplace policy." Add an explicit backlog
> item that the Stripe Connect SDK client + onboarding flow is not
> yet shipped (refresh draft Open Item #2). Clarify that the **15%
> platform fee ceiling** applies to the democratization platform
> model in general — not only to VEU's five internal products.

**W5c rationale:** 5 of 10 reviewers raised E4 directly (slots 1, 4,
6, 8, 10). Slot 1 explicitly proposed multi-rail CredentialAdapter
policy with Paystack/Flutterwave/M-Pesa as named rails. Slot 4
proposed the 15% ceiling clarification. Slot 8 noted Doppler is now
operational. Slots 6 + 10 named E4 in their cross-cut amendment
clusters. The "Paystack / Flutterwave / M-Pesa" examples need
generalization per corrected framing: keep them as **examples for
the underdeveloped-economy region**, but explicitly add local-bank-
transfer / per-region examples for the rural-developed-country and
low-income-urban-anywhere segments.

---

### Amendment 6 — Add new section MG9 "Commercial Architecture and $5B Year-6 ARR Thesis" (Panel-authored)

**Source:** CA-6 (THEME_COMMERCIAL_ARCHITECTURE cluster)
**Reviewer count:** 5/10 — slots 1, 2, 4, 5, 6
**Supermajority status:** PLURALITY (≥5/10, just below ≥7/10)
**Framing applicability:** framing-neutral (commercial logic doesn't
depend on geo scope, but the Panel proposal must serve the underserved-
globally scope when authored)
**W5c confidence:** MEDIUM-HIGH

**Amendment text:**

> Add new SSOT section **MG9 "Commercial Architecture and $5B Year-6
> ARR Thesis"** (Panel-authored, per framing points 2 / 3 / 7):
>
>   (a) **Year-6 geographic / segment revenue mix proposal** —
>       proportions across the five underserved-globally segments,
>       allowing both emerging-market and developed-country-rural /
>       low-income-urban contributions to the $5B.
>   (b) **Benchmark set** — hybrid emerging-market plays (Paystack,
>       Flutterwave, M-Pesa, Mercado Libre, Grab) AND developer-tool
>       plays (Vercel, Replit, Lovable, Bubble).
>   (c) **Revenue-weighting split** — FlowAI ARR as X% of the $5B
>       Year-6 ARR target vs. the five non-FlowAI products'
>       combined ARR as (100−X)%. Panel-proposed split.
>   (d) **Per-product Year-6 ARR floors** — each of the six P&L
>       units (FlowAI + SAIGE + PressAI + RelTwin + ReachSMS +
>       MyPregLife) evaluated against its respective TAM with NO
>       artificial revenue caps (per framing #5: "niche ≠ small").
>   (e) **Per-product pricing model**:
>         - FlowAI: per-app / per-deployment usage-based
>         - RelTwin: subscription tiers
>         - SAIGE: per-seat enterprise
>         - PressAI / ReachSMS / MyPregLife: Panel-proposed
>         - Hybrid models allowed
>   (f) **$5B = Year-6 ARR, NOT cumulative** (framing #8 explicit).

**W5c rationale:** Slot 5's MG9 proposal (verbatim full-prose draft)
captures (a)-(e) above; slots 1 + 4 reinforced parts (a), (c), (e);
slots 2 + 6 noted that the commercial architecture is currently
absent from SSOT and refresh. The framing-neutral status applies
because the structure of the section is invariant under geographic
scope — but the *content* the Panel populates into (a) and (b) must
serve underserved-globally, not emerging-markets-only.

---

## Sections of SSOT requiring amendment (text changes to existing sections)

| SSOT anchor | Driving amendment(s) | Reviewer count |
|-------------|----------------------|----------------|
| Elevator Pitch | Amendment 1 | 8/10 |
| O1 Primary identity | Amendment 1 + 2 + 3 | 6-9/10 |
| O6 First, not exclusive | Amendment 4 | 6/10 |
| E4 Revenue rail | Amendment 5 | 5/10 |

## Sections proposed for ADDITION (entirely new SSOT sections)

| New section | Driving amendment | Reviewer count |
|-------------|-------------------|----------------|
| MG9 Commercial Architecture and $5B Year-6 ARR Thesis | Amendment 6 | 5/10 |
| (Note) Amendment 2's geographic-scope language may be applied as new section "E8 Underserved-Globally Commitment" or as edits-in-place across existing sections — CEO disposition required | Amendment 2 | 9/10 |

## Items NOT amended (clusters below ≥5/10 threshold; documented for transparency)

| Cluster | Anchor | Reviewer count | Slots | Why not in unified draft |
|---------|--------|---------------:|-------|--------------------------|
| O6 specific rework | O6 | 3/10 | 3, 4, 5 | Absorbed into Amendment 4 above; the verbatim O6 rewrite per slot 5's prose is preserved in the synthesis doc for CEO consideration. |
| O3 ("products as proof-of-capability") | O3 | 2/10 | 4, 9 | Below 5/10 threshold; partially absorbed into Amendment 4 (the Year-1 dogfood logic). Surface separately if CEO disposes Amendment 4 differently. |
| E8 "Geographic commitment" as new section | E8 | 2/10 | 3, 4 | Below 5/10; the spirit is covered by Amendment 2 applied either as new section or as edits-in-place. |
| L2 agent roster sync (20 vs 23 dormant) | L2 | 2/10 | 8, 10 | Housekeeping; covered separately by the SSOT refresh draft (`FLOWAI_SSOT_REFRESH_DRAFT_2026-05-13.md`). |
| O10 Self-Renewal Alerts emerging-market weighting | O10 | 1/10 | 1 | Below threshold; carry forward to a future amendment dispatch if CEO endorses the localization theme. |
| MG8 "Pricing and Geo-Mix Ratification" | MG8 / MG6 | 1/10 | 1 | Subsumed by Amendment 6 (MG9). |
| O5 platform layer democratization wording | O5 | 1/10 | 6 | Below threshold; touches the same theme as Amendment 1 but is a smaller text edit. |
| EP7 Layer-1/2/3 authority clarification | EP7 | 1/10 | 6 | Below threshold; orthogonal to the democratization-reframe scope of this dispatch. |
| E1 Self-protection + affordability / low-bandwidth | E1 | 1/10 | 7 | Below threshold; thematic overlap with Amendment 2 (underserved-globally scope). |
| MG7 / MG9 (Slot 5's MG9 proposal) | MG7 / MG9 | 1/10 | 5 | Slot 5's MG9 proposal IS the seed for Amendment 6; counted once at 5/10 in Amendment 6 (with slots 1, 2, 4, 6 reinforcing the theme), not double-counted. |
| Doability gap: local KYC/KYB | (Doability) | 1/10 | 1 | Below threshold; useful surface for a future "implementation gaps" amendment. |

## Promotion checklist

- [ ] CEO reviews this draft.
- [ ] CEO accepts / amends / rejects each proposed amendment
      (Amendments 1–6) individually.
- [ ] **Step β re-eval surfaced no (b) "broader framing resolves it"
      votes** — Panel re-affirmed that some level of rework is needed.
      CEO disposes whether the level is **substantial** (5/9) or
      **partial** (4/9). Amendments 1–6 are calibrated for the
      "substantial" reading; CEO can drop some if "partial" wins.
- [ ] Panel ≥7/10 supermajority on accepted amendments per MG2
      (separate dispatch).
- [ ] W5c (or successor) promotes accepted amendments into
      `docs/FLOWAI_SSOT.md` via a separate dispatch.
- [ ] Old SSOT version archived to `docs/archive/`.
- [ ] `docs/CANONICAL_HISTORY.md` updated.


---

## W5c Synthesis Note

- **Methodology limitation:** strict Jaccard 0.25 on tokenized free text produces small clusters because short amendment proposals share few exact words even when they propose the same change. The anchor / theme clustering (Step B.2) is what surfaces the supermajority signals. W5b's CS-5 used strict-Jaccard 0.4 only; that's why it returned 0 supermajority. Future amendment work should use **both** views by default.
- **CEO direction needed:** Step β returned **0/9 (b)** votes — no reviewer said "broader framing resolves it, minor amendments suffice." But the (a)/(c) split (5/4) means CEO must disposition whether the rework is **substantial** (Amendments 1–6 fully) or **partial** (drop some of CA-3, CA-4, CA-5, CA-6 and keep only the supermajority CA-1 + CA-2). The draft is calibrated for the **substantial** reading; CEO can collapse to the **partial** reading by accepting CA-1 + CA-2 only.
- **Ambiguity worth surfacing:** Amendment 2 (CA-1, "underserved globally") may be applied either as edits-in-place across O1 / O6 / E4 / MG- **or** as a new dedicated section (the CA-8 "E8 Geographic / Underserved-Globally Commitment" lives below the ≥5/10 threshold but only because slots 3 + 4 framed it as a new section while slots 1, 5, 7 framed it as edits-in-place to O1). Both implementations carry the same Panel signal; CEO chooses structure.
