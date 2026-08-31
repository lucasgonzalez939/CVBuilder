#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CURRENT_SCHEMA_VERSION = 2;
const ROOT = path.resolve(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'sample-imports');

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
    profilePictureWidth: null,
    profilePictureHeight: null,
  },
  summary: '',
  experiences: [],
  education: [],
  skills: {
    programmingLanguages: [],
    frameworks: [],
    databases: [],
    tools: [],
  },
  projects: [],
  awards: [],
};

const createEmptyLocaleData = () => ({
  personalInfo: { ...emptyCvDataTemplate.personalInfo },
  summary: '',
  experiences: [],
  education: [],
  skills: {
    programmingLanguages: [],
    frameworks: [],
    databases: [],
    tools: [],
  },
  projects: [],
  awards: [],
});

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toStringSafe = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const coerceToStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => toStringSafe(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  }

  if (isObject(value)) {
    if (Array.isArray(value.items)) return coerceToStringArray(value.items);
    if (Array.isArray(value.list)) return coerceToStringArray(value.list);
    if (Array.isArray(value.values)) return coerceToStringArray(value.values);

    return Object.values(value).flatMap((item) => coerceToStringArray(item)).filter(Boolean);
  }

  return [];
};

const normalizeSkills = (skillsInput) => {
  const normalized = { ...createEmptyLocaleData().skills };
  if (!isObject(skillsInput)) return normalized;

  Object.entries(skillsInput).forEach(([category, value]) => {
    normalized[category] = coerceToStringArray(value);
  });

  return normalized;
};

const normalizeLocaleData = (localeInput) => {
  const source = isObject(localeInput) ? localeInput : {};
  return {
    ...createEmptyLocaleData(),
    ...source,
    personalInfo: {
      ...emptyCvDataTemplate.personalInfo,
      ...(isObject(source.personalInfo) ? source.personalInfo : {}),
      name: toStringSafe(source.personalInfo?.name),
      title: toStringSafe(source.personalInfo?.title),
      email: toStringSafe(source.personalInfo?.email),
      phone: toStringSafe(source.personalInfo?.phone),
      linkedin: toStringSafe(source.personalInfo?.linkedin),
      github: toStringSafe(source.personalInfo?.github),
      website: toStringSafe(source.personalInfo?.website),
      address: toStringSafe(source.personalInfo?.address),
      profilePicture: toStringSafe(source.personalInfo?.profilePicture),
      profilePictureWidth: Number.isFinite(Number(source.personalInfo?.profilePictureWidth)) ? Number(source.personalInfo.profilePictureWidth) : null,
      profilePictureHeight: Number.isFinite(Number(source.personalInfo?.profilePictureHeight)) ? Number(source.personalInfo.profilePictureHeight) : null,
    },
    summary: toStringSafe(source.summary),
    experiences: Array.isArray(source.experiences) ? source.experiences : [],
    education: Array.isArray(source.education) ? source.education : [],
    projects: Array.isArray(source.projects) ? source.projects : [],
    awards: Array.isArray(source.awards) ? source.awards : [],
    skills: normalizeSkills(source.skills),
  };
};

const localeSectionKeys = ['personalInfo', 'summary', 'experiences', 'education', 'skills', 'projects', 'awards'];

const looksLikeLocaleData = (value) => {
  if (!isObject(value)) return false;
  return localeSectionKeys.some((section) => Object.prototype.hasOwnProperty.call(value, section));
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

  for (const section of ['experiences', 'education', 'projects', 'awards']) {
    if (localeData[section] !== undefined && !Array.isArray(localeData[section])) {
      warnings.push(`${localeKey}.${section} was not an array and was reset.`);
    }
  }

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

const printSummary = (fileName, report) => {
  const enCategories = Object.keys(report.data.en.skills);
  const esCategories = Object.keys(report.data.es.skills);

  console.log(`\n=== ${fileName} ===`);
  console.log(`Warnings: ${report.warnings.length}`);
  report.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  console.log(`EN skill categories: ${enCategories.join(', ')}`);
  console.log(`ES skill categories: ${esCategories.join(', ')}`);
};

const main = () => {
  const files = fs.readdirSync(SAMPLE_DIR).filter((name) => name.endsWith('.json')).sort();

  if (files.length === 0) {
    console.error('No sample JSON files found.');
    process.exit(1);
  }

  for (const fileName of files) {
    const absPath = path.join(SAMPLE_DIR, fileName);
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    const report = normalizeImportedDataWithReport(parsed);
    printSummary(fileName, report);
  }
};

main();
