from __future__ import annotations

import csv
import json
import zipfile
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

SUPPORTED_UPLOAD_FORMATS = {"csv", "xlsx", "xls", "json", "geojson"}
MAX_ROWS_PER_UPLOAD = 5000


class UnsupportedImportFormatError(ValueError):
    pass


def detect_format(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    if suffix not in SUPPORTED_UPLOAD_FORMATS:
        raise UnsupportedImportFormatError(f"Unsupported file format: {suffix or 'unknown'}")
    return suffix


def parse_uploaded_dataset(filename: str, content: bytes) -> tuple[str, list[str], list[dict[str, object]]]:
    file_format = detect_format(filename)
    if file_format == "csv":
        rows = parse_csv(content)
    elif file_format == "xlsx":
        rows = parse_xlsx(content)
    elif file_format == "xls":
        raise UnsupportedImportFormatError("Legacy .xls upload needs conversion to .xlsx or .csv first")
    elif file_format in {"json", "geojson"}:
        rows = parse_json_dataset(content)
    else:  # pragma: no cover - defensive guard
        raise UnsupportedImportFormatError(f"Unsupported file format: {file_format}")
    return file_format, columns_for_rows(rows), rows[:MAX_ROWS_PER_UPLOAD]


def parse_csv(content: bytes) -> list[dict[str, object]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(StringIO(text))
    return [{key: normalize_cell(value) for key, value in row.items() if key is not None} for row in reader]


def parse_json_dataset(content: bytes) -> list[dict[str, object]]:
    payload = json.loads(content.decode("utf-8"))
    if isinstance(payload, list):
        return [coerce_mapping(item) for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict) and isinstance(payload.get("features"), list):
        rows: list[dict[str, object]] = []
        for feature in payload["features"]:
            if not isinstance(feature, dict):
                continue
            raw_properties = feature.get("properties")
            properties: dict[Any, Any] = raw_properties if isinstance(raw_properties, dict) else {}
            raw_geometry = feature.get("geometry")
            geometry: dict[str, object] = raw_geometry if isinstance(raw_geometry, dict) else {}
            rows.append({**coerce_mapping(properties), "geometry": geometry})
        return rows
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return [coerce_mapping(item) for item in payload["rows"] if isinstance(item, dict)]
    raise ValueError("JSON imports must contain an array, GeoJSON features, or a rows array")


def parse_xlsx(content: bytes) -> list[dict[str, object]]:
    with zipfile.ZipFile(BytesIO(content)) as archive:
        shared_strings = read_shared_strings(archive)
        sheet_name = first_sheet_path(archive)
        sheet_xml = archive.read(sheet_name)
    root = ElementTree.fromstring(sheet_xml)
    namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    parsed_rows: list[list[object]] = []
    for row in root.findall(".//x:sheetData/x:row", namespace):
        values: list[object] = []
        for cell in row.findall("x:c", namespace):
            values.append(read_cell(cell, shared_strings, namespace))
        if any(value not in ("", None) for value in values):
            parsed_rows.append(values)
    if not parsed_rows:
        return []
    headers = [str(value).strip() or f"Column {index + 1}" for index, value in enumerate(parsed_rows[0])]
    records: list[dict[str, object]] = []
    for raw_row in parsed_rows[1:]:
        record = {header: normalize_cell(raw_row[index] if index < len(raw_row) else "") for index, header in enumerate(headers)}
        if any(value not in ("", None) for value in record.values()):
            records.append(record)
    return records


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for item in root.findall("x:si", namespace):
        parts = [text.text or "" for text in item.findall(".//x:t", namespace)]
        values.append("".join(parts))
    return values


def first_sheet_path(archive: zipfile.ZipFile) -> str:
    sheet_names = sorted(name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml"))
    if not sheet_names:
        raise ValueError("XLSX workbook does not contain a worksheet")
    return sheet_names[0]


def read_cell(cell: ElementTree.Element, shared_strings: list[str], namespace: dict[str, str]) -> object:
    value_node = cell.find("x:v", namespace)
    if value_node is None or value_node.text is None:
        inline = cell.find(".//x:t", namespace)
        return inline.text if inline is not None and inline.text is not None else ""
    raw_value = value_node.text
    if cell.attrib.get("t") == "s":
        index = int(raw_value)
        return shared_strings[index] if 0 <= index < len(shared_strings) else ""
    try:
        numeric = float(raw_value)
    except ValueError:
        return raw_value
    return int(numeric) if numeric.is_integer() else numeric


def normalize_cell(value: object) -> object:
    if isinstance(value, str):
        return value.strip()
    return value


def coerce_mapping(value: dict[Any, Any]) -> dict[str, object]:
    return {str(key): normalize_cell(item) for key, item in value.items()}


def columns_for_rows(rows: list[dict[str, object]]) -> list[str]:
    columns: list[str] = []
    for row in rows:
        for key in row:
            if key not in columns:
                columns.append(key)
    return columns
