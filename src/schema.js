(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVSchema = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const CURRENT_SCHEMA_VERSION = 2;

    const emptyCvDataTemplate = {
        personalInfo: {
            name: '',
            title: '',
            email: '',
            phone: '',
            linkedin: '',
            github: '',
            website: '',
            address: '',
            profilePicture: '',
            profileFrameColor: '#bfdbfe',
            profilePictureWidth: null,
            profilePictureHeight: null,
        },
        summary: '',
        experiences: [],
        education: [],
        skills: {},
        projects: [],
        awards: [],
    };

    const localeSectionKeys = ['personalInfo', 'summary', 'experiences', 'education', 'skills', 'projects', 'awards', 'customSections'];

    const createEmptyLocaleData = () => ({
        personalInfo: { ...emptyCvDataTemplate.personalInfo },
        summary: '',
        experiences: [],
        education: [],
        skills: {},
        projects: [],
        awards: [],
        customSections: [],
    });

    return {
        CURRENT_SCHEMA_VERSION,
        emptyCvDataTemplate,
        localeSectionKeys,
        createEmptyLocaleData,
    };
}));
