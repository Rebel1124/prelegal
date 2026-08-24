import json
from pathlib import Path

from fastapi import HTTPException

from app.schemas import CamelModel

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "catalog.json"
DOCUMENT_TYPES_DIR = REPO_ROOT / "document-types"
TEMPLATES_DIR = REPO_ROOT / "templates"


class PartyRoleSpec(CamelModel):
    key: str
    role_label: str


class FieldSpec(CamelModel):
    key: str
    label: str
    aliases: list[str] = []
    textarea: bool = False


class DocumentTypeConfig(CamelModel):
    slug: str
    name: str
    description: str
    template_filename: str
    parties: tuple[PartyRoleSpec, PartyRoleSpec]
    fields: list[FieldSpec]


class DocumentTypeSchema(CamelModel):
    """The subset of a DocumentTypeConfig that is authored per-document as data."""

    parties: tuple[PartyRoleSpec, PartyRoleSpec]
    fields: list[FieldSpec]


def _load_document_types() -> dict[str, DocumentTypeConfig]:
    catalog = {
        Path(entry["filename"]).stem: entry
        for entry in json.loads(CATALOG_PATH.read_text())
    }

    document_types: dict[str, DocumentTypeConfig] = {}
    for schema_path in sorted(DOCUMENT_TYPES_DIR.glob("*.json")):
        slug = schema_path.stem
        catalog_entry = catalog[slug]
        schema = DocumentTypeSchema.model_validate_json(schema_path.read_text())
        document_types[slug] = DocumentTypeConfig(
            slug=slug,
            name=catalog_entry["name"],
            description=catalog_entry["description"],
            template_filename=catalog_entry["filename"],
            parties=schema.parties,
            fields=schema.fields,
        )
    return document_types


DOCUMENT_TYPES = _load_document_types()


def get_document_type(slug: str) -> DocumentTypeConfig:
    try:
        return DOCUMENT_TYPES[slug]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {slug}")
