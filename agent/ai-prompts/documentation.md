# AI Prompt — Documentation

> Use when asking an AI agent to **write or update documentation** for this repo. Docs follow the structure in `/docs/` and `/agent-rules.md`.

---

## 1. Documentation map (current)

| Doc | Purpose | Audience |
|---|---|---|
| [README.md](../README.md) | Setup + commands quick reference | New contributors |
| [agent-rules.md](../agent-rules.md) | Operating contract for AI agents | LLMs |
| [docs/architecture.md](../docs/architecture.md) | System design + data flow | All engineers |
| [docs/coding-standards.md](../docs/coding-standards.md) | Style + naming + patterns | All engineers |
| [docs/api-patterns.md](../docs/api-patterns.md) | Route handler conventions | Backend / API authors |
| [docs/prd.md](../docs/prd.md) | Product requirements + user stories | Product, QA, eng |
| [docs/domain.md](../docs/domain.md) | Glossary + entity model + lifecycles | All engineers |
| [docs/tech-debt.md](../docs/tech-debt.md) | Known gaps + decision log | All engineers |
| [docs/testing-strategy.md](../docs/testing-strategy.md) | Test plan + framework choice | Engineers writing tests |
| [docs/environment.md](../docs/environment.md) | Env vars + setup + secrets | Anyone deploying |
| `ai-prompts/*.md` | Prompt templates for LLM workflows | Anyone using AI agents |

---

## 2. Universal documentation prompt

```text
Update / write documentation for {{topic}} in Voyra Tour Bali.

Goal: {{what the reader should be able to do after reading}}.

Audience: {{who reads this — junior dev, ops, product, AI agent}}.

Constraints:
- Match the tone, structure, and density of the other files in /docs/.
- Be specific. Use real file paths and real line numbers.
- Show, don't tell — include short code samples for non-obvious behaviour.
- No filler. Every sentence earns its place. If a section adds nothing, delete it.
- Cross-link to other docs with relative markdown links: `[architecture](./architecture.md)`.
- If documenting code, **read the code first**. Do not paraphrase from memory.
- If facts changed (env var renamed, endpoint moved, behaviour shifted), update every doc that mentions them. Search before editing.

Process:
1. Identify which doc(s) are affected.
2. For each affected doc: read it end-to-end.
3. Plan the diff in your reply (1 sentence per section change) before writing.
4. Apply edits.
5. Verify cross-references still resolve.

Reply format:
- Files changed (with the section header that changed)
- One-line summary per change
- Cross-doc updates checked (yes / list of other files updated)
```

---

## 3. Style rules for docs in this repo

- **Markdown**, GitHub-flavored.
- **Top of file**: H1 title + one-line italic blockquote stating the doc's purpose.
- **Section depth**: H2 for top sections, H3 for subsections, H4 sparingly. Don't go past H4.
- **Tables** for matrices (env vars, routes, transitions). Lists for narrative.
- **Code fences** with language tag (```ts, ```bash, ```sql, ```json).
- **File references** as relative markdown links: `[file](../path/to/file.ts)`. Add line range when useful: `[file:42-60](../path/to/file.ts#L42-L60)`.
- **Severity / priority** tags: 🔴 high, 🟠 medium, 🟡 low (used in tech-debt and review).
- **No emojis as decoration.** Used only as semantic markers.
- **Short sentences.** No "Just", "Simply", "Basically", "Actually".
- **Active voice.** "Validate the signature" — not "The signature is validated".
- **Don't restate the code.** Document the *why*, the *invariants*, and the *contract*.
- **Date stamps**: avoid them in docs (they go stale). Use git history for dates.

---

## 4. Specialised templates

### 4.1 Document a new feature in PRD

```text
Add the new feature {{name}} to /docs/prd.md.

Steps:
1. Decide which section it belongs in (§3 modules — catalog, auth, booking, viator, dashboard, newsletter, AI chat). Add a new subsection if no existing one fits.
2. Add a Story → Acceptance row in the relevant table.
3. If the feature introduces a new persona, update §2.
4. If the feature touches the booking lifecycle, also update /docs/domain.md §4.
5. If out-of-scope items shifted, update §6.

Keep entries terse — one row per story.
```

### 4.2 Document a new entity in the domain doc

```text
Add entity `{{Entity}}` to /docs/domain.md.

Steps:
1. Add a glossary entry in §1.
2. Update the ER diagram in §2 (ASCII).
3. Add a §3.X subsection with: field table, invariants list.
4. If it participates in a state machine, add a section after §4.
5. Cross-link from /docs/architecture.md §3 (Module Layout) and /docs/prd.md.

Mirror the structure of the existing entity sections (Category, Destination).
```

