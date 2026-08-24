# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 11 document types, each filled in via an AI chat, with real authentication and per-user document persistence. See Implementation status below.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically built (`next build` with `output: "export"`) and served via FastAPI.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

**PL-3 — Mutual NDA creator prototype**: client-side-only Next.js form at (originally) `/` for the Mutual NDA document type — fills in party/term details, live preview, PDF download. No backend, no AI, no persistence.

**PL-4 — V1 technical foundation**: added `backend/` (FastAPI, uv project) which serves the statically exported frontend and exposes `GET /api/health`. SQLite is deleted and recreated with an empty `users` table on every backend startup (schema only — nothing writes to it yet). The NDA creator moved to `/nda`, gated behind a fake, client-side-only login at `/` (any non-empty email/password is accepted, no backend call, session tracked via `localStorage`) — a placeholder ahead of real auth. Added `Dockerfile` + `docker-compose.yml` (multi-stage: `next build` static export → uv/Python image running uvicorn) and `scripts/start-{mac,linux}.sh` / `stop-{mac,linux}.sh` / `.ps1` equivalents.

**PL-5 — AI chat for Mutual NDA**: replaced the manual NDA form with a freeform AI chat at `/nda`. New `POST /api/nda/chat` endpoint (`backend/app/nda_chat.py`) uses LiteLLM structured outputs via Cerebras/OpenRouter to extract NDA field values from the conversation and return them each turn; the endpoint is stateless (frontend resends message history + current fields). Live preview and PDF download are unchanged; a collapsible manual-edit panel remains as a fallback, disabled while a chat reply is in flight. `docker-compose.yml` now passes `.env` (`env_file`) into the container so `OPENROUTER_API_KEY` reaches the backend. Added the project's first test suites: `pytest`/`httpx` for the backend, Vitest + React Testing Library for the frontend.

**PL-6 — Expand to all 11 document types**: generalized the single-document NDA chat into a data-driven pipeline covering every template in `templates/`. Each document type is described by a small JSON schema at `document-types/<slug>.json` (party roles + field list, keyed by the field/party labels used in that template) — read directly by both the backend and the frontend at startup/build time, alongside `catalog.json` for name/description, so there's one source of truth instead of hand-duplicated Python/TypeScript schemas per document.
- **Backend**: `nda_chat.py` was replaced by `document_types.py` (loads/merges `catalog.json` + `document-types/*.json` into `DOCUMENT_TYPES`), `document_chat.py` (builds a per-slug Pydantic model at runtime via `pydantic.create_model` for structured-output extraction, and a generic system prompt parameterized by that document's fields/parties), and `document_suggest.py` (a "describe what you need" endpoint that asks the LLM to pick the closest catalog match, or explain that nothing fits). Routes: `POST /api/documents/{slug}/chat`, `POST /api/documents/suggest`.
- **Frontend**: the Standard Terms markdown parser (`lib/standard-terms.ts`) was extended to handle nested numbering (digits/letters/roman numerals via indentation depth), `header_2`/`header_3` heading spans, and variable spans nested inside bold clauses (e.g. liability caps); it resolves each `*_link` span against a document's config to distinguish a fillable field from a literal party-role reference (e.g. "Customer"/"Provider" render as-is, never substituted). `nda-form.ts`, `nda-workspace.tsx`, `cover-page-view.tsx`, `nda-fields-panel.tsx`, `nda-chat.tsx`, and the PDF renderer are now generic (`document-types.ts`, `document-workspace.tsx`, etc.), driven by a document's config rather than hardcoded NDA fields.
- **Routing**: `/nda` was replaced by a catalog picker at `/documents` (11 cards from `catalog.json`, plus a free-text "describe what you need" box wired to the suggest endpoint) and a static per-document route at `/documents/[slug]` (`generateStaticParams` pre-renders all 11 at build time).
- **Docker**: `Dockerfile` now copies `catalog.json`, `templates/`, and `document-types/` into both build stages (previously only `templates/mutual-nda.md` was manually duplicated into `frontend/src/content/`, which this removes).
- A parametrized test (backend and frontend) parses and fills every real template against its config with empty data to catch schema/template drift (e.g. a template using a plural span label where the config expected the singular) as a test failure rather than a runtime crash.

**PL-7 — Support multiple users & final polish**: replaced the fake login with real signup/signin, added per-user document persistence with resume, and a visual polish pass across every screen.
- **Backend**: new `auth.py` (bcrypt password hashing, opaque `secrets.token_urlsafe` bearer-token sessions stored in a new `sessions` table, `get_current_user` dependency) and `documents_store.py` (list/get/upsert saved documents, scoped per user). `db.py` gained `sessions` and `documents` tables and a per-request `get_db()` connection dependency. `POST /api/documents/{slug}/chat` now requires auth and upserts a `documents` row on every turn (a document is created on the first message of a fresh chat, and updated on every subsequent turn — including a slug check so a `documentId` can't be replayed against a different document type). New routes: `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/documents/mine`, `GET /api/documents/{document_id}`.
- **Chat fix**: `document_chat.py` now computes the actual missing required/optional fields in code each turn (`compute_missing_fields`) and injects that concrete list into the system prompt with an explicit instruction, so the assistant asks a follow-up only when fields are genuinely still missing, instead of relying on the model to self-track from conversation history.
- **Frontend**: `lib/auth.ts` rewritten around a real bearer-token session (`localStorage`, key `prelegal_session`) with an `authFetch` wrapper (adds the token, signs the user out and redirects to `/` on a 401). `/` is now a single sign-in/sign-up toggle form. A new `/documents/mine` page lists a user's saved documents; opening one resumes the AI chat with its prior messages and field values loaded (via a `?documentId=` query param read once on mount, so a background chat reply's own URL update doesn't cause a stale refetch). `RequireAuth` now renders a shared header/nav (Documents / My Documents / email / Log out) used on every authenticated screen.
- **Polish**: brand colors added as Tailwind v4 `@theme` tokens (`--color-accent-yellow`, `--color-brand-blue`, `--color-brand-purple`, `--color-brand-navy`, `--color-brand-gray`) and applied consistently in place of ad hoc hex values; a persistent "this is a draft, not legal advice" disclaimer appears in the document workspace and on the generated PDF.

## Current state (quick reference)

- **Routes**: `/` (sign in / sign up, redirects to `/documents`) → `/documents` (catalog picker + "describe what you need" box) → `/documents/[slug]` (chat + live preview + PDF download, resumable via `?documentId=`) → `/documents/mine` (a user's saved documents).
- **Backend API**: `GET /api/health`, `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/documents/{slug}/chat` (auth required), `POST /api/documents/suggest`, `GET /api/documents/mine` (auth required), `GET /api/documents/{document_id}` (auth required).
- **Supported documents**: all 11 in `catalog.json` — each backed by a `templates/<slug>.md` template and a `document-types/<slug>.json` schema (party roles + fields).
- **Auth**: real signup/signin — bcrypt-hashed passwords, opaque bearer-token sessions in a `sessions` table. Still reset from scratch on every backend startup, per the project's SQLite design (no persistence across restarts).
- **Persistence**: a `documents` row is created on a chat's first turn and upserted every turn thereafter, scoped to the signed-in user; a user can have multiple saved documents of the same type.
- **Tests**: `backend/tests` (`pytest`) and `frontend/src/**/*.test.ts(x)` (Vitest + RTL), including a parametrized check that every document type's real template parses/fills cleanly against its schema.
