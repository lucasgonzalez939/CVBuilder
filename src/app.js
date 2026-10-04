        const {
            createEmptyLocaleData,
        } = window.CVSchema;

        const {
            toStringSafe,
        } = window.CVNormalizers;

        const {
            saveCvDataToFile,
            importCvDataFromFile,
        } = window.CVImportExportService;

        const {
            processProfileImageFile,
        } = window.CVImageService;

        const {
            toAbsoluteUrl,
            getSafePdfFileName: getSafePdfFileNameFromService,
            exportToPdfImage: exportToPdfImageFromService,
            exportToPdfText,
        } = window.CVPdfService;

        const {
            loadPersistedCvData,
            savePersistedCvData,
        } = window.CVStorageService;

        // Main App component for the CV Builder
        const App = () => {
            // State for current language (locale)
            const [locale, setLocale] = React.useState('en');
            const t = translations[locale]; // Shorthand for translations based on current locale


            // Function to get initial data from local storage or use defaults
            const getInitialData = () => {
                return loadPersistedCvData({
                    fallbackData: initialCvDataByLocale,
                    storageKey: 'cvData',
                });
            };

            // State variables to hold CV data for both locales
            const [cvDataByLocale, setCvDataByLocale] = React.useState(getInitialData);
            // State variables to hold CV data for both locales
            //const [cvDataByLocale, setCvDataByLocale] = React.useState(initialCvDataByLocale);

            // Destructure current locale's CV data for easier access
            const { personalInfo, summary, experiences, education, skills, projects, awards, customSections } = cvDataByLocale[locale];

            const formatCategoryLabel = (category) => {
                if (t[category]) {
                    return t[category];
                }

                return category
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/[_-]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\b\w/g, char => char.toUpperCase());
            };

            // Ref for the CV content to be exported as PDF
            const cvContentRef = React.useRef(null);
            // Ref for the hidden file input
            const fileInputRef = React.useRef(null);
            // Ref for the image file input
            const imageInputRef = React.useRef(null);

            // State for custom message display
            const [message, setMessage] = React.useState('');
            const [isMessageVisible, setIsMessageVisible] = React.useState(false);
            const [showConfirmModal, setShowConfirmModal] = React.useState(false);
            const [confirmAction, setConfirmAction] = React.useState(null); // Function to execute on confirm
            const [newSkillCategoryName, setNewSkillCategoryName] = React.useState('');


            // Auto-save effect to save data to local storage whenever cvDataByLocale changes
            React.useEffect(() => {
                const saveResult = savePersistedCvData({
                    cvDataByLocale,
                    storageKey: 'cvData',
                });

                if (!saveResult.ok) {
                    console.error("Failed to save data to local storage:", saveResult.error);
                }
            }, [cvDataByLocale]); // This effect runs whenever cvDataByLocale changes

            // Function to display custom messages
            const showMessage = (msg) => {
                setMessage(msg);
                setIsMessageVisible(true);
                setTimeout(() => {
                    setIsMessageVisible(false);
                    setMessage('');
                }, 3000); // Message disappears after 3 seconds
            };

            // Generic update function for CV data based on current locale
            const updateCvData = (section, id, field, value, index = null) => {
                setCvDataByLocale(prev => {
                    const currentLocaleData = { ...prev[locale] };
                    if (section === 'personalInfo' || section === 'summary') {
                        return {
                            ...prev,
                            [locale]: {
                                ...currentLocaleData,
                                [section]: section === 'summary' ? value : { ...currentLocaleData[section], [field]: value }
                            }
                        };
                    } else if (Array.isArray(currentLocaleData[section])) {
                        const updatedArray = currentLocaleData[section].map(item => {
                            if (item.id === id) {
                                if (field === 'description' && index !== null) {
                                    const newDescription = [...item.description];
                                    newDescription[index] = value;
                                    return { ...item, description: newDescription };
                                }
                                return { ...item, [field]: value };
                            }
                            return item;
                        });
                        return {
                            ...prev,
                            [locale]: {
                                ...currentLocaleData,
                                [section]: updatedArray
                            }
                        };
                    } else if (section === 'skills') {
                        const newSkills = { ...currentLocaleData.skills };
                        // The 'id' parameter is the category, and 'field' is the index
                        const newCategoryArray = Array.isArray(newSkills[id]) ? [...newSkills[id]] : [];
                        newCategoryArray[field] = value; // Use the 'field' parameter, which holds the index
                        newSkills[id] = newCategoryArray;
                        return {
                            ...prev,
                            [locale]: {
                                ...currentLocaleData,
                                skills: newSkills
                            }
                        };
                    }
                    return prev;
                });
            };

            const getNextId = (items) => {
                const maxId = items.reduce((maxValue, item) => {
                    const numericId = Number(item.id);
                    return Number.isFinite(numericId) ? Math.max(maxValue, numericId) : maxValue;
                }, 0);
                return maxId + 1;
            };

            // Functions to handle adding/removing items in arrays
            const addItem = (section, newItem) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        [section]: [...prev[locale][section], newItem]
                    }
                }));
            };

            const removeItem = (section, idToRemove) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        [section]: prev[locale][section].filter(item => item.id !== idToRemove)
                    }
                }));
            };

            // Specific handlers using the generic update/add/remove functions
            const handlePersonalInfoChange = (e) => updateCvData('personalInfo', null, e.target.name, e.target.value);
            const handleSummaryChange = (e) => updateCvData('summary', null, null, e.target.value);
            const handleExperienceChange = (id, field, value, index = null) => updateCvData('experiences', id, field, value, index);
            const addExperience = () => addItem('experiences', { id: experiences.length + 1, title: '', company: '', location: '', startDate: '', endDate: '', description: [''] });
            const removeExperience = (id) => removeItem('experiences', id);
            const addExperienceDescriptionLine = (id) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        experiences: prev[locale].experiences.map(exp =>
                            exp.id === id ? { ...exp, description: [...exp.description, ''] } : exp
                        )
                    }
                }));
            };
            const removeExperienceDescriptionLine = (expId, descIndex) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        experiences: prev[locale].experiences.map(exp =>
                            exp.id === expId ? { ...exp, description: exp.description.filter((_, i) => i !== descIndex) } : exp
                        )
                    }
                }));
            };

            const handleEducationChange = (id, field, value) => updateCvData('education', id, field, value);
            const addEducation = () => addItem('education', { id: education.length + 1, degree: '', university: '', location: '', year: '', details: '' });
            const removeEducation = (id) => removeItem('education', id);

            const handleSkillsChange = (category, index, value) => updateCvData('skills', category, index, value);
            const toSkillCategoryKey = (value) => {
                const normalized = toStringSafe(value)
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9\s_-]/g, '')
                    .replace(/[_-]+/g, ' ')
                    .replace(/\s+/g, ' ');

                if (!normalized) {
                    return '';
                }

                const words = normalized.split(' ');
                return words
                    .map((word, index) => index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
                    .join('');
            };

            const addSkillCategory = () => {
                const categoryKey = toSkillCategoryKey(newSkillCategoryName);
                if (!categoryKey) {
                    return;
                }

                setCvDataByLocale(prev => {
                    const currentLocaleData = prev[locale];
                    if (Array.isArray(currentLocaleData.skills[categoryKey])) {
                        return prev;
                    }

                    return {
                        ...prev,
                        [locale]: {
                            ...currentLocaleData,
                            skills: {
                                ...currentLocaleData.skills,
                                [categoryKey]: [],
                            }
                        }
                    };
                });

                setNewSkillCategoryName('');
            };

            const removeSkillCategory = (category) => {
                setCvDataByLocale(prev => {
                    const currentLocaleData = prev[locale];
                    const nextSkills = { ...currentLocaleData.skills };
                    delete nextSkills[category];

                    return {
                        ...prev,
                        [locale]: {
                            ...currentLocaleData,
                            skills: nextSkills,
                        }
                    };
                });
            };

            const addSkill = (category) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        skills: {
                            ...prev[locale].skills,
                            [category]: [...(Array.isArray(prev[locale].skills[category]) ? prev[locale].skills[category] : []), '']
                        }
                    }
                }));
            };
            const removeSkill = (category, index) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        skills: {
                            ...prev[locale].skills,
                            [category]: (Array.isArray(prev[locale].skills[category]) ? prev[locale].skills[category] : []).filter((_, i) => i !== index)
                        }
                    }
                }));
            };

            const handleProjectChange = (id, field, value) => updateCvData('projects', id, field, value);
            const addProject = () => addItem('projects', { id: projects.length + 1, name: '', technologies: '', description: '', link: '' });
            const removeProject = (id) => removeItem('projects', id);

            const handleAwardChange = (id, field, value) => updateCvData('awards', id, field, value);
            const addAward = () => addItem('awards', { id: getNextId(awards), name: '', year: '', description: '' });
            const removeAward = (id) => removeItem('awards', id);

            const addCustomSection = () => addItem('customSections', { id: getNextId(customSections), title: '', items: [''] });
            const removeCustomSection = (id) => removeItem('customSections', id);
            const handleCustomSectionTitleChange = (id, value) => updateCvData('customSections', id, 'title', value);
            const handleCustomSectionItemChange = (sectionId, index, value) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        customSections: prev[locale].customSections.map(section => {
                            if (section.id !== sectionId) {
                                return section;
                            }

                            const nextItems = Array.isArray(section.items) ? [...section.items] : [];
                            nextItems[index] = value;

                            return {
                                ...section,
                                items: nextItems,
                            };
                        })
                    }
                }));
            };
            const addCustomSectionItem = (sectionId) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        customSections: prev[locale].customSections.map(section => {
                            if (section.id !== sectionId) {
                                return section;
                            }

                            return {
                                ...section,
                                items: [...(Array.isArray(section.items) ? section.items : []), ''],
                            };
                        })
                    }
                }));
            };
            const removeCustomSectionItem = (sectionId, itemIndex) => {
                setCvDataByLocale(prev => ({
                    ...prev,
                    [locale]: {
                        ...prev[locale],
                        customSections: prev[locale].customSections.map(section => {
                            if (section.id !== sectionId) {
                                return section;
                            }

                            const nextItems = (Array.isArray(section.items) ? section.items : []).filter((_, index) => index !== itemIndex);
                            return {
                                ...section,
                                items: nextItems.length > 0 ? nextItems : [''],
                            };
                        })
                    }
                }));
            };

            // Function to handle image file upload and crop to square
            const handleImageUpload = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        const processedImage = await processProfileImageFile(file, { displaySize: 150 });

                        setCvDataByLocale(prev => ({
                            ...prev,
                            [locale]: {
                                ...prev[locale],
                                personalInfo: {
                                    ...prev[locale].personalInfo,
                                    ...processedImage,
                                }
                            }
                        }));
                    } catch (error) {
                        console.error('Error processing profile image:', error);
                    }
                }
            };

            // Function to remove the profile picture
            const removeProfilePicture = () => {
                updateCvData('personalInfo', null, 'profilePicture', '');
                updateCvData('personalInfo', null, 'profilePictureWidth', null);
                updateCvData('personalInfo', null, 'profilePictureHeight', null);
                if (imageInputRef.current) {
                    imageInputRef.current.value = ''; // Clear the file input
                }
            };

            const getSafePdfFileName = () => {
                return getSafePdfFileNameFromService(cvDataByLocale[locale].personalInfo.name, locale);
            };

            const exportToPdfImage = () => {
                exportToPdfImageFromService({
                    element: cvContentRef.current,
                    fileName: getSafePdfFileName(),
                });
            };

            const exportToPdf = async () => {
                await exportToPdfText({
                    cvDataByLocale,
                    locale,
                    t,
                    formatCategoryLabel,
                    fileName: getSafePdfFileName(),
                    element: cvContentRef.current,
                    onFallbackMessage: () => showMessage(t.pdfExportFallback),
                });
            };
            // Function to save all CV data (both locales) to a JSON file
            const saveCvToFile = () => {
                try {
                    saveCvDataToFile({
                        cvDataByLocale,
                        userName: cvDataByLocale[locale].personalInfo.name,
                    });
                    showMessage(t.saveSuccess);
                } catch (error) {
                    console.error("Error saving CV data to file:", error);
                    showMessage(t.saveError);
                }
            };

            // Function to trigger file input click for import
            const triggerImport = () => {
                fileInputRef.current.click();
            };

            // Function to handle file selection and import CV data
            const handleFileSelect = async (event) => {
                const file = event.target.files[0];
                const importResult = await importCvDataFromFile(file);

                if (!importResult.ok) {
                    if (importResult.reason === 'no-file') {
                        showMessage(t.noFileSelected);
                    } else {
                        console.error("Error parsing CV data file:", importResult.error);
                        showMessage(t.loadError);
                    }

                    event.target.value = null;
                    return;
                }

                setCvDataByLocale(importResult.data);
                if (importResult.warnings.length > 0) {
                    const warningPreview = importResult.warnings.slice(0, 2).join(' ');
                    const moreCount = importResult.warnings.length - 2;
                    const moreSuffix = moreCount > 0 ? ` (+${moreCount} more)` : '';
                    showMessage(`${t.loadPartial} ${warningPreview}${moreSuffix}`);
                } else {
                    showMessage(t.loadSuccess);
                }

                // Clear the file input value to allow re-importing the same file
                event.target.value = null;
            };

            // Function to start a new, empty CV session
            const startNewSession = () => {
                // Show confirmation modal before clearing data
                setShowConfirmModal(true);
                setConfirmAction(() => () => {
                    // Reset all CV data for both locales to empty templates
                    setCvDataByLocale({
                        en: createEmptyLocaleData(),
                        es: createEmptyLocaleData(),
                    });
                    showMessage(t.newSessionStarted);
                    setShowConfirmModal(false); // Close modal after action
                });
            };

            const handleConfirm = () => {
                if (confirmAction) {
                    confirmAction();
                }
            };

            const handleCancel = () => {
                setShowConfirmModal(false);
                setConfirmAction(null);
            };


            return (
                <div className="min-h-screen bg-gray-100 p-4 font-inter">
                    {/* Custom Message Modal */}
                    {isMessageVisible && (
                        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                                <p className="text-lg font-semibold text-gray-800">{message}</p>
                            </div>
                        </div>
                    )}

                    {/* Confirmation Modal */}
                    {showConfirmModal && (
                        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm mx-auto">
                                <p className="text-lg font-semibold text-gray-800 mb-4">{t.newSessionConfirm}</p>
                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={handleConfirm}
                                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden md:flex">
                        {/* Input Form Section */}
                        <div className="w-full md:w-1/2 p-6 bg-gray-50 border-r border-gray-200 overflow-y-auto max-h-[calc(100vh-2rem)]">
                            {/* Top Controls */}
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
                                <h1 className="text-3xl font-bold text-gray-800 text-center sm:text-left flex-grow">{t.cvBuilder}</h1>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => setLocale('en')}
                                        className={`px-4 py-2 rounded-md transition-colors w-full sm:w-auto ${locale === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                                    >
                                        {t.english}
                                    </button>
                                    <button
                                        onClick={() => setLocale('es')}
                                        className={`px-4 py-2 rounded-md transition-colors w-full sm:w-auto ${locale === 'es' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                                    >
                                        {t.spanish}
                                    </button>
                                    <button
                                        onClick={startNewSession}
                                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-md w-full sm:w-auto"
                                    >
                                        {t.newSession}
                                    </button>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.personalInformation}</h2>
                                {Object.keys(personalInfo).filter(key => key !== 'profilePicture' && key !== 'profileFrameColor' && key !== 'profilePictureWidth' && key !== 'profilePictureHeight').map((key) => ( // Exclude picture fields
                                    <div className="mb-3" key={key}>
                                        <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                                            {t[key]}: {/* Use translation for label */}
                                        </label>
                                        <input
                                            type="text"
                                            id={key}
                                            name={key}
                                            value={personalInfo[key]}
                                            onChange={handlePersonalInfoChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                ))}
                                {/* Profile Picture Input */}
                                <div className="mb-3">
                                    <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700">
                                        {t.profilePicture}:
                                    </label>
                                    <div className="flex items-center mt-1 space-x-3">
                                        <input
                                            type="file"
                                            id="profilePicture"
                                            ref={imageInputRef}
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                                        />
                                        {personalInfo.profilePicture && (
                                            <button
                                                onClick={removeProfilePicture}
                                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title={t.removeImage}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-3">
                                        <label htmlFor="profileFrameColor" className="block text-sm font-medium text-gray-700">
                                            {t.profileFrameColor}:
                                        </label>
                                        <div className="mt-1 flex items-center gap-3">
                                            <input
                                                type="color"
                                                id="profileFrameColor"
                                                name="profileFrameColor"
                                                value={personalInfo.profileFrameColor || '#bfdbfe'}
                                                onChange={handlePersonalInfoChange}
                                                className="h-10 w-16 cursor-pointer rounded border border-gray-300 bg-white p-1"
                                            />
                                            <span className="text-sm text-gray-500">{personalInfo.profileFrameColor || '#bfdbfe'}</span>
                                        </div>
                                    </div>
                                    {personalInfo.profilePicture && (
                                        <div className="mt-4 text-center">
                                            <img
                                                alt="Profile Preview"
                                                src={personalInfo.profilePicture}
                                                className="w-24 h-24 rounded-full object-cover mx-auto border-2 shadow-md"
                                                style={{ borderColor: personalInfo.profileFrameColor || '#bfdbfe' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.summary}</h2>
                                <textarea
                                    value={summary}
                                    onChange={handleSummaryChange}
                                    rows="5"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder={t.summaryPlaceholder}
                                ></textarea>
                            </div>

                            {/* Work Experience */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.workExperience}</h2>
                                {experiences.map((exp) => {
                                    return (
                                        <div key={exp.id} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 relative">
                                            <button
                                                onClick={() => removeExperience(exp.id)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title={t.removeExperience}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.jobTitle}:</label>
                                                <input
                                                    type="text"
                                                    value={exp.title}
                                                    onChange={(e) => handleExperienceChange(exp.id, 'title', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.company}:</label>
                                                <input
                                                    type="text"
                                                    value={exp.company}
                                                    onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.location}:</label>
                                                <input
                                                    type="text"
                                                    value={exp.location}
                                                    onChange={(e) => handleExperienceChange(exp.id, 'location', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">{t.startDate}:</label>
                                                    <input
                                                        type="text"
                                                        value={exp.startDate}
                                                        onChange={(e) => handleExperienceChange(exp.id, 'startDate', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">{t.endDate}:</label>
                                                    <input
                                                        type="text"
                                                        value={exp.endDate}
                                                        onChange={(e) => handleExperienceChange(exp.id, 'endDate', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.responsibilitiesAchievements}:</label>
                                                {exp.description.map((desc, index) => {
                                                    return (
                                                        <div key={index} className="flex items-center mt-1">
                                                            <textarea
                                                                value={desc}
                                                                onChange={(e) => handleExperienceChange(exp.id, 'description', e.target.value, index)}
                                                                rows="2"
                                                                className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mr-2"
                                                                placeholder={t.responsibilitiesAchievementsPlaceholder}
                                                            ></textarea>
                                                            <button
                                                                onClick={() => removeExperienceDescriptionLine(exp.id, index)}
                                                                className="p-1 bg-red-400 text-white rounded-full hover:bg-red-500 transition-colors"
                                                                title={t.removeLine}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => addExperienceDescriptionLine(exp.id)}
                                                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                                                >
                                                    {t.addDescriptionLine}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={addExperience}
                                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-md"
                                >
                                    {t.addExperience}
                                </button>
                            </div>

                            {/* Education */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.education}</h2>
                                {education.map((edu) => {
                                    return (
                                        <div key={edu.id} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 relative">
                                            <button
                                                onClick={() => removeEducation(edu.id)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title={t.removeEducation}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.degree}:</label>
                                                <input
                                                    type="text"
                                                    value={edu.degree}
                                                    onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.university}:</label>
                                                <input
                                                    type="text"
                                                    value={edu.university}
                                                    onChange={(e) => handleEducationChange(edu.id, 'university', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">{t.location}:</label>
                                                    <input
                                                        type="text"
                                                        value={edu.location}
                                                        onChange={(e) => handleEducationChange(edu.id, 'location', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">{t.year}:</label>
                                                    <input
                                                        type="text"
                                                        value={edu.year}
                                                        onChange={(e) => handleEducationChange(edu.id, 'year', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.detailsOptional}:</label>
                                                <textarea
                                                    value={edu.details}
                                                    onChange={(e) => handleEducationChange(edu.id, 'details', e.target.value)}
                                                    rows="2"
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder={t.detailsPlaceholder}
                                                ></textarea>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={addEducation}
                                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-md"
                                >
                                    {t.addEducation}
                                </button>
                            </div>

                            {/* Skills */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.skills}</h2>
                                <div className="mb-4 flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={newSkillCategoryName}
                                        onChange={(e) => setNewSkillCategoryName(e.target.value)}
                                        placeholder={t.skillCategoryNamePlaceholder}
                                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        aria-label={t.skillCategoryName}
                                    />
                                    <button
                                        onClick={addSkillCategory}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                                    >
                                        {t.addSkillCategory}
                                    </button>
                                </div>
                                {Object.keys(skills).map((category) => {
                                    const skillValues = Array.isArray(skills[category]) ? skills[category] : [];
                                    return (
                                        <div key={category} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-lg font-medium text-gray-700">{formatCategoryLabel(category)}:</h3>
                                                <button
                                                    onClick={() => removeSkillCategory(category)}
                                                    className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs"
                                                >
                                                    {t.removeSkillCategory}
                                                </button>
                                            </div>
                                            {skillValues.map((skill, index) => {
                                                return (
                                                    <div key={index} className="flex items-center mb-2">
                                                        <input
                                                            type="text"
                                                            value={skill}
                                                            onChange={(e) => handleSkillsChange(category, index, e.target.value)}
                                                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mr-2"
                                                        />
                                                        <button
                                                            onClick={() => removeSkill(category, index)}
                                                            className="p-1 bg-red-400 text-white rounded-full hover:bg-red-500 transition-colors"
                                                            title={t.removeSkill}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <button
                                                onClick={() => addSkill(category)}
                                                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                                            >
                                                {t.addSkill}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Projects */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.projects}</h2>
                                {projects.map((proj) => {
                                    return (
                                        <div key={proj.id} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 relative">
                                            <button
                                                onClick={() => removeProject(proj.id)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title={t.removeProject}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.projectName}:</label>
                                                <input
                                                    type="text"
                                                    value={proj.name}
                                                    onChange={(e) => handleProjectChange(proj.id, 'name', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.technologiesUsed}:</label>
                                                <input
                                                    type="text"
                                                    value={proj.technologies}
                                                    onChange={(e) => handleProjectChange(proj.id, 'technologies', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.projectDescription}:</label>
                                                <textarea
                                                    value={proj.description}
                                                    onChange={(e) => handleProjectChange(proj.id, 'description', e.target.value)}
                                                    rows="3"
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder={t.projectDescriptionPlaceholder}
                                                ></textarea>
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.linkOptional}:</label>
                                                <input
                                                    type="text"
                                                    value={proj.link}
                                                    onChange={(e) => handleProjectChange(proj.id, 'link', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={addProject}
                                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-md"
                                >
                                    {t.addProject}
                                </button>
                            </div>

                            {/* Awards/Certifications */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.awardsCertifications}</h2>
                                {awards.map((award) => {
                                    return (
                                        <div key={award.id} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 relative">
                                            <button
                                                onClick={() => removeAward(award.id)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title={t.removeAward}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.awardName}:</label>
                                                <input
                                                    type="text"
                                                    value={award.name}
                                                    onChange={(e) => handleAwardChange(award.id, 'name', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.awardYear}:</label>
                                                <input
                                                    type="text"
                                                    value={award.year}
                                                    onChange={(e) => handleAwardChange(award.id, 'year', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.awardDescriptionOptional}:</label>
                                                <textarea
                                                    value={award.description}
                                                    onChange={(e) => handleAwardChange(award.id, 'description', e.target.value)}
                                                    rows="2"
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder={t.awardDescriptionPlaceholder}
                                                ></textarea>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={addAward}
                                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-md"
                                >
                                    {t.addAwardCertification}
                                </button>
                            </div>

                            {/* Custom Sections */}
                            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t.customSections}</h2>
                                {customSections.map((section) => {
                                    const sectionItems = Array.isArray(section.items) ? section.items : [];
                                    return (
                                        <div key={section.id} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 relative">
                                            <button
                                                onClick={() => removeCustomSection(section.id)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title={t.removeCustomSection}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700">{t.customSectionTitle}:</label>
                                                <input
                                                    type="text"
                                                    value={section.title}
                                                    onChange={(e) => handleCustomSectionTitleChange(section.id, e.target.value)}
                                                    placeholder={t.customSectionTitlePlaceholder}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="mb-3">
                                                {sectionItems.map((item, index) => {
                                                    return (
                                                        <div key={index} className="flex items-center mt-1">
                                                            <textarea
                                                                value={item}
                                                                onChange={(e) => handleCustomSectionItemChange(section.id, index, e.target.value)}
                                                                rows="2"
                                                                className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mr-2"
                                                                placeholder={t.customSectionItemPlaceholder}
                                                            ></textarea>
                                                            <button
                                                                onClick={() => removeCustomSectionItem(section.id, index)}
                                                                className="p-1 bg-red-400 text-white rounded-full hover:bg-red-500 transition-colors"
                                                                title={t.removeLine}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => addCustomSectionItem(section.id)}
                                                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                                                >
                                                    {t.addDescriptionLine}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={addCustomSection}
                                    className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-md"
                                >
                                    {t.addCustomSection}
                                </button>
                            </div>

                            {/* Bottom Controls */}
                            <div className="mt-8 flex flex-col space-y-4">
                                <button
                                    onClick={exportToPdf}
                                    className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>{t.exportToPdfText || t.exportToPdf}</span>
                                </button>
                                <button
                                    onClick={exportToPdfImage}
                                    className="w-full px-6 py-3 bg-slate-600 text-white text-lg font-semibold rounded-md hover:bg-slate-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 7l3-3 2 2 3-3 4 4" />
                                    </svg>
                                    <span>{t.exportToPdfImage || t.exportToPdf}</span>
                                </button>
                                <button
                                    onClick={saveCvToFile}
                                    className="w-full px-6 py-3 bg-purple-600 text-white text-lg font-semibold rounded-md hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0-8V4m0 8h.01M12 4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2h-4z" />
                                    </svg>
                                    <span>{t.exportCvSession}</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    accept=".json" // Only accept JSON files
                                />
                                <button
                                    onClick={triggerImport}
                                    className="w-full px-6 py-3 bg-orange-600 text-white text-lg font-semibold rounded-md hover:bg-orange-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>{t.importCvSession}</span>
                                </button>
                            </div>
                        </div>

                        {/* CV Preview Section */}
                        <div className="w-full md:w-1/2 p-6 bg-white overflow-y-auto max-h-[calc(100vh-2rem)]">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t.cvPreview}</h2>
                            <div ref={cvContentRef} className="cv-document p-8 bg-white shadow-lg rounded-lg">
                                {/* Personal Information */}
                                <div className="text-center mb-6">
                                    {personalInfo.profilePicture && (
                                        <div
                                            className="w-32 h-32 rounded-full mx-auto mb-4 border-4 shadow-lg overflow-hidden flex items-center justify-center"
                                            style={{ borderColor: personalInfo.profileFrameColor || '#bfdbfe' }}
                                        > {/* Added flex for centering */}
                                            <img
                                                src={personalInfo.profilePicture}
                                                alt="Profile"
                                                // Use explicitly calculated dimensions for PDF export reliability
                                                width={personalInfo.profilePictureWidth || 150}
                                                height={personalInfo.profilePictureHeight || 150}
                                                style={{ objectFit: 'cover' }} // Keep object-fit for visual consistency in browser
                                            />
                                        </div>
                                    )}
                                    <h1 className="text-4xl font-bold text-gray-900 mb-1">{personalInfo.name}</h1>
                                    <p className="text-xl text-gray-700 mb-3">{personalInfo.title}</p>
                                    <div className="flex flex-wrap justify-center text-gray-600 text-sm">
                                        {personalInfo.email && <span className="mx-2">{personalInfo.email}</span>}
                                        {personalInfo.phone && <span className="mx-2">{personalInfo.phone}</span>}
                                        {personalInfo.linkedin && <a href={toAbsoluteUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="mx-2 text-blue-600 hover:underline">{personalInfo.linkedin}</a>}
                                        {personalInfo.github && <a href={toAbsoluteUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer" className="mx-2 text-blue-600 hover:underline">{personalInfo.github}</a>}
                                        {personalInfo.website && <a href={toAbsoluteUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="mx-2 text-blue-600 hover:underline">{personalInfo.website}</a>}
                                        {personalInfo.address && <span className="mx-2">{personalInfo.address}</span>}
                                    </div>
                                </div>

                                {/* Summary */}
                                {summary && (
                                    <div className="mb-6 no-break-inside">
                                        <h3 className="text-lg cv-section-title">{t.summary}</h3>
                                        <p className="text-gray-700 leading-relaxed">{summary}</p>
                                    </div>
                                )}

                                {/* Work Experience */}
                                {experiences.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg cv-section-title">{t.workExperience}</h3>
                                        {experiences.map((exp) => {
                                            return (
                                                <div key={exp.id} className="mb-4 no-break-inside">
                                                    <h4 className="cv-item-title text-md">{exp.title}</h4>
                                                    <p className="cv-item-subtitle text-sm">{exp.company} | {exp.location}</p>
                                                    <p className="cv-item-dates text-xs mb-2">{exp.startDate} - {exp.endDate === 'Present' ? t.present : exp.endDate}</p>
                                                    <ul className="cv-description-list text-sm">
                                                        {exp.description.filter(Boolean).map((desc, index) => {
                                                            return (
                                                                <li key={index}>{desc}</li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Education */}
                                {education.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg cv-section-title">{t.education}</h3>
                                        {education.map((edu) => {
                                            return (
                                                <div key={edu.id} className="mb-4 no-break-inside">
                                                    <h4 className="cv-item-title text-md">{edu.degree}</h4>
                                                    <p className="cv-item-subtitle text-sm">{edu.university} | {edu.location}</p>
                                                    <p className="cv-item-dates text-xs mb-2">{edu.year}</p>
                                                    {edu.details && <p className="text-gray-700 text-sm">{edu.details}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Skills */}
                                {Object.values(skills).some(arr => Array.isArray(arr) && arr.length > 0 && arr.some(Boolean)) && (
                                    <div className="mb-6">
                                        <h3 className="text-lg cv-section-title">{t.skills}</h3>
                                        {Object.keys(skills).map((category) => {
                                            const skillValues = Array.isArray(skills[category]) ? skills[category] : [];
                                            return (
                                                <div key={category} className="mb-4">
                                                    <h3 className="text-lg font-medium text-gray-700 text-md">{formatCategoryLabel(category)}:</h3>
                                                    {skillValues.map((skill, index) => {
                                                        return (
                                                            <div key={index} className="flex items-center mb-2 no-break-inside">
                                                                <p className="cv-item-subtitle text-sm mb-1">{skill}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Projects */}
                                {projects.length > 0 && (
                                    <div className="mb-6 no-break-inside">
                                        <h3 className="text-lg cv-section-title">{t.projects}</h3>
                                        {projects.map((proj) => {
                                            return (
                                                <div key={proj.id} className="mb-4 no-break-inside">
                                                    <h4 className="cv-item-title text-md">{proj.name}</h4>
                                                    <p className="cv-item-subtitle text-sm mb-1">{proj.technologies}</p>
                                                    <p className="text-gray-700 text-sm leading-relaxed">{proj.description}</p>
                                                    {proj.link && (
                                                        <p className="text-sm">
                                                            <a href={toAbsoluteUrl(proj.link)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                {proj.link}
                                                            </a>
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Awards/Certifications */}
                                {awards.length > 0 && (
                                    <div className="mb-6 ">
                                        <h3 className="text-lg cv-section-title">{t.awardsCertifications}</h3>
                                        {awards.map((award) => {
                                            return (
                                                <div key={award.id} className="mb-4 no-break-inside">
                                                    <h4 className="cv-item-title text-md">{award.name}</h4>
                                                    <p className="cv-item-subtitle text-sm mb-1">{award.year}</p>
                                                    {award.description && <p className="text-gray-700 text-sm leading-relaxed">{award.description}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Custom Sections */}
                                {customSections.length > 0 && customSections.some(section => toStringSafe(section.title).trim() || (Array.isArray(section.items) && section.items.some(Boolean))) && (
                                    <div className="mb-6">
                                        {customSections.map((section) => {
                                            const sectionTitle = toStringSafe(section.title).trim();
                                            const sectionItems = (Array.isArray(section.items) ? section.items : []).map(item => toStringSafe(item).trim()).filter(Boolean);

                                            if (!sectionTitle && sectionItems.length === 0) {
                                                return null;
                                            }

                                            return (
                                                <div key={section.id} className="mb-6 no-break-inside">
                                                    {sectionTitle && <h3 className="text-lg cv-section-title">{sectionTitle}</h3>}
                                                    {sectionItems.length > 0 && (
                                                        <ul className="cv-description-list text-sm">
                                                            {sectionItems.map((item, itemIndex) => {
                                                                return <li key={itemIndex}>{item}</li>;
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
