# CVBuilder Modularization Plan

## Goals

- Separate concerns: HTML shell, CSS styles, JavaScript logic, and documentation.
- Replace single-file inline script/style architecture with maintainable modules.
- Keep current behavior (bilingual editing, import/export, PDF generation, image handling).
- Create a structure that supports future migration to a build system without forcing one now.

## Current Architecture Snapshot

- One large HTML file holds app markup, styles, and all React logic.
- Runtime JSX compilation is done in the browser using Babel.
- Utility logic is duplicated between browser app and Node validation script.
- Third-party scripts are injected dynamically from inside component logic.

## Target Structure (No Bundler, ES Modules)

```
CVBuilder/
  index.html
  styles/
    app.css
    cv-preview.css
  src/
    main.js
    App.js
    constants/
      translations.js
      defaults.js
      schema.js
    state/
      cvStore.js
      normalizers.js
    services/
      localStorageService.js
      importExportService.js
      imageService.js
      pdf/
        textPdfService.js
        imagePdfService.js
        pdfLoader.js
    ui/
      components/
        MessageModal.js
        ConfirmModal.js
      sections/
        PersonalInfoSection.js
        SummarySection.js
        ExperienceSection.js
        EducationSection.js
        SkillsSection.js
        ProjectsSection.js
        AwardsSection.js
        CvPreviewSection.js
    utils/
      text.js
      links.js
      ids.js
  scripts/
    validate-import-samples.js
  docs/
    architecture.md
    coding-standards.md
    data-schema.md
    modularization-plan.md
```

## Recommended Phases

### Phase 1: Safe Extraction (No Behavior Changes)

- Move inline CSS to `styles/app.css` and `styles/cv-preview.css`.
- Replace inline `text/babel` script with `src/main.js` loaded as module.
- Keep React UMD for now, but stop runtime Babel usage by converting JSX usage strategy:
  - Option A: keep JSX and introduce a lightweight build step.
  - Option B: no build step, rewrite to `React.createElement` (not recommended for maintainability).
- Extract constants (`translations`, schema version, empty templates) into `src/constants/*`.

Deliverable:
- `index.html` becomes a small shell with root div, CSS links, and module entry.

### Phase 2: Logic Decomposition

- Move data normalization and coercion logic into `src/state/normalizers.js`.
- Move import/export flow into `src/services/importExportService.js`.
- Move localStorage read/write into `src/services/localStorageService.js`.
- Move image crop/canvas logic into `src/services/imageService.js`.
- Move PDF routines into `src/services/pdf/*` with strict boundaries:
  - `textPdfService.js` for text export only.
  - `imagePdfService.js` for html2pdf fallback.
  - `pdfLoader.js` for dynamic library loading.

Deliverable:
- `App.js` orchestrates state and UI, delegates business logic to services.

### Phase 3: UI Componentization

- Split large JSX render blocks into focused components:
  - shared controls/modals
  - each form section in `ui/sections`
  - preview section isolated from editor section
- Keep state in `App` first; pass props down.
- Introduce a single hook (`useCvData`) after sections are stable.

Deliverable:
- `App.js` under ~250 lines with only composition and handlers.

### Phase 4: Shared Schema Contract

- Share normalization/schema code between browser app and Node validator.
- Extract common schema module under `src/state/normalizers.js` and reuse it from `scripts/validate-import-samples.js`.
- Ensure one `CURRENT_SCHEMA_VERSION` source of truth.

Deliverable:
- No duplicated schema or normalizer logic across runtime and scripts.

### Phase 5: Documentation and Maintenance Guardrails

- Add `docs/architecture.md` with module dependency diagram.
- Add `docs/coding-standards.md` with conventions:
  - file size limits
  - function purity preferences
  - naming conventions
  - error handling and user messages
- Add `docs/data-schema.md` with locale payload contract and migration behavior.
- Expand README with:
  - project structure
  - how to run validation script
  - how to test import/export behavior manually

Deliverable:
- New contributors can locate logic quickly and change behavior safely.

## Coupling To Remove First

1. Inline script and JSX in `index.html`.
2. Inline style block in `index.html`.
3. PDF export logic embedded in `App` component.
4. Normalization logic duplicated between app and script.

## Design Rules For Maintainability

- Keep modules focused and under ~200 lines where practical.
- Keep pure data transforms in `state/` and `utils/`; side effects in `services/`.
- UI components should not call browser APIs directly.
- Dynamic script loading should be centralized in loader services.
- Do not let sections mutate global state shape; use typed update helpers.

## Suggested Quality Gates

- Manual regression checklist after each phase:
  - locale switch preserves both locale datasets
  - import legacy and v2 JSON samples
  - export JSON and re-import round trip
  - text PDF export works and fallback triggers on failure
  - profile image upload/crop/remove works
- Add lightweight automated checks later:
  - schema normalizer unit tests
  - import migration fixtures based on `sample-imports/`

## Migration Sequence (Practical Order)

1. Extract constants and normalizers.
2. Extract services (storage, import/export, image, pdf).
3. Split UI sections.
4. Move styles.
5. Remove Babel runtime dependency by introducing a build step.
6. Finalize docs and README updates.

## Risks and Mitigations

- Risk: behavior regressions while splitting handlers.
  - Mitigation: move code in small slices and run manual regression list each slice.
- Risk: broken PDF output after extraction.
  - Mitigation: keep text and image exporters as independent services with stable interfaces.
- Risk: schema drift between app and script.
  - Mitigation: one shared normalizer module and one schema version constant.

## Definition of Done

- `index.html` has no inline JS or CSS.
- App logic is split into constants, state, services, and UI modules.
- Validation script reuses shared schema/normalizer code.
- Documentation exists for architecture, schema, and coding standards.
- Regression checklist passes for import/export, locale behavior, preview, and PDF outputs.
