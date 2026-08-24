# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 11 document types, each filled in via an AI chat, with no real authentication and no document persistence yet. See Implementation status below.

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

**Not yet built**: real authentication (signup/signin, password hashing), document persistence.

## Current state (quick reference)

- **Routes**: `/` (fake login, redirects to `/documents`) → `/documents` (catalog picker + "describe what you need" box) → `/documents/[slug]` (chat + live preview + PDF download), one per document type in `catalog.json`.
- **Backend API**: `GET /api/health`, `POST /api/documents/{slug}/chat`, `POST /api/documents/suggest`.
- **Supported documents**: all 11 in `catalog.json` — each backed by a `templates/<slug>.md` template and a `document-types/<slug>.json` schema (party roles + fields).
- **Auth**: client-side-only fake gate (any non-empty email/password, `localStorage` session) — not real auth. The `users` SQLite table exists but nothing reads or writes it yet.
- **Persistence**: none — no drafts, sessions, or documents are saved; every chat is stateless (full history/fields resent each turn).
- **Tests**: `backend/tests` (`pytest`) and `frontend/src/**/*.test.ts(x)` (Vitest + RTL), including a parametrized check that every document type's real template parses/fills cleanly against its schema.
