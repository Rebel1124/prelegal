import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse

from app.auth import (
    AuthResponse,
    CurrentUser,
    LoginRequest,
    SignupRequest,
    get_current_user,
    run_login,
    run_signup,
)
from app.db import get_db, init_db
from app.document_chat import DocumentChatRequest, DocumentChatResponse, run_chat_turn
from app.document_suggest import SuggestionRequest, SuggestionResponse, run_suggestion
from app.documents_store import (
    SavedDocumentDetail,
    SavedDocumentSummary,
    get_document_for_user,
    list_documents_for_user,
)

STATIC_DIR = Path(os.environ.get("STATIC_DIR", "static"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/signup")
def signup(request: SignupRequest, db: sqlite3.Connection = Depends(get_db)) -> AuthResponse:
    return run_signup(db, request)


@app.post("/api/auth/login")
def login(request: LoginRequest, db: sqlite3.Connection = Depends(get_db)) -> AuthResponse:
    return run_login(db, request)


@app.post("/api/documents/{slug}/chat")
def document_chat(
    slug: str,
    request: DocumentChatRequest,
    db: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> DocumentChatResponse:
    return run_chat_turn(db, user.id, slug, request)


@app.post("/api/documents/suggest")
def documents_suggest(request: SuggestionRequest) -> SuggestionResponse:
    return run_suggestion(request)


@app.get("/api/documents/mine")
def documents_mine(
    db: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[SavedDocumentSummary]:
    return list_documents_for_user(db, user.id)


@app.get("/api/documents/{document_id}")
def document_detail(
    document_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SavedDocumentDetail:
    return get_document_for_user(db, document_id, user.id)


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
