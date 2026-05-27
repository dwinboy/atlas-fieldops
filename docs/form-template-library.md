# Form Template Library

The form template library gives organization admins a fast, safe way to start field data collection without building every form from scratch.

## User Workflow

1. Open **Templates**.
2. Search or filter by sector.
3. Preview the mobile-friendly form structure.
4. Click **Use** to copy the template into the organization form builder.
5. Make small edits, preview, and publish.

The experience is English-only, beginner-friendly, and designed for teams with limited training time.

## Built-In Categories

- Agriculture
- Health
- Education
- Humanitarian & NGO
- Monitoring & Evaluation
- Government & Community
- Business & Operations

Templates include GPS fields, validation rules, conditional logic, repeat groups where useful, and offline-compatible schema metadata.

## Backend Endpoints

- `GET /api/v1/forms/templates`
- `GET /api/v1/forms/templates/recommended`
- `GET /api/v1/forms/templates/{template_id}`
- `POST /api/v1/forms/templates/{template_id}/duplicate`

Duplicating a template creates a tenant-owned `data_forms` record with a versioned schema, records usage analytics, appends an audit log, and emits a Kafka event.

## Data Model

The database now supports:

- reusable template metadata
- versioned template schemas
- built-in and future organization-specific templates
- usage analytics
- future AI-generated template metadata

The current catalog is implemented as built-in production seed data so local development works immediately. The model supports promoting these templates into database-managed records later without API changes.

## Mobile And Offline Compatibility

Templates are validated through the same `FormSchema` contract as normal forms. The supported field list includes operational collection fields such as GPS, photos, signatures, repeat groups, date/time fields, calculated fields, and file/audio/video capture.
