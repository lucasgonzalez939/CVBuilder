# Data Schema

## Version

- Current schema version: `2`

## Export payload shape

```json
{
  "meta": {
    "schemaVersion": 2,
    "exportedAt": "ISO-8601 timestamp"
  },
  "data": {
    "en": { "...localeData" },
    "es": { "...localeData" }
  }
}
```

## localeData shape

```json
{
  "personalInfo": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "linkedin": "",
    "github": "",
    "website": "",
    "address": "",
    "profilePicture": "",
    "profileFrameColor": "#bfdbfe",
    "profilePictureWidth": null,
    "profilePictureHeight": null
  },
  "summary": "",
  "experiences": [],
  "education": [],
  "skills": {
    "<customCategoryKey>": []
  },
  "projects": [],
  "awards": [],
  "customSections": [
    {
      "id": 1,
      "title": "",
      "items": []
    }
  ]
}
```

## Compatibility behavior

- If payload contains `meta` but missing `data`, import uses fallback parsing.
- If payload resembles a single locale object, data is mapped to `en` and `es` is reset to defaults.
- Skill categories are fully dynamic and preserved from imported JSON keys.
- Top-level custom sections are supported through `customSections`.
- Non-array sections (`experiences`, `education`, `projects`, `awards`) are reset.
- `customSections` is normalized to an array of `{ id, title, items[] }`.
- Invalid or non-string text fields are normalized to safe strings.

## Migration rules

- Keep `CURRENT_SCHEMA_VERSION` in sync across app and validation script.
- Any schema change must update:
  - runtime normalizer
  - sample imports where needed
  - validation script checks
  - this document
