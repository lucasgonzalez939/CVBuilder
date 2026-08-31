# CVBuilder
A simple cv/resume building webpage. It allows you to put your data and get a pdf version of your resume, simple and clean. You can make a spanish and english version of it and also export/import the data to continue later. No data is stored anywhere, everything happens locally.
It's a project I had on my mind for over a year or two, now I got to make it cause I need it. Expect and embrace errors, bad code and practices and even ugly bugs, it's real, not perfect, hope it comes in handy to someone.

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
				"programmingLanguages": [],
				"frameworks": [],
				"databases": [],
				"tools": [],
				"cloudPlatforms": []
			},
			"projects": [],
			"awards": []
		},
		"es": {
			"personalInfo": {},
			"summary": "",
			"experiences": [],
			"education": [],
			"skills": {},
			"projects": [],
			"awards": []
		}
	}
}
```

### Notes

- New skill categories are parsed dynamically from incoming JSON keys.
- Legacy files (without `meta`/`data`) still import through normalization.
- Single-locale payloads are mapped to `en` and `es` is reset to defaults.

## Import migration validation script

Sample payloads are included in `sample-imports/`.

Run:

```bash
node scripts/validate-import-samples.js
```

This script prints:

- normalization warnings
- detected skill categories after normalization
- compatibility behavior for legacy and mixed-shape payloads
