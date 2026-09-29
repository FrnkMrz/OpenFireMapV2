#!/usr/bin/env python3
"""Audit Home Assistant entity IDs in an OpenFireMap package.

The audit intentionally uses only the Python standard library.  Home Assistant
packages may contain tags such as ``!secret`` and ``!include`` that are not
valid for a generic YAML loader, so the checker performs a small structural
scan of the package instead of resolving those tags or executing templates.

Entity IDs are derived from the YAML ``name`` field, not ``unique_id``.  The
slugification mirrors Home Assistant's ``homeassistant.util.slugify`` with
``separator="_"``: Unicode is transliterated to ASCII, umlauts are reduced to
their base letter, ``ß`` becomes ``ss``, non-alphanumeric runs become one
underscore, and the result is lower-case.
"""

from __future__ import annotations

import ast
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path


ENTITY_REFERENCE_RE = re.compile(r"\b(sensor|binary_sensor)\.([a-z0-9_]+)\b")
# REST packages use ``sensor:`` while template packages use ``- sensor:``.
SECTION_RE = re.compile(r"^(?:-\s+)?(sensor|binary_sensor):\s*(?:#.*)?$")
NAME_RE = re.compile(r"^-\s+name:\s*(.+?)\s*$")


def yaml_scalar(raw: str) -> str:
    """Read the simple scalar forms used for entity names in this package."""

    value = raw.strip()
    if value.startswith(("'", '"')) and value.endswith(value[0]):
        try:
            parsed = ast.literal_eval(value)
            if isinstance(parsed, str):
                return parsed
        except (SyntaxError, ValueError):
            pass
        return value[1:-1]
    return value.split(" #", 1)[0].strip()


def slugify(name: str) -> str:
    """Return the Home Assistant-style entity slug for a display name."""

    # NFKD handles Ä/Ö/Ü and their lower-case forms.  Python does not
    # decompose ß, so map it explicitly before the ASCII conversion.
    name = name.translate(str.maketrans({"ß": "ss", "ẞ": "SS"}))
    ascii_name = (
        unicodedata.normalize("NFKD", name)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "_", ascii_name).strip("_")


def find_definitions(lines: list[str]) -> list[tuple[int, str, str]]:
    """Find ``- name:`` entries below YAML sensor sections."""

    definitions: list[tuple[int, str, str]] = []
    active_domain: str | None = None
    active_indent = -1

    for line_number, line in enumerate(lines, start=1):
        stripped = line.lstrip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(line) - len(stripped)

        section = SECTION_RE.match(stripped)
        if section:
            active_domain = section.group(1)
            active_indent = indent
            continue

        if active_domain is not None and indent <= active_indent:
            active_domain = None
            active_indent = -1

        if active_domain is None:
            continue

        name_match = NAME_RE.match(stripped)
        if name_match:
            name = yaml_scalar(name_match.group(1))
            entity_id = f"{active_domain}.{slugify(name)}"
            definitions.append((line_number, name, entity_id))

    return definitions


def audit(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    definitions = find_definitions(lines)
    defined = {entity_id for _, _, entity_id in definitions}

    references: dict[str, list[int]] = defaultdict(list)
    for line_number, line in enumerate(lines, start=1):
        for match in ENTITY_REFERENCE_RE.finditer(line):
            references[f"{match.group(1)}.{match.group(2)}"].append(line_number)

    duplicates: dict[str, list[int]] = defaultdict(list)
    for line_number, _, entity_id in definitions:
        duplicates[entity_id].append(line_number)
    duplicate_items = {entity_id: lines for entity_id, lines in duplicates.items() if len(lines) > 1}

    missing = {
        entity_id: line_numbers
        for entity_id, line_numbers in sorted(references.items())
        if entity_id not in defined
    }

    print("Name -> Entity-ID")
    print("-" * 78)
    for line_number, name, entity_id in definitions:
        print(f"{name} -> {entity_id} (Zeile {line_number})")

    print("\nFehlende Verweise")
    print("-" * 78)
    if missing:
        for entity_id, line_numbers in missing.items():
            locations = ", ".join(str(number) for number in line_numbers)
            print(f"{entity_id} (verwendet in Zeile(n): {locations})")
    else:
        print("Keine fehlenden Verweise.")

    if duplicate_items:
        print("\nDoppelte Entitäts-IDs")
        print("-" * 78)
        for entity_id, line_numbers in duplicate_items.items():
            print(f"{entity_id} (Definitionen in Zeile(n): {', '.join(map(str, line_numbers))})")

    print(
        f"\nErgebnis: {len(definitions)} Definitionen, "
        f"{len(missing)} fehlende Verweise"
        + (f", {len(duplicate_items)} doppelte IDs" if duplicate_items else "")
    )
    return 1 if missing or duplicate_items or not definitions else 0


def main() -> int:
    if len(sys.argv) != 2:
        print(f"Verwendung: {Path(sys.argv[0]).name} PFAD_ZUR_OPENFIREMAP_YAML", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"Datei nicht gefunden: {path}", file=sys.stderr)
        return 2
    return audit(path)


if __name__ == "__main__":
    raise SystemExit(main())
