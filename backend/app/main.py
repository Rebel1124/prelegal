import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from app.db import init_db
from app.document_chat import DocumentChatRequest, DocumentChatResponse, run_chat_turn
from app.document_suggest import SuggestionRequest, SuggestionResponse, run_suggestion

STATIC_DIR = Path(os.environ.get("STATIC_DIR", "static"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/documents/{slug}/chat")
def document_chat(slug: str, request: DocumentChatRequest) -> DocumentChatResponse:
    return run_chat_turn(slug, request)


@app.post("/api/documents/suggest")
def documents_suggest(request: SuggestionRequest) -> SuggestionResponse:
    return run_suggestion(request)


if STATIC_DIR.is_dir():
    RESOLVED_STATIC_DIR = STATIC_DIR.resolve()

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str) -> FileResponse:
        """Serve the static Next.js export, matching its `<route>.html` file naming."""
        relative_path = full_path or "index.html"
        for candidate in (STATIC_DIR / relative_path, STATIC_DIR / f"{relative_path}.html"):
            resolved = candidate.resolve()
            if resolved.is_relative_to(RESOLVED_STATIC_DIR) and resolved.is_file():
                return FileResponse(resolved)
        raise HTTPException(status_code=404)
