from __future__ import annotations

from typing import Any
from uuid import UUID

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from shapely.validation import make_valid


def polygon_from_geojson(value: Any) -> BaseGeometry | None:
    """Parse a GeoJSON Polygon response value into a valid shapely geometry, or ``None``."""
    if not isinstance(value, dict) or value.get("type") != "Polygon":
        return None
    coordinates = value.get("coordinates")
    if not isinstance(coordinates, list) or not coordinates:
        return None
    try:
        geometry = shape({"type": "Polygon", "coordinates": coordinates})
    except (ValueError, TypeError, AttributeError):
        return None
    if geometry.is_empty:
        return None
    if not geometry.is_valid:
        geometry = make_valid(geometry)
    return None if geometry.is_empty else geometry


def union_geometries(geometries: list[BaseGeometry]) -> BaseGeometry | None:
    """Merge several polygons into one geometry (used to compare a boundary against all of
    another submission's boundaries at once for project/organization-wide overlap checks)."""
    valid = [geometry for geometry in geometries if geometry is not None and not geometry.is_empty]
    if not valid:
        return None
    if len(valid) == 1:
        return valid[0]
    merged = unary_union(valid)
    return None if merged.is_empty else merged


def overlap_ratio(target: BaseGeometry, other: BaseGeometry) -> float:
    """Fraction of ``target``'s area covered by its intersection with ``other``."""
    if target.area <= 0:
        return 0.0
    intersection = target.intersection(other)
    if intersection.is_empty:
        return 0.0
    return float(intersection.area) / float(target.area)


def find_overlaps(target: BaseGeometry, candidates: list[tuple[UUID, BaseGeometry]]) -> list[dict[str, Any]]:
    """Return candidates whose geometry overlaps ``target`` by a non-zero area.

    Boundary-only touches (shared edges/points with zero intersection area) are not overlaps.
    """
    overlaps: list[dict[str, Any]] = []
    for submission_id, geometry in candidates:
        if not target.intersects(geometry):
            continue
        ratio = overlap_ratio(target, geometry)
        if ratio <= 0:
            continue
        overlaps.append({"submissionId": str(submission_id), "overlapRatio": ratio})
    return overlaps
