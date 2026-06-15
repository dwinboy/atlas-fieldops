# Mapping Module

Mapping owns GIS views, GPS evidence, layer review, boundaries, spatial quality, coverage, and indicator geography.

## Routes

- `/mapping` opens the overview.
- `/mapping/project-maps` opens GPS-derived project extents.
- `/mapping/submission-maps` opens submission GPS points.
- `/mapping/beneficiary-maps` opens person/entity points.
- `/mapping/facility-maps` opens facility, site, asset, school, clinic, warehouse, store, and water-point records.
- `/mapping/coverage-maps` opens project coverage evidence.
- `/mapping/indicator-maps` opens indicator progress by project geography.
- `/mapping/data-quality-maps` opens spatial quality issues.
- `/mapping/layers` opens live point layers.
- `/mapping/boundaries` opens GPS-derived project extent boundaries.

The module syncs its active section with the browser route. Section cards and tabs update the URL.

## Live Behavior

- Live layers are derived from GPS-tagged submissions and entity records.
- Facility-style entity types are classified into Facility Maps instead of Beneficiary Maps.
- Project Maps, Coverage Maps, Layers, and Boundaries expose source-record tables.
- Map Layers and Boundaries let users select GeoJSON, JSON, KML, CSV, or zipped GIS files and register them as pending records for processing and governance review.
- Data Quality Maps keeps source feature IDs so users can inspect the exact GPS point behind each issue.
- Indicator Maps uses active indicators and GPS-derived project extents.
- Exports use the current filtered view and include masked coordinates, accuracy, quality score, sensitivity, and popup details.

## Boundaries

- Mapping visualizes and validates spatial evidence.
- Data Quality owns issue resolution workflows.
- Forms owns GPS question settings and geofence requirements.
- Reports owns static map snapshots inside formal outputs.
