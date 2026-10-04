# CV Version Management Plan

## Goal

Turn the current single-CV editor into a project-based curriculum system that supports:

- one master CV with the full, complete career history
- multiple tailored versions derived from that master
- per-version focus modes and hidden content rules
- tabs / file navigation for easy switching between versions
- full project export/import for portability and backup

The result should keep the project static and vanilla-first while making it modular and scalable enough for real job tailoring.

A key requirement is that version-specific discoveries are not lost. If the user adds a skill, project, achievement, section, or custom fact while tailoring a version, the system must allow that addition to be promoted back into the master CV while preserving the original tailoring context.

---

## Product concept

The user should be able to manage a bundle called a CV project.

A project contains:

- a master curriculum (the complete raw source of truth)
- a set of versions (tailored resumes for specific roles or job families)
- version settings for focus, filters, and visibility
- one active version used for editing and PDF export

This lets the user keep everything in one place without duplicating the entire CV manually for each application.

---

## Core data model

### 1. Master CV

The master CV is the full dataset, including everything the user wants to preserve as a complete record.

Example sections:

- personalInfo
- summary
- experiences
- education
- skills
- projects
- awards
- customSections

The master should remain unfiltered and complete.

### 2. CV versions

Each version is a derived view over the master data.

Example structure:

```json
{
  "id": "version_frontend_2026",
  "name": "Frontend Engineer",
  "slug": "frontend-engineer",
  "createdAt": "2026-10-04T00:00:00.000Z",
  "updatedAt": "2026-10-04T00:00:00.000Z",
  "isDefault": true,
  "focus": {
    "primary": "frontend",
    "secondary": ["product", "design systems"],
    "industry": "saas"
  },
  "visibility": {
    "sections": {
      "summary": true,
      "experience": true,
      "skills": true,
      "projects": true,
      "education": false,
      "awards": false,
      "customSections": true
    },
    "experienceIds": ["exp_1", "exp_3", "exp_7"],
    "projectIds": ["proj_2", "proj_5"],
    "skillKeys": ["frontend", "leadership"],
    "hiddenSkillItems": ["legacy-php"],
    "hiddenCustomSectionIds": ["custom_9"]
  },
  "order": {
    "experienceOrder": ["exp_3", "exp_1", "exp_7"],
    "projectOrder": ["proj_5", "proj_2"]
  },
  "localAdditions": {
    "skills": [
      { "id": "skill_local_1", "label": "React Native", "source": "version", "status": "pending_sync" }
    ],
    "customSections": [
      { "id": "section_local_7", "title": "Product Metrics", "items": ["A/B testing", "KPI tracking"], "source": "version", "status": "pending_sync" }
    ]
  },
  "localeOverrides": {
    "en": {
      "summary": "Senior frontend engineer..."
    },
    "es": {
      "summary": "Ingeniero frontend..."
    }
  }
}
```

### 3. Project bundle

The whole app state should be stored as a single project object.

```json
{
  "meta": {
    "schemaVersion": 3,
    "projectVersion": 1,
    "exportedAt": "2026-10-04T00:00:00.000Z"
  },
  "project": {
    "id": "cv-project-xyz",
    "name": "Main CV Project",
    "masterCv": { ... },
    "versions": [ ... ],
    "activeVersionId": "version_frontend_2026",
    "defaultLocale": "en"
  }
}
```

This makes file-based import/export simple and keeps all resume versions together without splitting them into unrelated files.

---

## Version behavior

### Focus filtering

Each version can define what matters for that target role.

Examples:

- product engineer version: hide internal operations work and focus on platform + product impact
- frontend version: keep frontend and design-system work, hide backend-heavy roles
- leadership version: hide junior responsibilities, emphasize management and strategy

### Visibility controls

Per version, the app should allow:

- hide entire sections
- hide individual items inside sections
- prioritize certain skills and demote others
- reorder visible experiences/projects by importance
- show only selected capabilities based on tags or categories

