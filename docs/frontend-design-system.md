# Frontend Design System

## Principles

- Neutral-first interface with restrained teal accent for primary actions and live status.
- Dense but readable operational layouts.
- Borders over heavy shadows; elevation is reserved for overlays and notifications.
- Components must support keyboard navigation, visible focus, dark mode, and reduced motion.

## Tokens

Design tokens live in `frontend/app/globals.css` as CSS variables and are consumed through
`frontend/tailwind.config.ts`.

- `--background`, `--foreground`, `--panel`, `--muted`, `--border`, `--input`, `--ring`
- `--primary`, `--accent`, `--success`, `--warning`, `--danger`
- `shadow-line` for hairline containment
- `shadow-elevated` for modal/toast surfaces only

## Components

- `components/ui/button.tsx`: shadcn-style button variants and sizes.
- `components/ui/input.tsx`: input, select, and textarea primitives.
- `components/ui/badge.tsx`: status and metadata labels.
- `components/ui/modal.tsx`: Radix dialog wrapper.
- `components/CommandPalette.tsx`: keyboard command surface.
- `components/DataTable.tsx`: dense searchable table shell.
- `components/NotificationCenter.tsx`: motion-backed toast stack.
- `components/ActivityTimeline.tsx`: audit and workflow activity surface.

## Interaction Rules

- Global command palette opens with Cmd/Ctrl+K.
- Motion is limited to short opacity/position changes under 200ms.
- Screen transitions use `AnimatePresence` with small vertical movement.
- Focus states use tokenized ring color and must remain visible in light and dark mode.

