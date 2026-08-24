import json
import sqlite3

from fastapi import HTTPException

from app.document_types import get_document_type
from app.schemas import CamelModel


class SavedDocumentSummary(CamelModel):
    id: int
    slug: str
    name: str
    created_at: str
    updated_at: str


class SavedDocumentDetail(SavedDocumentSummary):
    fields: dict
    messages: list[dict]


def list_documents_for_user(db: sqlite3.Connection, user_id: int) -> list[SavedDocumentSummary]:
    rows = db.execute(
        "SELECT id, slug, created_at, updated_at FROM documents "
        "WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,),
    ).fetchall()
    return [
        SavedDocumentSummary(
            id=row["id"],
            slug=row["slug"],
            name=get_document_type(row["slug"]).name,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def get_document_for_user(db: sqlite3.Connection, document_id: int, user_id: int) -> SavedDocumentDetail:
    row = db.execute(
        "SELECT id, slug, fields, messages, created_at, updated_at FROM documents "
        "WHERE id = ? AND user_id = ?",
        (document_id, user_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return SavedDocumentDetail(
        id=row["id"],
        slug=row["slug"],
        name=get_document_type(row["slug"]).name,
        fields=json.loads(row["fields"]),
        messages=json.loads(row["messages"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def upsert_document(
    db: sqlite3.Connection,
    user_id: int,
    slug: str,
    document_id: int | None,
    fields: dict,
    messages: list[dict],
) -> int:
    """Create a new saved document, or update an existing one owned by this user."""
    fields_json = json.dumps(fields)
    messages_json = json.dumps(messages)

    if document_id is not None:
        cursor = db.execute(
            "UPDATE documents SET fields = ?, messages = ?, updated_at = datetime('now') "
            "WHERE id = ? AND user_id = ? AND slug = ?",
            (fields_json, messages_json, document_id, user_id, slug),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        db.commit()
        return document_id

    cursor = db.execute(
        "INSERT INTO documents (user_id, slug, fields, messages) VALUES (?, ?, ?, ?)",
        (user_id, slug, fields_json, messages_json),
    )
    db.commit()
    return cursor.lastrowid
