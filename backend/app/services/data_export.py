"""Flexible data export for form submissions.

Turns a form's submissions into the format a user needs for another platform — tabular
(CSV / Excel / JSON), geospatial (GeoJSON / KML / GPX / Shapefile), with all answer
attributes and references to captured media. The available formats are data-aware: a form
with no location data does not offer geospatial exports.
"""

from __future__ import annotations

import csv
import io
import json
import zipfile
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID
from xml.sax.saxutils import escape

import shapefile  # pyshp
from openpyxl import Workbook
from shapely.geometry import shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import DataForm, DataFormVersion, Submission
from app.models.operations import MediaEvidence

# WGS84 projection text written into the shapefile .prj sidecar.
_WGS84_PRJ = (
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],'
    'PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
)

# Static format catalogue. `kind` decides which formats a dataset can offer.
EXPORT_FORMATS: dict[str, dict[str, str]] = {
    "csv": {"label": "CSV", "media_type": "text/csv", "ext": "csv", "kind": "tabular",
            "hint": "Spreadsheet-friendly table for Excel, Google Sheets, or any data tool."},
    "xlsx": {"label": "Excel (.xlsx)", "media_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
             "ext": "xlsx", "kind": "tabular", "hint": "Native Excel workbook with one row per submission."},
    "json": {"label": "JSON", "media_type": "application/json", "ext": "json", "kind": "tabular",
             "hint": "Full structured records for developers and data pipelines."},
    "geojson": {"label": "GeoJSON", "media_type": "application/geo+json", "ext": "geojson", "kind": "spatial",
                "hint": "Geometry + attributes for QGIS, ArcGIS, Mapbox, and kepler.gl."},
    "kml": {"label": "KML", "media_type": "application/vnd.google-earth.kml+xml", "ext": "kml", "kind": "spatial",
            "hint": "Open in Google Earth and most GIS tools."},
    "gpx": {"label": "GPX", "media_type": "application/gpx+xml", "ext": "gpx", "kind": "points",
            "hint": "GPS waypoints for handheld GPS units and field apps."},
    "shapefile": {"label": "Shapefile (.zip)", "media_type": "application/zip", "ext": "zip", "kind": "spatial",
                  "hint": "Classic GIS format, zipped (points and boundaries in separate layers)."},
}


@dataclass
class ExportArtifact:
    filename: str
    media_type: str
    content: bytes


@dataclass
class _Record:
    submission_id: str
    submitted_at: str
    status: str
    project_id: str | None
    entity_id: str | None
    attributes: dict[str, Any] = field(default_factory=dict)
    # Each geometry is a GeoJSON-style dict: {"type": "Point"/"Polygon", "coordinates": [...]}.
    geometries: list[dict[str, Any]] = field(default_factory=list)
    media: list[dict[str, str]] = field(default_factory=list)

    def primary_geometry(self) -> dict[str, Any] | None:
        polygon = next((geometry for geometry in self.geometries if geometry.get("type") == "Polygon"), None)
        return polygon or (self.geometries[0] if self.geometries else None)

    def point(self) -> tuple[float, float] | None:
        for geometry in self.geometries:
            if geometry.get("type") == "Point":
                lng, lat = geometry["coordinates"]
                return float(lat), float(lng)
        # Fall back to a polygon centroid so point-only formats can still place the record.
        polygon = next((geometry for geometry in self.geometries if geometry.get("type") == "Polygon"), None)
        if polygon:
            try:
                centroid = shape(polygon).centroid
                return float(centroid.y), float(centroid.x)
            except Exception:  # noqa: BLE001 - never let a bad shape break export
                return None
        return None


def _is_polygon(value: Any) -> bool:
    return isinstance(value, dict) and value.get("type") == "Polygon" and isinstance(value.get("coordinates"), list)


def _point_from(value: Any) -> tuple[float, float] | None:
    """Extract (lat, lng) from a geolocation-style answer value."""
    if not isinstance(value, dict):
        return None
    lat, lng = value.get("latitude"), value.get("longitude")
    if lat is None or lng is None:
        return None
    try:
        return float(lat), float(lng)
    except (TypeError, ValueError):
        return None


def _schema_labels(schema_json: dict[str, Any]) -> dict[str, str]:
    """Map answer keys (variable_name and field id) to their human label."""
    labels: dict[str, str] = {}
    for section in (schema_json or {}).get("sections", []):
        for field_def in section.get("fields", []):
            label = str(field_def.get("label") or field_def.get("variable_name") or field_def.get("id") or "").strip()
            for key in (field_def.get("variable_name"), field_def.get("id")):
                if key and label:
                    labels[str(key)] = label
    return labels