### 4.3 Document a new API endpoint

```text
Add endpoint `{{METHOD}} /api/{{path}}` to /docs/api-patterns.md.

Steps:
1. If it follows an existing pattern, just add it under §13 Worked Examples with a short request/response block.
2. If it introduces a new pattern (new auth model, new response shape), add a new top-level section explaining the pattern, then add the example.
3. If status code semantics change, update §4.
4. If the route has security implications (signature verification, idempotency, etc.), add a one-liner under §6 or §11.
```

### 4.4 Document a new env var

```text
Add env var `{{NAME}}` to /docs/environment.md.

Steps:
1. Add a row to the appropriate subsection in §3 (or create a new one).
2. Add to the copy-paste template in §4.
3. Add to the "where it's read" map in §9.
4. If it appears in client code (`NEXT_PUBLIC_*`), confirm and note that.
5. Add to Vercel dashboard for all environments (mention this in your reply — not in the doc).
```

### 4.5 Document tech debt

```text
Add a tech-debt item to /docs/tech-debt.md.

Steps:
1. Pick the right section (§1 data integrity, §2 type safety, §3 duplication, …) or open a new one if needed.
2. Format:
   ### {{severity emoji}} N.M Title
   **Where:** [file](../path)
   **Symptom:** what users / engineers see.
   **Fix:** the concrete remediation.
3. Severity:
   - 🔴 risk of data / money loss / security
   - 🟠 slows iteration, raises bug rate
   - 🟡 cosmetic
4. If it's a deliberate decision NOT to fix, add it to §15 Decision log instead.
```

### 4.6 Update agent-rules

```text
Update /agent-rules.md to add the rule: {{rule}}.

Steps:
1. Decide: is it a "do" (§3) or a "don't" (§4)?
2. If it adds a risk-tier confirmation requirement, also add it to §5.
3. If it changes Definition of Done, also update §6.
4. Keep each rule one line.
5. Justify ONLY when justification helps a future LLM avoid edge cases — otherwise leave the rule terse.
```

### 4.7 Inline JSDoc / code comments

```text
Add JSDoc comments to {{file}} for the public exports.

Constraints (per /docs/coding-standards.md §12):
- DO comment WHY when the why is non-obvious — workarounds, invariants, security notes, business rules.
- DO NOT restate WHAT the code does. Names should explain that.
- One short paragraph per export, not a full essay.
- For services that touch external systems, mention the failure semantics ("throws on Viator 5xx", "swallows email errors and returns ok").

Do NOT add per-line comments. Do NOT add `@param` blocks unless the parameter has a non-obvious meaning.
```

---

## 5. README updates

Keep the [README](../README.md) as the **command + setup quick reference**. Don't duplicate architecture, env, or domain content there — link to `/docs/`.

When updating README:
- Keep the command tables intact.
- Keep "Stale Prisma Cache" workaround until the underlying issue is resolved.
- Update the "Project Structure" tree only when top-level layout changes.
- New env vars: add to README **only** as a stub, with a link to [docs/environment.md](../docs/environment.md) for the canonical list.

---

## 6. Things to avoid

❌ Generated essays. The reader will skim — make every line scannable.
❌ "This document explains…" intros. The H1 + blockquote already does that.
❌ Aspirational claims ("the system is highly scalable"). Stick to facts.
❌ Conflicting facts across docs. Search before adding; update everywhere.
❌ Auto-generated API tables that go stale. Document the **pattern**, not every endpoint.
❌ Tutorials. The repo isn't a learning resource — it's a working codebase. Link to upstream docs (Next, Prisma, NextAuth) instead of restating them.
❌ ASCII art for its own sake. Diagrams only when they add information that prose doesn't.
❌ Overly defensive tone ("warning: you might want to consider…"). Just say what to do.

---

## 7. Reply format

```
## Docs updated: 3

- /docs/api-patterns.md §13 — added `POST /api/promotions/apply` example
- /docs/environment.md §3.13 — added `PROMO_ENGINE_URL`
- /docs/environment.md §4 — added env var to template
- /agent-rules.md — no change needed

Cross-references checked:
- README.md — no mention of promotions; nothing to update
- /docs/prd.md §3.6 — promotions roadmap hook already covers this; no change

No content invented; all facts pulled from `app/api/promotions/apply/route.ts` and `lib/services/promotionService.ts`.
```

---

## 8. When the agent should refuse

The agent should push back (not silently produce output) when:

- The user asks for documentation of code that doesn't exist yet — write the code first, doc after.
- The user asks for "comprehensive marketing copy" or "blog post" — out of scope; this is engineering documentation.
- The user asks the agent to invent facts because "it should work that way" — the docs describe what *is*, not what *might be*. Implement first, then document.
