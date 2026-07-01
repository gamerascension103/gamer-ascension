# CLAUDE.md — Gamer Ascension

Durable working rules and project canon for Claude Code on the Gamer Ascension repository. Read at session start. Apply throughout every task.

Adapted from `.windsurfrules` (the Cascade/Windsurf ruleset). Where the two ever disagree, treat this file as the Claude Code source of truth and flag the drift.

---

## PROJECT AT A GLANCE

Gamer Ascension is a static site (HTML/CSS/JS, no build step) hosted on GitHub Pages at **ascension-1.live**. There is a `CNAME` and a minimal `package.json` — the site is served as static files; pushes to `main` deploy automatically (allow 2-5 minutes plus CDN cache).

The operator is **Jake Salisbury**. He reviews work through **browser perception checks**, not by reading code. Reports are read by both the chat (which verifies them) and the operator (who acts on them). Make them precise.

### Strategic hierarchy (LOAD-BEARING)

**Coaching → Evermark → gamification**

- **Coaching is the product.** What customers buy.
- **Evermark University is the platform.** Where the educational content lives.
- **Gamification is the engagement layer.** How learning gets delivered, not what is sold.

These are not interchangeable. Do not blur them: Evermark is the place, not the price ("tuition"); gamification is delivery, not product; coaching is served by Evermark, not housed inside it. If a task risks blurring the hierarchy, surface the concern before writing.

---

## REPOSITORY MAP

Single HTML file per chamber/page (see Architecture below):

- `index.html` — landing page
- `atheneum.html` — the core gamified experience (~585KB, largest and most active file)
- `threshold.html` — threshold / event-horizon experience (gargantua black-hole renderer)
- `pregame.html` — legacy testbed (camelCase IDs preserved; source of module architecture)
- `scriptorium.html` — Scriptorium chamber
- `coaching.html` — coaching page
- `evermark.html` — Evermark routing page
- `arcanium.html`, `agora.html` — not yet built

Scripts: `aurelius.js`, `guide.js`, `nav.js`, `assets/js/atlas.js`, `assets/js/dev_tools.js`

Assets: `assets/chambers/*`, `assets/space/*`, plus root-level `.jpg`/`.png` photos.

---

## WORKFLOW: THE TASK / BRIEF IS THE UNIT OF WORK

Tasks often arrive as **briefs** with structure: header, target files/scope/why, Phase 0 pre-flight, phased execution, per-phase verification, final report, explicit out-of-scope list, build-log entry.

Follow the brief. Do not improvise scope. Do not skip phases. Do not auto-continue past a halt criterion.

### Phase 0 pre-flight — mandatory

Before touching any code:
1. Read every file the brief names.
2. Verify the brief's assumptions (function names exist, line ranges match, state shapes are as described).
3. Surface any design decision the brief didn't anticipate.
4. Capture baseline state (relevant `localStorage` values; screenshot of current visual state if applicable).
5. Report findings.

**HALT after Phase 0** if a design decision needs operator judgment, a brief assumption is wrong, or scope is ambiguous. **PROCEED** only when all assumptions verify, no design questions surface, and baseline is captured. Skipping Phase 0 to "save time" costs 10x downstream.

---

## SELF-VERIFICATION RULES

Before reporting any phase complete, verify ALL of these:

**Always**
- File parses without errors
- Browser loads the target page without console errors (actually load it and check)
- `localStorage` keys land correctly when state changes
- No files touched outside the brief's named scope

**For code changes**
- Run any script that should produce output; compare runtime output to expectation
- Screenshot the visual state when animations or layouts change
- Capture console output

**For state changes**
- Read specific `localStorage` values post-change
- Verify `ga_*` namespace integrity
- Cross-chamber state references unbroken

**For voice/copy changes**
- Voice canon scan: no banned words (see Voice Canon)
- No em dashes in any rendered copy
- Reserved capitalized terms preserved
- Length caps respected if specified

**Halt and report (do not auto-continue) when:** any file fails to parse; browser shows console errors; `localStorage` corrupted; a design decision needs operator judgment; an edit touches more files than specified; voice canon scan flags banned phrasing; a screenshot doesn't match the intended outcome.

### "Shipped" requires execution artifacts

`File parses` is NOT `the browser rendered it correctly`. `Tests pass` is NOT `the feature works`. Before claiming shipped: run the actual code or load the actual page, capture artifacts (screenshot, console output, state values), and verify runtime behavior matches intent.

If you cannot run it in this environment, say so explicitly: "Code matches the brief's specification. I cannot run it against live state because [reason]. Operator verification required at Layer 3 before this is shipped." Halted honestly beats shipped broken.

---

## REPORTING FORMAT