def _humanize(key: str) -> str:
    return key.replace("_", " ").replace("-", " ").strip().title()


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


class DataExportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _load(
        self, organization_id: UUID, form_id: UUID, status: str | None
    ) -> tuple[DataForm | None, dict[str, Any], list[Submission], dict[UUID, list[MediaEvidence]]]:
        form = (
            await self.session.execute(
                select(DataForm).where(
                    DataForm.organization_id == organization_id,
                    DataForm.id == form_id,
                    DataForm.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if form is None:
            return None, {}, [], {}

        version = (
            await self.session.execute(
                select(DataFormVersion)
                .where(
                    DataFormVersion.organization_id == organization_id,
                    DataFormVersion.form_id == form_id,
                )
                .order_by(DataFormVersion.version.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        schema_json = (version.schema_json if version else {}) or {}

        conditions = [
            Submission.organization_id == organization_id,
            Submission.form_id == form_id,
            Submission.deleted_at.is_(None),
        ]
        if status:
            conditions.append(Submission.status == status)
        submissions = list(
            (
                await self.session.execute(
                    select(Submission).where(*conditions).order_by(Submission.submitted_at.desc()).limit(10000)
                )
            )
            .scalars()
            .all()
        )

        media_by_submission: dict[UUID, list[MediaEvidence]] = {}
        if submissions:
            media_rows = list(
                (
                    await self.session.execute(
                        select(MediaEvidence).where(
                            MediaEvidence.organization_id == organization_id,
                            MediaEvidence.submission_id.in_([submission.id for submission in submissions]),
                            MediaEvidence.deleted_at.is_(None),
                        )
                    )
                )
                .scalars()
                .all()
            )
            for media in media_rows:
                if media.submission_id is not None:
                    media_by_submission.setdefault(media.submission_id, []).append(media)
        return form, schema_json, submissions, media_by_submission

    def _to_record(
        self, submission: Submission, labels: dict[str, str], media_rows: list[MediaEvidence]
    ) -> _Record:
        payload = submission.payload_json or {}
        record = _Record(
            submission_id=str(submission.id),
            submitted_at=submission.submitted_at.isoformat() if submission.submitted_at else "",
            status=submission.status,
            project_id=str(submission.project_id) if submission.project_id else None,
            entity_id=str(submission.entity_id) if submission.entity_id else None,
        )

        # Prefer the structured mobile responses; fall back to flattened top-level keys.
        responses = payload.get("_mobile_responses")
        seen_keys: set[str] = set()
        if isinstance(responses, list):
            for response in responses:
                if not isinstance(response, dict):
                    continue
                key = str(response.get("variableName") or response.get("questionId") or "").strip()
                if not key:
                    continue
                seen_keys.add(key)
                self._absorb_value(record, labels.get(key, _humanize(key)), response.get("value"))
        for key, value in payload.items():
            if key.startswith("_") or key == "responses" or key in seen_keys:
                continue
            self._absorb_value(record, labels.get(key, _humanize(key)), value)

        # A submission-level GPS fix becomes a point when no answer supplied one.
        if not any(geometry.get("type") == "Point" for geometry in record.geometries):
            if submission.latitude or submission.longitude:
                record.geometries.append({"type": "Point", "coordinates": [submission.longitude, submission.latitude]})

        for media in media_rows:
            record.media.append(
                {"file_name": media.file_name, "media_type": media.media_type, "url": media.storage_url}
            )
        if record.media:
            record.attributes.setdefault("Media files", "; ".join(item["url"] for item in record.media))
        return record

    def _absorb_value(self, record: _Record, label: str, value: Any) -> None:
        if _is_polygon(value):
            record.geometries.append({"type": "Polygon", "coordinates": value["coordinates"]})
            record.attributes[label] = f"Polygon ({len(value['coordinates'][0]) if value['coordinates'] else 0} points)"
            return
        point = _point_from(value)
        if point is not None:
            record.geometries.append({"type": "Point", "coordinates": [point[1], point[0]]})
            record.attributes[label] = f"{point[0]:.6f}, {point[1]:.6f}"
            return
        record.attributes[label] = _stringify(value)

    # ── public API ────────────────────────────────────────────────────────────

    async def capabilities(self, organization_id: UUID, form_id: UUID, status: str | None = None) -> dict[str, Any] | None:
        form, schema_json, submissions, media_by_submission = await self._load(organization_id, form_id, status)
        if form is None:
            return None
        labels = _schema_labels(schema_json)
        records = [self._to_record(submission, labels, media_by_submission.get(submission.id, [])) for submission in submissions]
        has_points = any(any(g.get("type") == "Point" for g in record.geometries) for record in records)
        has_polygons = any(any(g.get("type") == "Polygon" for g in record.geometries) for record in records)
        has_media = any(record.media for record in records)
        has_spatial = has_points or has_polygons

        formats: list[dict[str, Any]] = []
        for fmt, meta in EXPORT_FORMATS.items():
            if meta["kind"] == "tabular":
                available, reason = True, ""
            elif meta["kind"] == "points":
                available = has_points
                reason = "" if has_points else "No GPS point data in this form's submissions."
            else:  # spatial
                available = has_spatial
                reason = "" if has_spatial else "No location or boundary data in this form's submissions."
            formats.append(
                {"id": fmt, "label": meta["label"], "hint": meta["hint"], "kind": meta["kind"],
                 "available": available, "reason": reason}
            )
        return {
            "form_id": str(form_id),
            "form_name": form.name,
            "record_count": len(records),
            "has_points": has_points,
            "has_polygons": has_polygons,
            "has_media": has_media,
            "formats": formats,
        }

    async def export(
        self, organization_id: UUID, form_id: UUID, fmt: str, status: str | None = None
    ) -> ExportArtifact | None:
        if fmt not in EXPORT_FORMATS:
            raise ValueError(f"Unsupported export format: {fmt}")
        form, schema_json, submissions, media_by_submission = await self._load(organization_id, form_id, status)
        if form is None:
            return None
        labels = _schema_labels(schema_json)
        records = [self._to_record(submission, labels, media_by_submission.get(submission.id, [])) for submission in submissions]
        base = _safe_slug(form.name) or "submissions"
        ext = EXPORT_FORMATS[fmt]["ext"]
        content = _SERIALIZERS[fmt](records)
        return ExportArtifact(filename=f"{base}.{ext}", media_type=EXPORT_FORMATS[fmt]["media_type"], content=content)


def _safe_slug(value: str) -> str:
    return "".join(char if char.isalnum() or char in "-_" else "-" for char in value.strip().lower()).strip("-")[:60]


def _column_order(records: list[_Record]) -> list[str]:
    columns: list[str] = []
    for record in records:
        for key in record.attributes:
            if key not in columns:
                columns.append(key)
    return columns


def _wkt(geometry: dict[str, Any] | None) -> str:
    if not geometry:
        return ""
    try:
        return shape(geometry).wkt
    except Exception:  # noqa: BLE001
        return ""


# ── serializers ─────────────────────────────────────────────────────────────

def _serialize_csv(records: list[_Record]) -> bytes:
    columns = _column_order(records)
    headers = ["submission_id", "submitted_at", "status", "latitude", "longitude", "geometry_wkt", *columns]
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    for record in records:
        point = record.point()
        writer.writerow(
            [
                record.submission_id,
                record.submitted_at,
                record.status,
                f"{point[0]:.6f}" if point else "",
                f"{point[1]:.6f}" if point else "",
                _wkt(record.primary_geometry()),
                *[record.attributes.get(column, "") for column in columns],
            ]
        )
    return buffer.getvalue().encode("utf-8-sig")


def _serialize_json(records: list[_Record]) -> bytes:
    payload = [
        {
            "submission_id": record.submission_id,
            "submitted_at": record.submitted_at,
            "status": record.status,
            "project_id": record.project_id,
            "entity_id": record.entity_id,
            "attributes": record.attributes,
            "geometry": record.primary_geometry(),
            "geometries": record.geometries,
            "media": record.media,
        }
        for record in records
    ]
    return json.dumps({"records": payload, "exported_at": datetime.now(UTC).isoformat()}, ensure_ascii=False, indent=2).encode("utf-8")


def _serialize_xlsx(records: list[_Record]) -> bytes:
    columns = _column_order(records)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Submissions"
    sheet.append(["submission_id", "submitted_at", "status", "latitude", "longitude", "geometry_wkt", *columns])
    for record in records:
        point = record.point()
        sheet.append(
            [
                record.submission_id,
                record.submitted_at,
                record.status,
                point[0] if point else None,
                point[1] if point else None,
                _wkt(record.primary_geometry()),
                *[record.attributes.get(column, "") for column in columns],
            ]
        )
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _serialize_geojson(records: list[_Record]) -> bytes:
    features = []
    for record in records:
        properties = {
            "submission_id": record.submission_id,
            "submitted_at": record.submitted_at,
            "status": record.status,
            **record.attributes,
        }
        if record.media:
            properties["media"] = [item["url"] for item in record.media]
        features.append({"type": "Feature", "geometry": record.primary_geometry(), "properties": properties})
    return json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False).encode("utf-8")


def _serialize_kml(records: list[_Record]) -> bytes:
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
    ]
    for record in records:
        geometry = record.primary_geometry()
        name = escape(record.attributes.get("Name") or record.submission_id)
        extended = "".join(
            f'<Data name="{escape(str(key))}"><value>{escape(_stringify(value))}</value></Data>'
            for key, value in record.attributes.items()
        )
        media_desc = "".join(f'<a href="{escape(item["url"])}">{escape(item["file_name"])}</a><br/>' for item in record.media)
        geo_kml = ""
        if geometry and geometry["type"] == "Point":
            lng, lat = geometry["coordinates"]
            geo_kml = f"<Point><coordinates>{lng},{lat}</coordinates></Point>"
        elif geometry and geometry["type"] == "Polygon":
            ring = geometry["coordinates"][0] if geometry["coordinates"] else []
            coords = " ".join(f"{pt[0]},{pt[1]}" for pt in ring)
            geo_kml = (
                "<Polygon><outerBoundaryIs><LinearRing>"
                f"<coordinates>{coords}</coordinates>"
                "</LinearRing></outerBoundaryIs></Polygon>"
            )
        parts.append(
            f"<Placemark><name>{name}</name>"
            f"<description><![CDATA[{media_desc}]]></description>"
            f"<ExtendedData>{extended}</ExtendedData>{geo_kml}</Placemark>"
        )
    parts.append("</Document></kml>")
    return "".join(parts).encode("utf-8")


def _serialize_gpx(records: list[_Record]) -> bytes:
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Atlas FieldOps" xmlns="http://www.topografix.com/GPX/1/1">',
    ]
    for record in records:
        point = record.point()
        if point is None:
            continue
        name = escape(record.attributes.get("Name") or record.submission_id)
        parts.append(f'<wpt lat="{point[0]}" lon="{point[1]}"><name>{name}</name></wpt>')
    parts.append("</gpx>")
    return "".join(parts).encode("utf-8")


def _shapefile_fields(columns: list[str]) -> list[tuple[str, str]]:
    """Shapefile DBF field names are limited to 10 chars and must be unique."""
    used: set[str] = set()
    mapping: list[tuple[str, str]] = []
    for column in columns:
        base = "".join(char for char in column if char.isalnum() or char == "_")[:10] or "field"
        name = base
        suffix = 1
        while name in used:
            name = f"{base[:8]}{suffix:02d}"
            suffix += 1
        used.add(name)
        mapping.append((column, name))
    return mapping


def _write_layer(zip_file: zipfile.ZipFile, layer: str, shape_type: int, records: list[_Record], columns: list[str]) -> None:
    field_map = _shapefile_fields(columns)
    shp, shx, dbf = io.BytesIO(), io.BytesIO(), io.BytesIO()
    writer = shapefile.Writer(shp=shp, shx=shx, dbf=dbf, shapeType=shape_type)
    writer.field("subm_id", "C", size=50)
    for _, name in field_map:
        writer.field(name, "C", size=200)
    wrote = False
    for record in records:
        geometry = record.primary_geometry()
        if shape_type == shapefile.POINT:
            point = record.point()
            if point is None:
                continue
            writer.point(point[1], point[0])
        else:
            if not geometry or geometry["type"] != "Polygon":
                continue
            writer.poly(geometry["coordinates"])
        writer.record(record.submission_id, *[_stringify(record.attributes.get(column, ""))[:200] for column, _ in field_map])
        wrote = True
    writer.close()
    if not wrote:
        return
    zip_file.writestr(f"{layer}.shp", shp.getvalue())
    zip_file.writestr(f"{layer}.shx", shx.getvalue())
    zip_file.writestr(f"{layer}.dbf", dbf.getvalue())
    zip_file.writestr(f"{layer}.prj", _WGS84_PRJ)


def _serialize_shapefile(records: list[_Record]) -> bytes:
    columns = _column_order(records)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        _write_layer(zip_file, "points", shapefile.POINT, records, columns)
        _write_layer(zip_file, "polygons", shapefile.POLYGON, records, columns)
        # A CSV companion keeps the full attribute table even for records without geometry.
        zip_file.writestr("attributes.csv", _serialize_csv(records))
    return buffer.getvalue()


_SERIALIZERS = {
    "csv": _serialize_csv,
    "xlsx": _serialize_xlsx,
    "json": _serialize_json,
    "geojson": _serialize_geojson,
    "kml": _serialize_kml,
    "gpx": _serialize_gpx,
    "shapefile": _serialize_shapefile,
}
