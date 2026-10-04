(function (root, factory) {
    const api = factory(root && root.CVSchema, root && root.CVNormalizers);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVImportExportService = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (schema, normalizers) {
    if (!schema || !normalizers) {
        throw new Error('CVImportExportService requires CVSchema and CVNormalizers to be loaded first.');
    }

    const { CURRENT_SCHEMA_VERSION } = schema;
    const { toStringSafe, normalizeImportedDataWithReport } = normalizers;

    const getSafeDataFileName = (userName) => {
        const safeUserName = toStringSafe(userName).trim() || 'CV_User';
        const sanitizedName = safeUserName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${sanitizedName}_cv_data.json`;
    };

    const saveCvDataToFile = ({ cvDataByLocale, userName }) => {
        const exportPayload = {
            meta: {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                exportedAt: new Date().toISOString(),
            },
            data: cvDataByLocale,
        };

        const jsonString = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getSafeDataFileName(userName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const readTextFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error || new Error('Failed to read file.'));

            reader.readAsText(file);
        });
    };

    const importCvDataFromFile = async (file) => {
        if (!file) {
            return { ok: false, reason: 'no-file' };
        }

        try {
            const fileText = await readTextFile(file);
            const parsedData = JSON.parse(fileText);
            const { data, warnings } = normalizeImportedDataWithReport(parsedData);
            return {
                ok: true,
                data,
                warnings,
            };
        } catch (error) {
            return {
                ok: false,
                reason: 'invalid-or-corrupt-file',
                error,
            };
        }
    };

    return {
        getSafeDataFileName,
        saveCvDataToFile,
        importCvDataFromFile,
    };
}));