```
## Verification report

**Phase X status:** complete / halted / blocked

**Files touched:**
- path/to/file.html (lines X-Y)
- path/to/other.js (function name)

**Verification:**
- File parses: ✓ / ✗
- Browser loads: ✓ / ✗
- Console clean: ✓ / ✗ (errors: [...])
- localStorage check: [specific keys, values verified]
- Voice canon scan: ✓ / FLAGGED [banned phrases]
- Visual screenshot: [attached or described]
- Execution artifact: [what happened when this ran]

**Flags for operator review:**
- [design questions / ambiguous results / scope decisions made]

**Build log entry:**
brief_name | one-sentence summary of what shipped
```

If you halted: explain WHY, what specifically needs operator judgment, and your recommendation (if any).

---

## SCOPE DISCIPLINE

- **One change per brief (default).** Do not "fix something while I'm in there."
- **One lesson per integration (the Module 1 scar).** Curriculum lesson integrations into `atheneum.html` are strictly one lesson per brief and one commit per lesson. Never batch multiple lessons into a single integration pass, however efficient it looks. This rule was learned from the Module 1 → Training integration regression; batching cost more than it ever saved.
- **Stay in named files.** If you find a related issue elsewhere, surface it as a flag; do not silently fix it.
- **Find-replace blast radius.** The chamber files are large; find-replace mistakes have a big blast radius. Match exact strings, use line ranges, and verify edits landed in the intended location, not in similar-looking strings elsewhere.
- **No silent splitting.** Single-file-per-chamber is the locked choice. Do not propose splitting `atheneum.html` or any chamber file into modules without being explicitly asked.

### Halt-on-design-surprise

If you hit a decision the brief did not anticipate, HALT. Do not guess, do not silently commit, do not pick "the obvious option." Stop work, report what you discovered, state what decision is needed, give a recommendation with reasoning if you have one, and wait.

---

## VOICE CANON

Gamer Ascension uses the **manuscript-celestial register**: reverent, mythic, precise. Never tech-bro. Never casual. Never exclamatory.

### Typography lock
- Cinzel / Cinzel Decorative — headings
- Crimson Pro — body and invitation copy
- Tangerine — Atlas annotations

These do not get swapped without explicit operator decision.

### Banned words (all rendered customer-facing copy)

| Banned | Reason |
|---|---|
| actually, honestly, truly, genuinely, really (intensifier) | emphasis-by-contrast hedges |
| essentially, basically | filler |
| of course, It is worth noting, Notably, Importantly | self-validating transitions |
| obviously | condescending |
| em dashes (—) | break reverent flow |
| exclamation marks | break reverent register |
| Awesome! / Great! / Amazing! | motivational, wrong register |
| Sup / Yo / Hey / What's up | casual, wrong register |
| scaling, leverage, synergy, stack | tech-bro lexicon |

If you reach for a banned word, rewrite the sentence — do not swap in a synonym.

### Em dashes are banned anywhere in copy
For ranges use "X to Y" or "between X and Y." For asides, use two sentences.

### Iridescent violet vocabulary is RESERVED
"Iridescent," "iridescence," and similar violet/peacock vocabulary are reserved for substance moments only (rank-up ceremonies, Pool-pour climaxes, Anchored apotheosis). Do not use them in incidental UI text.

### Voice canon scan
Before reporting copy work complete, scan output for: banned words, em dashes, exclamation marks, motivational language, tech-bro lexicon, iridescent vocabulary in non-substance contexts, and reserved terms lowercased/renamed. Fix before reporting.

---

## RESERVED CAPITALIZED TERMS

These stay capitalized in copy, code comments, rendered text, and reports. Drift is a voice canon violation.

**Concepts:** Path, Vantage, Gap, Engine, Interpreter, Capacity, Vitality, Spirit, Alignment, Essence, Pool, Thread

**Chambers:** Atheneum, Scriptorium, Arcanium, Agora, Reliquary, Codex

**Ranks:** Anchored, Imbued, Radiant, Sovereign

---

## ARCHITECTURE (LOAD-BEARING)

Single HTML file per chamber. This is the choice, not a problem. Do not propose splitting any chamber file into modules unless explicitly asked.

Implications: find-replace mistakes have a large blast radius (match exact strings, use line ranges, verify the landing location); large-file operations require careful scope discipline.

### ID naming conventions
- **Atheneum and newer chambers:** kebab-case DOM IDs (`module-vessel`, `micro-tree-panel`, `pool-dock`)
- **Pregame (legacy testbed):** camelCase IDs preserved (`moduleVessel`, `microTreePanel`)
- **Porting pregame → atheneum:** translate every ID and function reference from camelCase to kebab-case (DOM) or atheneum-native naming (functions)
- If you encounter mixed casing in one file, flag it — do not auto-correct without instruction.

---

## STATE NAMESPACE

Persistent state lives in `localStorage` with the `ga_*` prefix:

