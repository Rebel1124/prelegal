from litellm import completion

from app.document_types import DOCUMENT_TYPES
from app.llm import EXTRA_BODY, MODEL
from app.schemas import CamelModel


class SuggestionRequest(CamelModel):
    description: str


class SuggestionResponse(CamelModel):
    matched_slug: str | None
    reply: str


SYSTEM_PROMPT = """You help route a user to the right legal document template from a fixed catalog \
of {count} templates. Based on the user's description of what they need, pick the single closest \
matching document type from the catalog below, even if the fit is imperfect. Only report no match \
if the request has nothing to do with a legal agreement at all.

Catalog:
{catalog}

Respond with the slug of the closest matching document type (or null if truly nothing fits) and a \
short, friendly reply (1-3 sentences) explaining your suggestion, or explaining that we don't have \
a template for that.
"""


def build_system_prompt() -> str:
    catalog_lines = "\n".join(
        f"- {slug}: {config.name} — {config.description}" for slug, config in DOCUMENT_TYPES.items()
    )
    return SYSTEM_PROMPT.format(count=len(DOCUMENT_TYPES), catalog=catalog_lines)


def run_suggestion(request: SuggestionRequest) -> SuggestionResponse:
    messages = [
        {"role": "system", "content": build_system_prompt()},
        {"role": "user", "content": request.description},
    ]

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=SuggestionResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = SuggestionResponse.model_validate_json(response.choices[0].message.content)
    matched_slug = result.matched_slug if result.matched_slug in DOCUMENT_TYPES else None
    return SuggestionResponse(matched_slug=matched_slug, reply=result.reply)
