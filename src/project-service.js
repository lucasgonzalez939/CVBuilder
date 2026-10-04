(function (root, factory) {
    const api = factory(root && root.CVNormalizers, root && root.CVSchema);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVProjectService = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (normalizers, schema) {
    if (!normalizers || !schema) {
        throw new Error('CVProjectService requires CVNormalizers and CVSchema to be loaded first.');
    }

    const { normalizeImportedData, toStringSafe } = normalizers;
    const { CURRENT_SCHEMA_VERSION, createEmptyLocaleData } = schema;

    const slugify = (value) => {
        const base = toStringSafe(value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'version';

        return `${base}-${Date.now()}`;
    };

    const createVersion = (overrides = {}) => {
        const name = toStringSafe(overrides.name || 'New Version').trim() || 'New Version';
        const now = new Date().toISOString();

        return {
            id: overrides.id || `version-${Date.now()}`,
            name,
            slug: overrides.slug || slugify(name),
            createdAt: overrides.createdAt || now,
            updatedAt: overrides.updatedAt || now,
            isDefault: Boolean(overrides.isDefault),
            focus: {
                primary: '',
                secondary: [],
                industry: '',
                ...(overrides.focus || {}),
            },
            visibility: {
                sections: {
                    summary: true,
                    experiences: true,
                    education: true,
                    skills: true,
                    projects: true,
                    awards: true,
                    customSections: true,
                    ...(overrides.visibility && overrides.visibility.sections ? overrides.visibility.sections : {}),
                },
                experienceIds: Array.isArray(overrides.visibility && overrides.visibility.experienceIds) ? overrides.visibility.experienceIds : [],
                projectIds: Array.isArray(overrides.visibility && overrides.visibility.projectIds) ? overrides.visibility.projectIds : [],
                skillKeys: Array.isArray(overrides.visibility && overrides.visibility.skillKeys) ? overrides.visibility.skillKeys : [],
                hiddenExperienceIds: Array.isArray(overrides.visibility && overrides.visibility.hiddenExperienceIds) ? overrides.visibility.hiddenExperienceIds : [],
                hiddenProjectIds: Array.isArray(overrides.visibility && overrides.visibility.hiddenProjectIds) ? overrides.visibility.hiddenProjectIds : [],
                hiddenSkillItems: Array.isArray(overrides.visibility && overrides.visibility.hiddenSkillItems) ? overrides.visibility.hiddenSkillItems : [],
                hiddenSkillCategories: Array.isArray(overrides.visibility && overrides.visibility.hiddenSkillCategories) ? overrides.visibility.hiddenSkillCategories : [],
                hiddenCustomSectionIds: Array.isArray(overrides.visibility && overrides.visibility.hiddenCustomSectionIds) ? overrides.visibility.hiddenCustomSectionIds : [],
            },
            order: {
                experienceOrder: Array.isArray(overrides.order && overrides.order.experienceOrder) ? overrides.order.experienceOrder : [],
                projectOrder: Array.isArray(overrides.order && overrides.order.projectOrder) ? overrides.order.projectOrder : [],
            },
            localAdditions: {
                experiences: Array.isArray(overrides.localAdditions && overrides.localAdditions.experiences) ? overrides.localAdditions.experiences : [],
                education: Array.isArray(overrides.localAdditions && overrides.localAdditions.education) ? overrides.localAdditions.education : [],
                skills: Array.isArray(overrides.localAdditions && overrides.localAdditions.skills) ? overrides.localAdditions.skills : [],
                projects: Array.isArray(overrides.localAdditions && overrides.localAdditions.projects) ? overrides.localAdditions.projects : [],
                awards: Array.isArray(overrides.localAdditions && overrides.localAdditions.awards) ? overrides.localAdditions.awards : [],
                customSections: Array.isArray(overrides.localAdditions && overrides.localAdditions.customSections) ? overrides.localAdditions.customSections : [],
            },
            localeOverrides: overrides.localeOverrides || {},
        };
    };

    const getVisibleSectionItems = (items, selectedIds, hiddenIds) => {
        if (!Array.isArray(items)) {
            return [];
        }

        const hiddenSet = new Set(Array.isArray(hiddenIds) ? hiddenIds : []);
        const selectedSet = Array.isArray(selectedIds) && selectedIds.length > 0 ? new Set(selectedIds) : null;

        return items.filter((item) => {
            const itemId = item && item.id !== undefined ? item.id : null;
            if (hiddenSet.has(itemId)) {
                return false;
            }
            if (selectedSet && itemId !== null && !selectedSet.has(itemId)) {
                return false;
            }
            return true;
        });
    };

    const applyVersionOrder = (items, orderedIds = []) => {
        if (!Array.isArray(items)) {
            return [];
        }

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return [...items];
        }

        const orderMap = new Map(orderedIds.map((id, index) => [String(id), index]));

        return [...items].sort((leftItem, rightItem) => {
            const leftId = leftItem && leftItem.id !== undefined ? String(leftItem.id) : null;
            const rightId = rightItem && rightItem.id !== undefined ? String(rightItem.id) : null;

            const leftOrder = leftId !== null && orderMap.has(leftId) ? orderMap.get(leftId) : Number.MAX_SAFE_INTEGER;
            const rightOrder = rightId !== null && orderMap.has(rightId) ? orderMap.get(rightId) : Number.MAX_SAFE_INTEGER;

            if (leftOrder === rightOrder) {
                return 0;
            }

            return leftOrder - rightOrder;
        });
    };

    const getVersionDerivedLocaleData = ({ version, localeData }) => {
        if (!version || !localeData || typeof localeData !== 'object') {
            return localeData;
        }

        const nextLocaleData = { ...localeData };
        const visibility = version.visibility || {};
        const sections = visibility.sections || {};

        if (sections.summary === false) {
            nextLocaleData.summary = '';
        }

        if (sections.experiences === false) {
            nextLocaleData.experiences = [];
        } else {
            const baseExperiences = Array.isArray(localeData.experiences) ? localeData.experiences : [];
            const localExperiences = Array.isArray(version.localAdditions && version.localAdditions.experiences) ? version.localAdditions.experiences : [];
            const mergedExperiences = applyVersionOrder([...baseExperiences, ...localExperiences], version.order && Array.isArray(version.order.experienceOrder) ? version.order.experienceOrder : []);
            nextLocaleData.experiences = getVisibleSectionItems(mergedExperiences, visibility.experienceIds, visibility.hiddenExperienceIds);
        }

        if (sections.education === false) {
            nextLocaleData.education = [];
        } else {
            const localEducation = Array.isArray(version.localAdditions && version.localAdditions.education) ? version.localAdditions.education : [];
            nextLocaleData.education = [...(Array.isArray(localeData.education) ? localeData.education : []), ...localEducation];
        }

        if (sections.skills === false) {
            nextLocaleData.skills = {};
        } else {
            const skillGroups = {};
            const selectedSkillKeys = Array.isArray(visibility.skillKeys) && visibility.skillKeys.length > 0 ? new Set(visibility.skillKeys) : null;
            const hiddenSkillCategories = new Set(Array.isArray(visibility.hiddenSkillCategories) ? visibility.hiddenSkillCategories : []);
            const hiddenSkillItems = new Set(Array.isArray(visibility.hiddenSkillItems) ? visibility.hiddenSkillItems : []);

            Object.entries(localeData.skills || {}).forEach(([category, values]) => {
                if (hiddenSkillCategories.has(category)) {
                    return;
                }
                if (selectedSkillKeys && !selectedSkillKeys.has(category)) {
                    return;
                }

                const categoryValues = Array.isArray(values) ? values : [];
                const filteredValues = categoryValues.filter(skill => !hiddenSkillItems.has(skill));
                skillGroups[category] = filteredValues;
            });

            const localSkillGroups = Array.isArray(version.localAdditions && version.localAdditions.skills) ? version.localAdditions.skills : [];
            localSkillGroups.forEach((entry) => {
                if (!entry || !entry.category) {
                    return;
                }
                if (hiddenSkillCategories.has(entry.category)) {
                    return;
                }
                if (selectedSkillKeys && !selectedSkillKeys.has(entry.category)) {
                    return;
                }
                if (hiddenSkillItems.has(entry.label)) {
                    return;
                }
                skillGroups[entry.category] = [...(skillGroups[entry.category] || []), entry.label];
            });

            nextLocaleData.skills = skillGroups;
        }

        if (sections.projects === false) {
            nextLocaleData.projects = [];
        } else {
            const baseProjects = Array.isArray(localeData.projects) ? localeData.projects : [];
            const localProjects = Array.isArray(version.localAdditions && version.localAdditions.projects) ? version.localAdditions.projects : [];
            const mergedProjects = applyVersionOrder([...baseProjects, ...localProjects], version.order && Array.isArray(version.order.projectOrder) ? version.order.projectOrder : []);
            nextLocaleData.projects = getVisibleSectionItems(mergedProjects, visibility.projectIds, visibility.hiddenProjectIds);
        }

        if (sections.awards === false) {
            nextLocaleData.awards = [];
        } else {
            const localAwards = Array.isArray(version.localAdditions && version.localAdditions.awards) ? version.localAdditions.awards : [];
            nextLocaleData.awards = [...(Array.isArray(localeData.awards) ? localeData.awards : []), ...localAwards];
        }

        if (sections.customSections === false) {
            nextLocaleData.customSections = [];
        } else {
            const localCustomSections = Array.isArray(version.localAdditions && version.localAdditions.customSections) ? version.localAdditions.customSections : [];
            const mergedCustomSections = [...(Array.isArray(localeData.customSections) ? localeData.customSections : []), ...localCustomSections];
            const hiddenCustomSectionIds = new Set(Array.isArray(visibility.hiddenCustomSectionIds) ? visibility.hiddenCustomSectionIds : []);
            nextLocaleData.customSections = mergedCustomSections.filter(section => !hiddenCustomSectionIds.has(section.id));
        }

        return nextLocaleData;
    };

    const getDerivedProjectView = ({ project, locale = 'en' }) => {
        if (!project || !project.masterCv || !project.versions) {
            return project;
        }

        const activeVersion = project.versions.find(version => version.id === project.activeVersionId) || project.versions[0];
        const localeData = project.masterCv[locale] || project.masterCv.en || createEmptyLocaleData();
        const filteredLocaleData = getVersionDerivedLocaleData({ version: activeVersion, localeData });

        return {
            ...project,
            derivedLocaleData: filteredLocaleData,
            activeVersion,
        };
    };

    const normalizeProjectBundle = (rawData) => {
        if (!rawData || typeof rawData !== 'object') {
            return buildDefaultProject();
        }

        if (rawData.project && typeof rawData.project === 'object') {
            return ensureProjectShape(rawData.project, rawData.meta || {});
        }

        const possibleProject = rawData.data && typeof rawData.data === 'object' ? rawData.data : rawData;

        if (possibleProject.masterCv || possibleProject.versions || possibleProject.activeVersionId || possibleProject.defaultLocale) {
            return ensureProjectShape(possibleProject, rawData.meta || {});
        }

        const normalizedMaster = normalizeImportedData(rawData);
        return buildDefaultProject({
            projectName: 'Main CV Project',
            masterCv: normalizedMaster,
            defaultLocale: 'en',
            versions: [createVersion({
                id: 'version-main',
                name: 'Main Version',
                slug: 'main-version',
                isDefault: true,
            })],
        });
    };

    const ensureProjectShape = (projectData = {}, meta = {}) => {
        const safeProject = projectData && typeof projectData === 'object' ? projectData : {};
        const masterCv = safeProject.masterCv && typeof safeProject.masterCv === 'object'
            ? normalizeImportedData(safeProject.masterCv)
            : normalizeImportedData({
                en: createEmptyLocaleData(),
                es: createEmptyLocaleData(),
            });

        const versionList = Array.isArray(safeProject.versions) && safeProject.versions.length > 0
            ? safeProject.versions.map((version, index) => createVersion({
                ...version,
                id: version.id || `version-${index + 1}`,
                slug: version.slug || slugify(version.name || `version-${index + 1}`),
                name: version.name || `Version ${index + 1}`,
                isDefault: Boolean(version.isDefault) || index === 0,
            }))
            : [createVersion({
                id: 'version-main',
                name: 'Main Version',
                slug: 'main-version',
                isDefault: true,
            })];

        const activeVersionId = safeProject.activeVersionId || versionList[0].id;

        return {
            meta: {
                schemaVersion: Number(meta.schemaVersion) || CURRENT_SCHEMA_VERSION + 1,
                projectVersion: Number(meta.projectVersion) || 1,
                exportedAt: meta.exportedAt || new Date().toISOString(),
            },
            project: {
                id: safeProject.id || 'cv-project-' + Date.now(),
                name: toStringSafe(safeProject.name).trim() || 'Main CV Project',
                defaultLocale: safeProject.defaultLocale || 'en',
                masterCv,
                versions: versionList,
                activeVersionId,
            },
        };
    };

    const buildDefaultProject = ({
        projectName = 'Main CV Project',
        masterCv = {},
        defaultLocale = 'en',
        versions = [],
    } = {}) => {
        const normalizedMaster = normalizeImportedData(masterCv && Object.keys(masterCv).length ? masterCv : {
            en: createEmptyLocaleData(),
            es: createEmptyLocaleData(),
        });

        const baseVersion = createVersion({
            id: 'version-main',
            name: 'Main Version',
            slug: 'main-version',
            isDefault: true,
        });

        const versionList = versions.length > 0 ? versions.map((version, index) => createVersion({
            ...version,
            id: version.id || `version-${index + 1}`,
            name: version.name || `Version ${index + 1}`,
            slug: version.slug || slugify(version.name || `Version ${index + 1}`),
            isDefault: Boolean(version.isDefault) || index === 0,
        })) : [baseVersion];

        return {
            meta: {
                schemaVersion: CURRENT_SCHEMA_VERSION + 1,
                projectVersion: 1,
                exportedAt: new Date().toISOString(),
            },
            project: {
                id: `cv-project-${Date.now()}`,
                name: projectName,
                defaultLocale,
                masterCv: normalizedMaster,
                versions: versionList,
                activeVersionId: versionList[0].id,
            },
        };
    };

    const savePersistedProjectData = ({ project, storageKey = 'cvProject' }) => {
        try {
            const bundle = normalizeProjectBundle({ project });
            localStorage.setItem(storageKey, JSON.stringify(bundle));
            return { ok: true, data: bundle };
        } catch (error) {
            return { ok: false, error };
        }
    };

    const loadPersistedProjectData = ({ fallbackProject, storageKey = 'cvProject', legacyStorageKey = 'cvData' }) => {
        try {
            const projectFromStorage = localStorage.getItem(storageKey);
            if (projectFromStorage) {
                return normalizeProjectBundle(JSON.parse(projectFromStorage));
            }

            const legacyStoredData = localStorage.getItem(legacyStorageKey);
            if (legacyStoredData) {
                return normalizeProjectBundle(JSON.parse(legacyStoredData));
            }

            return fallbackProject || buildDefaultProject();
        } catch (error) {
            console.error('Failed to parse project data from localStorage:', error);
            return fallbackProject || buildDefaultProject();
        }
    };

    const syncVersionLocalAdditionToMaster = ({ project, versionId, sectionKey, itemId }) => {
        if (!project || !project.project || !versionId || !sectionKey || !itemId) {
            return project;
        }

        const version = (project.project.versions || []).find(item => item.id === versionId);
        if (!version || !Array.isArray(version.localAdditions && version.localAdditions[sectionKey])) {
            return project;
        }

        const targetItem = version.localAdditions[sectionKey].find(item => item.id === itemId);
        if (!targetItem) {
            return project;
        }

        const nextProject = {
            ...project,
            project: {
                ...project.project,
                versions: (project.project.versions || []).map(currentVersion => {
                    if (currentVersion.id !== versionId) {
                        return currentVersion;
                    }

                    return {
                        ...currentVersion,
                        localAdditions: {
                            ...currentVersion.localAdditions,
                            [sectionKey]: (currentVersion.localAdditions && currentVersion.localAdditions[sectionKey] || []).filter(item => item.id !== itemId),
                        },
                        updatedAt: new Date().toISOString(),
                    };
                }),
            },
        };

        const masterSection = nextProject.project.masterCv[nextProject.project.defaultLocale || 'en']?.[sectionKey] || [];
        const exists = Array.isArray(masterSection)
            ? masterSection.some(item => {
                if (typeof item === 'object' && item && item.id && targetItem.id) {
                    return item.id === targetItem.id;
                }
                return String(item) === String(targetItem);
            })
            : false;

        if (!exists) {
            const nextMaster = { ...nextProject.project.masterCv };
            const localeKey = nextProject.project.defaultLocale || 'en';
            const localeData = { ...(nextMaster[localeKey] || createEmptyLocaleData()) };

            if (sectionKey === 'skills') {
                const skillCategory = targetItem.category || 'General';
                const nextSkills = { ...(localeData.skills || {}) };
                nextSkills[skillCategory] = [...(Array.isArray(nextSkills[skillCategory]) ? nextSkills[skillCategory] : []), targetItem.label];
                localeData.skills = nextSkills;
            } else if (Array.isArray(localeData[sectionKey])) {
                localeData[sectionKey] = [...localeData[sectionKey], targetItem];
            } else {
                localeData[sectionKey] = [targetItem];
            }

            nextMaster[localeKey] = localeData;
            nextProject.project.masterCv = nextMaster;
        }

        return nextProject;
    };

    const reorderVersionItems = ({ project, versionId, sectionKey, itemId, direction = 1 }) => {
        if (!project || !project.project || !versionId || !sectionKey || !itemId) {
            return project;
        }

        const orderKeyMap = {
            experiences: 'experienceOrder',
            projects: 'projectOrder',
        };

        const orderKey = orderKeyMap[sectionKey];
        if (!orderKey) {
            return project;
        }

        const nextProject = {
            ...project,
            project: {
                ...project.project,
                versions: (project.project.versions || []).map(version => {
                    if (version.id !== versionId) {
                        return version;
                    }

                    const currentOrder = Array.isArray(version.order && version.order[orderKey]) ? [...version.order[orderKey]] : [];
                    const currentIndex = currentOrder.indexOf(itemId);
                    let nextOrder = [...currentOrder];

                    if (currentIndex === -1) {
                        nextOrder = [...nextOrder, itemId];
                    } else {
                        const targetIndex = currentIndex + direction;
                        if (targetIndex < 0 || targetIndex >= nextOrder.length) {
                            return version;
                        }
                        const [movedItem] = nextOrder.splice(currentIndex, 1);
                        nextOrder.splice(targetIndex, 0, movedItem);
                    }

                    return {
                        ...version,
                        order: {
                            ...(version.order || {}),
                            [orderKey]: nextOrder,
                        },
                        updatedAt: new Date().toISOString(),
                    };
                }),
            },
        };

        return nextProject;
    };

    return {
        slugify,
        createVersion,
        normalizeProjectBundle,
        ensureProjectShape,
        buildDefaultProject,
        getVersionDerivedLocaleData,
        getDerivedProjectView,
        savePersistedProjectData,
        loadPersistedProjectData,
        syncVersionLocalAdditionToMaster,
        reorderVersionItems,
    };
}));
