(function (root, factory) {
    const api = factory(root && root.CVNormalizers);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVStorageService = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (normalizers) {
    if (!normalizers) {
        throw new Error('CVStorageService requires CVNormalizers to be loaded first.');
    }

    const { normalizeImportedData } = normalizers;

    const loadPersistedCvData = ({ fallbackData, storageKey = 'cvData' }) => {
        try {
            const storedData = localStorage.getItem(storageKey);
            if (!storedData) {
                return fallbackData;
            }

            const parsedData = JSON.parse(storedData);
            return normalizeImportedData(parsedData);
        } catch (error) {
            console.error('Failed to parse data from localStorage:', error);
            return fallbackData;
        }
    };

    const savePersistedCvData = ({ cvDataByLocale, storageKey = 'cvData' }) => {
        try {
            const jsonString = JSON.stringify(cvDataByLocale);
            localStorage.setItem(storageKey, jsonString);
            return { ok: true };
        } catch (error) {
            return { ok: false, error };
        }
    };

    return {
        loadPersistedCvData,
        savePersistedCvData,
    };
}));
