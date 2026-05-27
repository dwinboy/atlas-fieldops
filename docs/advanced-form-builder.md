# Advanced Enterprise Form Builder

## Builder Capabilities

The form builder now supports the core architecture needed for KoboToolbox-style field collection:

- Rich field catalog for text, numeric, choice, GPS, media, signature, barcode, calculated, repeat group, and grid fields.
- Drag-and-drop field reordering with keyboard sensor support.
- Inline field selection with a properties rail for labels, types, required rules, and validation editing.
- Plain-English rule guidance for visibility, required-if, validation, and calculated expressions.
- Offline readiness checks that keep mobile capture behavior clear to non-technical administrators.
- Version controls for draft creation and immutable published active versions.
- Live mobile preview for future React Native rendering parity.

## Schema Direction

The frontend exports a mobile-compatible schema via `toMobileSchema`. The backend accepts compatible schema payloads through `POST /api/v1/forms`.
The product is English-only, so titles and labels are stored as plain English strings rather than multilingual dictionaries.

Key schema concepts:

- `sections`: page or section-level grouping.
- `fields`: typed collection controls.
- `language`: fixed to `en` for mobile sync metadata.
- `validation`: constraints such as min/max and GPS accuracy.
- `logic`: XLSForm-style metadata for visibility, required-if, calculations, defaults, and validations.
- `children`: repeat-group nested field definitions.

## Backend Form Engine

`FormEngine` provides the first executable validation layer:

- Schema validation for duplicate field IDs and invalid choice/calculated/GPS definitions.
- Submission validation for required answers, numeric bounds, and GPS accuracy.
- A small XLSForm-style relevance evaluator supporting `${field} = 'value'` and `${field} != 'value'`.

This layer is intentionally conservative and offline-safe so the same rule subset can be mirrored in the future mobile app.
