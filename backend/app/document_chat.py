import json
import sqlite3
from functools import lru_cache
from typing import Literal

from litellm import completion
from pydantic import create_model

from app.document_types import DocumentTypeConfig, get_document_type
from app.documents_store import upsert_document
from app.llm import EXTRA_BODY, MODEL
from app.schemas import CamelModel


class PartyInfo(CamelModel):
    legal_name: str = ""
    notice_address: str = ""
    signatory_name: str = ""
    signatory_title: str = ""


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class DocumentChatRequest(CamelModel):
    messages: list[ChatMessage]
    fields: dict
    document_id: int | None = None


class DocumentChatResponse(CamelModel):
    reply: str
    fields: dict
    document_id: int


@lru_cache(maxsize=None)
def build_fields_model(slug: str) -> type[CamelModel]:
    config = get_document_type(slug)
    field_definitions = {field.key: (str, "") for field in config.fields}
    party_definitions = {party.key: (PartyInfo, PartyInfo()) for party in config.parties}
    return create_model(
        f"Fields_{slug}",
        __base__=CamelModel,
        **field_definitions,
        **party_definitions,
    )


@lru_cache(maxsize=None)
def build_response_model(slug: str) -> type[CamelModel]:
    fields_model = build_fields_model(slug)
    return create_model(
        f"ChatResponse_{slug}",
        __base__=CamelModel,
        reply=(str, ...),
        fields=(fields_model, ...),
    )


SYSTEM_PROMPT = """You are a friendly legal assistant helping a user draft a {document_name} \
through natural conversation.

You are gathering values for these parties (the document refers to them by role, not this key):
{party_lines}

You are also gathering values for these fields:
{field_lines}

{party_required_fields} and effectiveDate are required; everything else is optional. \
effectiveDate must be output as YYYY-MM-DD; if the user gives a date you cannot confidently \
resolve to a calendar date, leave it blank and ask for an exact date.

Rules:
- Never invent or guess a value the user hasn't provided or confirmed.
- Extract every field you can from the user's latest message in one pass; don't make the user \
repeat information.
- Don't re-ask about a field that already has a value below, unless the user asks to change it.
- Keep replies conversational and brief (1-3 sentences).

{followup_instruction}

The current known field values are:
{current_fields}

Respond with the full updated set of fields (including any values that didn't change) and your \
reply to the user.
"""


def compute_missing_fields(config: DocumentTypeConfig, current_fields: dict) -> tuple[list[str], list[str]]:
    """Return (missing_required, missing_optional) field descriptions, computed from the actual
    current values rather than left to the model to track from conversation history."""
    missing_required = []
    for party in config.parties:
        party_value = current_fields.get(party.key) or {}
        if not str(party_value.get("legalName", "")).strip():
            missing_required.append(f"{party.key}.legalName ({party.role_label} legal name)")
    if not str(current_fields.get("effectiveDate", "")).strip():
        missing_required.append("effectiveDate")

    missing_optional = [
        f"{field.key} ({field.label})"
        for field in config.fields
        if field.key != "effectiveDate" and not str(current_fields.get(field.key, "")).strip()
    ]
    return missing_required, missing_optional


def build_followup_instruction(missing_required: list[str], missing_optional: list[str]) -> str:
    if missing_required:
        return (
            f"Still missing required fields: {', '.join(missing_required)}. End your reply by "
            "asking about the next one or two of these; don't ask about optional fields yet."
        )
    if missing_optional:
        return (
            f"All required fields are filled. Still missing optional fields: "
            f"{', '.join(missing_optional)}. You may ask about one or two of these if it fits "
            "naturally, but don't force it if the user seems done."
        )
    return (
        "All fields, required and optional, are filled. Do not ask about further fields unless "
        "the user wants to change something — let them know the document is ready."
    )


def build_system_prompt(config: DocumentTypeConfig, current_fields: dict) -> str:
    party_lines = "\n".join(
        f'- {party.key}.legalName, {party.key}.noticeAddress, {party.key}.signatoryName, '
        f'{party.key}.signatoryTitle (the document calls this party "{party.role_label}")'
        for party in config.parties
    )
    field_lines = "\n".join(f"- {field.key} ({field.label})" for field in config.fields)
    party_required_fields = " and ".join(f"{party.key}.legalName" for party in config.parties)
    missing_required, missing_optional = compute_missing_fields(config, current_fields)

    return SYSTEM_PROMPT.format(
        document_name=config.name,
        party_lines=party_lines,
        field_lines=field_lines,
        party_required_fields=party_required_fields,
        followup_instruction=build_followup_instruction(missing_required, missing_optional),
        current_fields=json.dumps(current_fields, indent=2),
    )


def run_chat_turn(
    db: sqlite3.Connection, user_id: int, slug: str, request: DocumentChatRequest
) -> DocumentChatResponse:
    config = get_document_type(slug)
    fields_model = build_fields_model(slug)
    response_model = build_response_model(slug)

    current_fields = fields_model.model_validate(request.fields)
    system_prompt = build_system_prompt(config, current_fields.model_dump(by_alias=True))

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": message.role, "content": message.content} for message in request.messages]

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=response_model,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = response_model.model_validate_json(response.choices[0].message.content)
    updated_fields = result.fields.model_dump(by_alias=True)

    saved_messages = [message.model_dump(by_alias=True) for message in request.messages]
    saved_messages.append({"role": "assistant", "content": result.reply})
    document_id = upsert_document(db, user_id, slug, request.document_id, updated_fields, saved_messages)

    return DocumentChatResponse(reply=result.reply, fields=updated_fields, document_id=document_id)
