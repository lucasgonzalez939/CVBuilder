# Coding Standards

## Core principles

- Preserve vanilla deployment compatibility.
- Prefer clarity over cleverness.
- Keep modules focused and small.
- Avoid duplicate business logic across runtime and scripts.

## File organization

- Keep `index.html` as a shell only.
- Keep styles in `styles/`.
- Keep browser app logic in `src/`.
- Keep Node scripts in `scripts/`.

## JavaScript conventions

- Use `const` by default; use `let` only when reassignment is necessary.
- Keep pure utilities side-effect free.
- Isolate browser side effects (DOM, localStorage, dynamic script loading) in service-style functions.
- Normalize user input at boundaries (file import, form ingestion).

## State and rendering

- Use a single source of truth for schema defaults.
- Avoid mutating nested state directly; copy and update immutably.
- Keep render blocks readable by extracting repeated sections into functions or components.

## Error handling

- Catch and log recoverable failures with actionable messages.
- Show user-facing messages for import/export and storage failures.
- Prefer graceful fallback behavior (for example, PDF image export fallback).

## Documentation rules

- When adding new sections to CV data, update:
  - schema defaults
  - normalizer logic
  - import validation script
  - README schema notes
- Keep docs aligned with actual file paths and runtime behavior.

## Quality checks before merge

- Validate import samples: `node scripts/validate-import-samples.js`
- Manually verify:
  - language switch isolation (`en` and `es`)
  - export/import JSON round trip
  - profile image upload/remove
  - text PDF export and fallback export