- `atheneum.userState.v1` — the primary Atheneum state object (currentPageIndex, completedSkills, totalEssence, currentRank, unlockedThroughPage, anchoredCeremonyFired). The load-bearing key; most other keys orbit it. No `ga_` prefix; predates the convention.
- `ga_essence` — Pool's current essence total
- `ga_module_{id}_stage` — module stage progression
- `ga_retrieval_{id}` / `ga_retrieval_{id}_submitted` / `ga_retrieval_{id}_skipped` — retrieval text and submission records
- `ga_subunit_{id}_complete` — sub-unit completion flags
- `ga_module_imbuement_{id}` — module imbuement saturation
- `ga_journey_v1` — welcome/journey flag (canonical first-visit state)
- `realms_unlocked` — post-Anchored Atlas access flag (NO `ga_` prefix, legacy reason)
- `ga_scriptorium_unsealed` — Scriptorium open state
- Plus others; check existing keys before adding new ones.

When adding state: use `ga_*` unless documented otherwise, surface the new key in your report, and route cross-chamber state through Architecture & Decisions review before adding.

---

## DEV CONTROLS (ATHENEUM)

Available at `window.atheneum.*` in the browser console. Use these for verification rather than hand-manipulating state:

- `devUnlockAll` — unlock all modules
- `devCompletePage` — complete current sub-unit
- `devTriggerBronze` — re-fire Anchored ceremony
- `devSimulateDive` — run the dive sequence
- `devReplayWelcome` — replay welcome moment
- `devClearVideo` — clear CTA video state
- `devReset` — clear state and reload
- `devCompleteAllRetrievals` — fast-forward retrievals
- `userState()` — dump current state
- `CONSTELLATIONS()` — surface constellation data

There is also `?glimpse=1` on `atheneum.html` — a stateless anchored-Foundation showcase (in-memory state, no `localStorage` writes).

---

## CEREMONY TIMING (LOAD-BEARING)

Do not adjust without operator direction. If a brief asks for changes, it must specify exact new timings; if it doesn't, halt and ask.

### Pool pour ceremony (post-module-completion)
- t=600ms: vessel tip begins
- t=1000ms: Pool catches
- t=1700ms: Pool numerics refresh
- t=3000ms: conduit ceremony fires

### Anchored apotheosis
- 1100ms total breath + flash (tightened from the original 5600ms)

### Atlas in-place reveal
- 9-second sequence with Scriptorium unseal moment; genie-suction at end conjures the Atlas trigger button at top-left

### Anti-patterns (learned from prior briefs)
- Do not call `awardEssence` when the Pool update must fire later than t=0 (breaks ceremony pacing).
- Do not assume pregame function names exist in atheneum (different inventories/conventions; verify first).
- Do not use `innerHTML` assignment on elements with active animations (wipes animation state mid-frame; use append/replaceChild).
- Do not silently expand scope to "fix something while I'm in there."
- Do not report "shipped" when only parsing/compilation was verified.
- Do not pick names for new mechanics, chambers, or concepts — naming is an operator decision.

---

## ASSET DECISIONS (LOCKED)

Do not change without explicit operator decision:
- Cream paper substrate is final on the Atlas.
- DALL-E asset pipeline is canonical for chamber/cosmic/star imagery.
- Comet stays static on the Atlas (does not animate).
- Stars are warm-gold luminous PNG orbs (not SVG, not CSS gradients).
- Chamber-to-chamber lines were deleted; replaced with Maker's annotations (Tangerine, per-character stagger, collision avoidance).

---

## CACHE & RELOAD DISCIPLINE

When verifying in browser: hard reload (Ctrl+Shift+R / Cmd+Shift+R) to bypass browser cache; confirm new code is actually running (console log, element existence, class names); if state seems stale, clear `localStorage` and reload, preferring `devReset` over hand-clearing.

For GitHub Pages (production): pushes to `main` deploy automatically but take a few minutes plus CDN cache. Hard reload bypasses browser cache but not CDN; use incognito/another browser to test fresh; wait 2-5 minutes after push; check deployed contents via `view-source:` if behavior seems stale.

---

## GIT & BRANCH DISCIPLINE

- Commit or push only when the operator asks.
- Develop on the designated feature branch; create it locally if needed; never push to a different branch without explicit permission.
- This environment is ephemeral — unpushed work is lost when the session ends. Surface that tradeoff when work is kept local.

### Build log (append-only)
Every shipped brief appends one line:
```
brief_name | one-sentence summary of what shipped
```
The build log is the durable record of what landed when. Append-only; do not edit prior entries.

---

## HONEST LIMITATIONS

If you cannot complete a task as specified, say so explicitly. Do not partially complete and report shipped. Do not work around a constraint silently. Halted honestly beats shipped broken.
