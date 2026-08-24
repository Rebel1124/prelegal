import json
from functools import lru_cache
from typing import Literal

from litellm import completion
from pydantic import create_model

from app.document_types import DocumentTypeConfig, get_document_type
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


class DocumentChatResponse(CamelModel):
    reply: str
    fields: dict


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

{party_required_fields} and effectiveDate are required. Everything else is optional but worth \
asking about. effectiveDate must be output as YYYY-MM-DD; if the user gives a date you cannot \
confidently resolve to a calendar date, leave it blank and ask for an exact date.

Rules:
- Never invent or guess a value the user hasn't provided or confirmed.
- Extract every field you can from the user's latest message in one pass; don't make the user \
repeat information.
- Don't re-ask about a field that already has a value below, unless the user asks to change it.
- Ask about whichever required fields are still missing first, then optional ones. You may ask \
about more than one related field in a single message.
- Keep replies conversational and brief (1-3 sentences).
- Once all required fields are filled, let the user know the preview and download are ready, and \
that they can still add optional details or ask you to change anything.

The current known field values are:
{current_fields}

Respond with the full updated set of fields (including any values that didn't change) and your \
reply to the user.
"""


def build_system_prompt(config: DocumentTypeConfig, current_fields: dict) -> str:
    party_lines = "\n".join(
        f'- {party.key}.legalName, {party.key}.noticeAddress, {party.key}.signatoryName, '
        f'{party.key}.signatoryTitle (the document calls this party "{party.role_label}")'
        for party in config.parties
    )
    field_lines = "\n".join(f"- {field.key} ({field.label})" for field in config.fields)
    party_required_fields = " and ".join(f"{party.key}.legalName" for party in config.parties)

    return SYSTEM_PROMPT.format(
        document_name=config.name,
        party_lines=party_lines,
        field_lines=field_lines,
        party_required_fields=party_required_fields,
        current_fields=json.dumps(current_fields, indent=2),
    )


def run_chat_turn(slug: str, request: DocumentChatRequest) -> DocumentChatResponse:
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
    return DocumentChatResponse(reply=result.reply, fields=result.fields.model_dump(by_alias=True))
