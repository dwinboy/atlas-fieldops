# Data Interoperability

The platform now includes an enterprise data management layer for imports, exports, spreadsheet-style editing, mapping, validation, and migration workflows.

## Supported Workflows

- Upload beneficiary, submission, indicator, project, case, field officer, media, geospatial, and historical migration datasets.
- Preview uploaded columns and automatically suggest field mappings.
- Validate sample rows before import with row-level issues and suggested fixes.
- Save reusable mapping templates for repeated imports.
- Track import jobs with row counts, duplicate counts, error counts, and rollback availability.
- Create export jobs for CSV, XLSX, PDF, JSON, and GeoJSON.
- Stage bulk edit batches with conflict review and undo support.

## Backend API

All endpoints are under `/api/v1/operations/data`:

- `POST /imports/preview`
- `GET|POST /imports`
- `POST /mapping-templates`
- `GET|POST /exports`
- `POST /bulk-edits`

The API is tenant-scoped and protected by `data:import`, `data:export`, and `data:bulk_edit` permissions.

## Validation

The first validation layer checks:

- Missing required IDs and names.
- Duplicate rows inside an upload.
- Invalid GPS coordinates.
- Suspiciously short phone numbers.
- Unsupported dataset types and file formats.

The design is intentionally conservative so users can fix data before it touches production records.
