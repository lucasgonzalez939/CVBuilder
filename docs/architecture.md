# Architecture

## Runtime model

- Deployment is static and vanilla-friendly.
- `index.html` is the shell entrypoint.
- Styling is loaded from external CSS files.
- Static configuration and defaults live in `src/constants.js`.
- Shared schema contract lives in `src/schema.js`.
- Shared normalization/migration logic lives in `src/normalizers.js`.
- Shared image processing logic lives in `src/image-service.js`.
- Shared PDF export logic lives in `src/pdf-service.js`.
- Shared import/export file handling lives in `src/import-export-service.js`.
- Shared local storage persistence lives in `src/storage-service.js`.
- Application logic lives in `src/app.js` and is loaded externally.
- React is consumed from CDN UMD scripts.
- Babel standalone is used at runtime for JSX transpilation (no local build step).

## Layer boundaries

- Shell: `index.html`
  - Loads CDN dependencies.
  - Loads CSS and app entry script.
  - Contains only root mount node.
- Presentation styles: `styles/`
  - CV preview and UI helper classes.
  - No JavaScript logic in CSS comments.
- App logic: `src/app.js`
  - State, event handlers, import/export orchestration, and render tree.
- Constants: `src/constants.js`
  - Translations, schema version, templates, and initial sample data.
- Schema: `src/schema.js`
  - Current schema version, empty locale template, and locale section contract.
  - Skill categories are intentionally dynamic keys under `skills`.
  - Additional resume sections are supported through dynamic `customSections`.
- Normalizers: `src/normalizers.js`
  - Import payload normalization and migration warning generation.
- Image Service: `src/image-service.js`
  - Profile image file read, square crop, and normalized image payload generation.
- PDF Service: `src/pdf-service.js`
  - Text-based PDF generation, image fallback export, and export URL/file-name helpers.
- Import/Export Service: `src/import-export-service.js`
  - CV data file serialization, download, read/parse, and normalized import reporting.
- Storage Service: `src/storage-service.js`
  - Persist and restore CV session state from browser local storage.
- Tooling scripts: `scripts/`
  - Node-only data validation and migration checks.

## Current constraints

- Keep deployment independent from bundlers and platform-specific toolchains.
- Minimize moving parts: static host + CDN libraries + local source files.
- Prefer extraction into small modules over introducing framework tooling.

## Next extraction targets

1. Move schema/normalization functions from `src/app.js` into `src/state/normalizers.js`.
2. Move PDF export logic into `src/services/pdf.js`.
3. Move import/export and localStorage logic into dedicated service files.
4. Split large JSX blocks into section components under `src/ui/`.

## Dependency policy

- New dependencies must be browser-CDN compatible or plain JavaScript.
- Add dependencies only when the code reduction or reliability gain is clear.
- Avoid dependencies that require a build step for basic usage.
