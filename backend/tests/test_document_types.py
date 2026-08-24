import json
from pathlib import Path

from app.document_types import CATALOG_PATH, DOCUMENT_TYPES, TEMPLATES_DIR


def test_every_catalog_entry_has_a_document_type():
    catalog = json.loads(CATALOG_PATH.read_text())
    assert len(catalog) == len(DOCUMENT_TYPES)
    for entry in catalog:
        slug = Path(entry["filename"]).stem
        assert slug in DOCUMENT_TYPES
        assert DOCUMENT_TYPES[slug].name == entry["name"]
        assert DOCUMENT_TYPES[slug].template_filename == entry["filename"]


def test_template_files_exist():
    for config in DOCUMENT_TYPES.values():
        assert (TEMPLATES_DIR / config.template_filename).is_file()


def test_party_role_labels_are_distinct_per_document():
    for slug, config in DOCUMENT_TYPES.items():
        labels = [party.role_label for party in config.parties]
        assert len(labels) == len(set(labels)), slug


def test_field_keys_are_unique_per_document():
    for slug, config in DOCUMENT_TYPES.items():
        keys = [field.key for field in config.fields]
        assert len(keys) == len(set(keys)), slug
        assert "effectiveDate" in keys, slug


def test_field_labels_do_not_collide_with_party_role_labels():
    for slug, config in DOCUMENT_TYPES.items():
        role_labels = {party.role_label for party in config.parties}
        field_labels = {field.label for field in config.fields}
        for field in config.fields:
            field_labels.update(field.aliases)
        assert role_labels.isdisjoint(field_labels), slug


def test_field_keys_do_not_collide_with_party_keys():
    # build_fields_model spreads field and party definitions into one dict; a shared key
    # would raise a TypeError at model-creation time, so this must never happen.
    for slug, config in DOCUMENT_TYPES.items():
        field_keys = {field.key for field in config.fields}
        party_keys = {party.key for party in config.parties}
        assert field_keys.isdisjoint(party_keys), slug