### Derived view logic

The app should not mutate the master CV when tailoring a version.

Instead, the version should compute a `derivedView` from the master:

- keep master data as canonical source
- apply visibility and ordering rules
- generate preview data for the active version only
- merge in version-local additions that are still pending sync

This avoids data loss and keeps the master reusable.

### Version-local additions and sync back to master

This is a required capability.

A version can include data that is not yet present in the master CV, such as:

- a skill discovered while tailoring a specific role
- a custom section created for a focused application
- a project or achievement relevant to a new opportunity
- new professional wording, tags, or notes

Model rules:

- version-local additions are stored under `localAdditions` for that version
- the UI should clearly mark entries as `draft`, `pending_sync`, or `synced`
- when the user chooses `Add to master`, the item is promoted into the master CV
- promoted items should remain visible in the version and be removed from the pending sync queue
- if a version-local item conflicts with an existing master item, the user should be prompted to merge or keep both

Example sync flow:

1. User adds `React Native` to a `Frontend Engineer` version
2. Item is saved under the version only
3. User clicks `Add to master`
4. System checks if `React Native` already exists in master skills
5. If not, it is appended to master skill groups
6. The item is marked as synced and remains available to future versions

This allows version-local creativity without losing the system’s single master-of-truth principle.

---

## UI design proposal

### A. File / version navigation bar

Add a top or left navigation surface with:

- project name
- version tabs or files
- `+ New version` action
- `Duplicate` action
- `Rename` action
- `Delete` action
- `Export project` / `Import project`

UI pattern ideas:

- tabs across the top for active versions
- file-like cards in a sidebar
- active tab highlighted and pinned

### B. Master / version context

The app should clearly distinguish between:

- `Master CV` as the full edit workspace
- `Version view` as a filtered tailored copy

Possible actions:

- `Edit master`
- `Edit current version`
- `Switch to master`
- `Duplicate current version`

### C. Tailoring controls

For the active version, show a tailored panel with sections like:

- Focus themes
- Visible sections
- Included work experiences
- Included projects
- Included skills
- Hidden entries
- Reordering controls
- Version-local additions
- Pending sync items

This panel should be compact and not overwhelm the editing UI.

### D. Add-to-master actions

Every version-specific editable item should support actions such as:

- `Add to master`
- `Keep version-only`
- `Merge into existing master item`
- `Discard draft`

For example, a version skill row can be added to the master once it proves useful in multiple tailored CVs.

---

## Editing model

### Master-first editing

The master CV should be the default editing surface, because it is the canonical truth.

Version editing should be controlled by a filtering layer, not by separate full data duplication.

### Version-specific overrides

Some fields may need to differ per version without modifying the master. Examples:

- summary paragraph tailored to the role
- custom supporting bullets for the application
- selected skills list
- reduced responsibilities under a role

These should be stored as version-level overrides rather than creating separate copies of all data.

### Rules for override precedence

Use a clear precedence structure:

1. version override
2. version-local addition pending sync
3. version filtering / visibility
4. master CV source value

This keeps logic predictable while still allowing users to experiment with new information in a version before pushing it upstream.

---

## Recommended project architecture changes

### New modules

Add a dedicated project/version model layer, for example:

- `src/project-service.js`
- `src/version-service.js`
- `src/version-ui.js` or `src/version-manager.js`

Responsibilities:

- create project bundle
- create version
- duplicate version
- rename/delete version
- compute derived preview from master + filters
- handle version-local additions and pending sync state
- promote version-local entries to the master CV
- export/import project bundle
- persist in localStorage

### Data helpers

Add shared helpers for:

