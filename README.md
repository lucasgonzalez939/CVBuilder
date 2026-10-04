# CVBuilder
A simple cv/resume building webpage. It allows you to put your data and get a pdf version of your resume, simple and clean. You can make a spanish and english version of it and also export/import the data to continue later. No data is stored anywhere, everything happens locally.
It's a project I had on my mind for over a year or two, now I got to make it cause I need it. Expect and embrace errors, bad code and practices and even ugly bugs, it's real, not perfect, hope it comes in handy to someone.

## Vanilla-first architecture

This project is intentionally kept deployment-friendly and independent from build tooling:

- static `index.html` shell
- external CSS in `styles/`
- external app logic in `src/app.js`
- CDN-loaded React and Babel runtime

Open `index.html` in a browser to run it.

## Project structure

```text
CVBuilder/
	index.html
	src/
		schema.js
		normalizers.js
		image-service.js
		pdf-service.js
		import-export-service.js
		storage-service.js
		constants.js
		app.js
	styles/
		app.css
	sample-imports/
	scripts/
		validate-import-samples.js
	docs/
		architecture.md
		coding-standards.md
		modularization-plan.md
```

## JSON import/export schema (v2)

Exports now include metadata and data payload wrapper:

```json
{
	"meta": {
		"schemaVersion": 2,
		"exportedAt": "2026-08-30T00:00:00.000Z"
	},
	"data": {
		"en": {
			"personalInfo": {},
			"summary": "",
			"experiences": [],
			"education": [],
			"skills": {
				"customCategoryKey": []
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
		},
		"es": {
			"personalInfo": {},
			"summary": "",
			"experiences": [],
			"education": [],
			"skills": {
				"customCategoryKey": []
			},
			"projects": [],
			"awards": [],
			"customSections": []
		}
	}
}
```

### Notes

- Skill categories are parsed dynamically from incoming JSON keys.
- Top-level custom sections are supported through `customSections`.
- Legacy files (without `meta`/`data`) still import through normalization.
- Single-locale payloads are mapped to `en` and `es` is reset to defaults.

## Import migration validation script

Sample payloads are included in `sample-imports/`.

Run:

```bash
node scripts/validate-import-samples.js
```

If `node` is not installed in your system, install Node.js first or run the script in an environment that already provides it.

This script prints:

- normalization warnings
- detected skill categories after normalization
- compatibility behavior for legacy and mixed-shape payloads
