import json
from typing import Literal

from litellm import completion
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PartyInfo(CamelModel):
    legal_name: str = ""
    notice_address: str = ""
    signatory_name: str = ""
    signatory_title: str = ""


class NdaFields(CamelModel):
    effective_date: str = ""
    purpose: str = ""
    mnda_term: str = ""
    confidentiality_term: str = ""
    governing_law: str = ""
    jurisdiction: str = ""
    party_a: PartyInfo = PartyInfo()
    party_b: PartyInfo = PartyInfo()


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class NdaChatRequest(CamelModel):
    messages: list[ChatMessage]
    fields: NdaFields


class NdaChatResponse(CamelModel):
    reply: str
    fields: NdaFields


SYSTEM_PROMPT = """You are a friendly legal assistant helping a user draft a Mutual Non-Disclosure \
Agreement (MNDA) through natural conversation.

You are gathering values for these fields:
- partyA.legalName, partyA.noticeAddress, partyA.signatoryName, partyA.signatoryTitle
- partyB.legalName, partyB.noticeAddress, partyB.signatoryName, partyB.signatoryTitle
- effectiveDate (required, must be output as YYYY-MM-DD; if the user gives a date you \
cannot confidently resolve to a calendar date, leave it blank and ask for an exact date)
- purpose (why the parties are sharing confidential information)
- mndaTerm (how long the agreement itself lasts, e.g. "1 year from the Effective Date")
- confidentialityTerm (how long confidentiality obligations survive, e.g. "3 years after \
disclosure")
- governingLaw (a US state, e.g. "Delaware")
- jurisdiction (a court venue, e.g. "Wilmington, Delaware")

partyA.legalName, partyB.legalName, and effectiveDate are required. Everything else is \
optional but worth asking about.

Rules:
- Never invent or guess a value the user hasn't provided or confirmed.
- Extract every field you can from the user's latest message in one pass; don't make the \
user repeat information.
- Don't re-ask about a field that already has a value below, unless the user asks to \
change it.
- Ask about whichever required fields are still missing first, then optional ones. You may \
ask about more than one related field in a single message.
- Keep replies conversational and brief (1-3 sentences).
- Once all required fields are filled, let the user know the preview and download are \
ready, and that they can still add optional details or ask you to change anything.

The current known field values are:
{current_fields}

Respond with the full updated set of fields (including any values that didn't change) and \
your reply to the user.
"""


def build_system_prompt(current_fields: NdaFields) -> str:
    return SYSTEM_PROMPT.format(
        current_fields=json.dumps(current_fields.model_dump(by_alias=True), indent=2)
    )


def run_chat_turn(request: NdaChatRequest) -> NdaChatResponse:
    messages = [{"role": "system", "content": build_system_prompt(request.fields)}]
    messages += [{"role": message.role, "content": message.content} for message in request.messages]

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=NdaChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return NdaChatResponse.model_validate_json(response.choices[0].message.content)