- `buildDefaultProject()`
- `duplicateVersion(version)`
- `getDerivedVersionData(masterCv, versionConfig)`
- `addVersionLocalItem(version, sectionKey, item)`
- `syncVersionLocalItemToMaster(project, versionId, sectionKey, itemId)`
- `isSectionVisible(version, sectionKey)`
- `filterExperienceList(masterExperiences, version)`
- `filterSkillGroups(masterSkills, version)`
- `sortItemsByPriority(list, itemOrder)`

---

## Export and import design

### Full project export

Export a single file containing:

- master CV
- all versions
- active version id
- locale info
- version settings
- metadata

This allows the user to back up or share a full working set rather than just one resume version.

### Project import

Import should support:

- existing single-CV payloads
- legacy schema payloads
- project bundles from newer versions

If a project bundle is missing versions, the importer should auto-create a default version from the master CV.

### Import compatibility

Suggested compatibility rules:

- legacy file => create master CV + default version
- project file with versions => load as-is
- mixed or partial data => normalize + warn

---

## Persistence strategy

Keep the current browser local storage model, but expand it to store the full project state.

Proposed storage keys:

- `cvbuilder.project.current`
- `cvbuilder.project.history`
- `cvbuilder.project.backups`

For the first iteration, a single active project is enough.

Future enhancements can add:

- project list management
- multi-project browser storage
- autosave snapshots
- restore previous versions

---

## PDF export behavior for versioned CVs

Each version should be exportable independently.

Rules:

- export the currently active version
- if needed, allow export of master CV
- exported PDF file name should include version slug
- each version can have its own tailored focus presentation

For example:

- `frontend-engineer_cv_en.pdf`
- `product-manager_cv_en.pdf`
- `master_cv_full_en.pdf`

---

## Phased implementation plan

### Phase 1 — data foundation

Goals:

- introduce project and version models
- keep master CV intact
- store default version logic
- add localStorage wrappers for project bundles

Deliverables:

- project schema definition
- project/service hooks
- migration support for legacy data

### Phase 2 — version manager UI

Goals:

- add version tabs/file navigation
- create rename/duplicate/delete actions
- switch active version
- show current selected version clearly

Deliverables:

- version nav component
- UI for adding and editing version metadata
- default selected version behavior

### Phase 3 — tailoring rules and derived views

Goals:

- section visibility toggles
- hide individual experiences/projects/skills
- reorder visible items
- filter by role/focus tags

Deliverables:

- version filter engine
- derived view builder
- preview state updates with no mutation of master data

### Phase 4 — PDF export and editing UX

Goals:

- export active version PDF
- export master PDF
- ensure tailored view is reflected in generated output
- include version name in file naming

Deliverables:

- version-aware export API
- version label in export metadata

### Phase 5 — project import/export

Goals:

- export whole project bundle
- import full project bundle
- support compatibility migration

Deliverables:

- full project archive format
- import validator and warnings

### Phase 6 — polish and advanced features

Optional future enhancements:

- compare mode between versions
- shareable JSON preview
- quick templates for common role types
- AI-assisted matching hints
- project duplication and template versions

---

## Acceptance criteria

The feature is successful when the user can:

- create a master CV with all career information
- generate multiple role-specific versions from that master
- hide irrelevant sections, experiences, and skills per version
- switch between versions using a tab or file-style navigation system
- export/import the entire project as one file
- persist all version state in browser storage without manual duplication
- generate a PDF from the active version without affecting the master curriculum

---

## Recommended first iteration scope

To keep it manageable, the first release should include:

- master CV + default version model
- version tabs and rename/duplicate actions
- hide/show sections per version
- hide individual experiences, projects, and skills
- export/import the whole project bundle
- version-aware PDF export

This gives the user the major workflow improvement without overcomplicating the architecture in the first pass.

---

## Implementation note for this repo

This project already has the right direction for a static, modular architecture:

- shared schema
- shared normalizer logic
- dedicated services
- browser-only persistence
- no bundler requirement

The version-management feature should follow that pattern and be implemented as a set of small service modules rather than piling all logic into `app.js`.
