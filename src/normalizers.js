(function (root, factory) {
    const api = factory(root && root.CVSchema);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVNormalizers = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (schemaFromGlobal) {
    let schema = schemaFromGlobal;

    if ((!schema || !schema.createEmptyLocaleData) && typeof require === 'function') {
        schema = require('./schema');
    }

    if (!schema || !schema.createEmptyLocaleData) {
        throw new Error('CV schema module is not available.');
    }

    const {
        CURRENT_SCHEMA_VERSION,
        emptyCvDataTemplate,
        localeSectionKeys,
        createEmptyLocaleData,
    } = schema;

    const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

    const toStringSafe = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        return '';
    };

    const coerceToStringArray = (value) => {
        if (Array.isArray(value)) {
            return value
                .map(item => toStringSafe(item).trim())
                .filter(Boolean);
        }

        if (typeof value === 'string') {
            return value
                .split(/\n|,/) 
                .map(item => item.trim())
                .filter(Boolean);
        }

        if (isObject(value)) {
            if (Array.isArray(value.items)) {
                return coerceToStringArray(value.items);
            }
            if (Array.isArray(value.list)) {
                return coerceToStringArray(value.list);
            }
            if (Array.isArray(value.values)) {
                return coerceToStringArray(value.values);
            }
            return Object.values(value)
                .flatMap(item => coerceToStringArray(item))
                .filter(Boolean);
        }

        return [];
    };

    const normalizePersonalInfo = (personalInfoInput) => {
        const merged = {
            ...emptyCvDataTemplate.personalInfo,
            ...(isObject(personalInfoInput) ? personalInfoInput : {}),
        };

        const width = Number(merged.profilePictureWidth);
        const height = Number(merged.profilePictureHeight);

        const frameColor = toStringSafe(merged.profileFrameColor).trim();

        return {
            ...merged,
            name: toStringSafe(merged.name),
            title: toStringSafe(merged.title),
            email: toStringSafe(merged.email),
            phone: toStringSafe(merged.phone),
            linkedin: toStringSafe(merged.linkedin),
            github: toStringSafe(merged.github),
            website: toStringSafe(merged.website),
            address: toStringSafe(merged.address),
            profilePicture: toStringSafe(merged.profilePicture),
            profileFrameColor: /^#([0-9a-fA-F]{6})$/.test(frameColor) ? frameColor : emptyCvDataTemplate.personalInfo.profileFrameColor,
            profilePictureWidth: Number.isFinite(width) ? width : null,
            profilePictureHeight: Number.isFinite(height) ? height : null,
        };
    };

    const normalizeExperiences = (experiencesInput) => {
        if (!Array.isArray(experiencesInput)) {
            return [];
        }

        return experiencesInput.map((item, index) => {
            const source = isObject(item) ? item : {};
            const description = coerceToStringArray(source.description);
            return {
                ...source,
                id: Number.isFinite(Number(source.id)) ? Number(source.id) : index + 1,
                title: toStringSafe(source.title),
                company: toStringSafe(source.company),
                location: toStringSafe(source.location),
                startDate: toStringSafe(source.startDate),
                endDate: toStringSafe(source.endDate),
                description: description.length > 0 ? description : [''],
            };
        });
    };

    const normalizeEducation = (educationInput) => {
        if (!Array.isArray(educationInput)) {
            return [];
        }

        return educationInput.map((item, index) => {
            const source = isObject(item) ? item : {};
            return {
                ...source,
                id: Number.isFinite(Number(source.id)) ? Number(source.id) : index + 1,
                degree: toStringSafe(source.degree),
                university: toStringSafe(source.university),
                location: toStringSafe(source.location),
                year: toStringSafe(source.year),
                details: toStringSafe(source.details),
            };
        });
    };

    const normalizeProjects = (projectsInput) => {
        if (!Array.isArray(projectsInput)) {
            return [];
        }

        return projectsInput.map((item, index) => {
            const source = isObject(item) ? item : {};
            return {
                ...source,
                id: Number.isFinite(Number(source.id)) ? Number(source.id) : index + 1,
                name: toStringSafe(source.name),
                technologies: toStringSafe(source.technologies),
                description: toStringSafe(source.description),
                link: toStringSafe(source.link),
            };
        });
    };

    const normalizeAwards = (awardsInput) => {
        if (!Array.isArray(awardsInput)) {
            return [];
        }

        return awardsInput.map((item, index) => {
            const source = isObject(item) ? item : {};
            return {
                ...source,
                id: Number.isFinite(Number(source.id)) ? Number(source.id) : index + 1,
                name: toStringSafe(source.name),
                year: toStringSafe(source.year),
                description: toStringSafe(source.description),
            };
        });
    };

    const normalizeCustomSections = (sectionsInput) => {
        if (!Array.isArray(sectionsInput)) {
            return [];
        }

        return sectionsInput.map((section, index) => {
            const source = isObject(section) ? section : {};
            return {
                ...source,
                id: Number.isFinite(Number(source.id)) ? Number(source.id) : index + 1,
                title: toStringSafe(source.title),
                items: coerceToStringArray(source.items),
            };
        });
    };

    const normalizeSkills = (skillsInput) => {
        const normalizedSkills = { ...createEmptyLocaleData().skills };

        if (!isObject(skillsInput)) {
            return normalizedSkills;
        }

        Object.entries(skillsInput).forEach(([category, value]) => {
            normalizedSkills[category] = coerceToStringArray(value);
        });

        return normalizedSkills;
    };

    const looksLikeLocaleData = (value) => {
        if (!isObject(value)) {
            return false;
        }

        return localeSectionKeys.some(section => Object.prototype.hasOwnProperty.call(value, section));
    };

    const normalizeLocaleData = (localeInput) => {
        const source = isObject(localeInput) ? localeInput : {};
        const emptyLocale = createEmptyLocaleData();

        return {
            ...emptyLocale,
            ...source,
            personalInfo: normalizePersonalInfo(source.personalInfo),
            summary: toStringSafe(source.summary),
            experiences: normalizeExperiences(source.experiences),
            education: normalizeEducation(source.education),
            skills: normalizeSkills(source.skills),
            projects: normalizeProjects(source.projects),
            awards: normalizeAwards(source.awards),
            customSections: normalizeCustomSections(source.customSections),
        };
    };

    const getLocaleShapeWarnings = (localeKey, localeData) => {
        const warnings = [];

        if (!isObject(localeData)) {
            warnings.push(`${localeKey}: missing locale object, defaults were used.`);
            return warnings;
        }

        if (localeData.summary !== undefined && typeof localeData.summary !== 'string') {
            warnings.push(`${localeKey}.summary was not a string and was normalized.`);
        }

        const expectedArraySections = ['experiences', 'education', 'projects', 'awards', 'customSections'];
        expectedArraySections.forEach((section) => {
            if (localeData[section] !== undefined && !Array.isArray(localeData[section])) {
                warnings.push(`${localeKey}.${section} was not an array and was reset.`);
            }
        });

        if (localeData.skills !== undefined && !isObject(localeData.skills)) {
            warnings.push(`${localeKey}.skills was not an object and was reset.`);
        }

        return warnings;
    };

    const normalizeImportedDataWithReport = (rawData) => {
        if (!isObject(rawData)) {
            throw new Error('Invalid import payload: expected object.');
        }

        const warnings = [];

        if (isObject(rawData.meta) && Number(rawData.meta.schemaVersion) > CURRENT_SCHEMA_VERSION) {
            warnings.push('Imported data is from a newer schema version; best-effort migration applied.');
        }

        if (isObject(rawData.meta) && !isObject(rawData.data)) {
            warnings.push('Expected wrapped data under data, used fallback parsing.');
        }

        const payload = isObject(rawData.data) ? rawData.data : rawData;

        if (looksLikeLocaleData(payload)) {
            warnings.push('Single-locale import detected; mapped payload to en and reset es.');
            warnings.push(...getLocaleShapeWarnings('en', payload));
            return {
                data: {
                    en: normalizeLocaleData(payload),
                    es: createEmptyLocaleData(),
                },
                warnings,
            };
        }

        warnings.push(...getLocaleShapeWarnings('en', payload.en));
        warnings.push(...getLocaleShapeWarnings('es', payload.es));

        return {
            data: {
                en: normalizeLocaleData(payload.en),
                es: normalizeLocaleData(payload.es),
            },
            warnings,
        };
    };

    const normalizeImportedData = (rawData) => {
        const { data } = normalizeImportedDataWithReport(rawData);
        return data;
    };

    return {
        toStringSafe,
        normalizeImportedData,
        normalizeImportedDataWithReport,
    };
}));
