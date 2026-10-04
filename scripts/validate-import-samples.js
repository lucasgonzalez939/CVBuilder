#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { normalizeImportedDataWithReport } = require('../src/normalizers');

const ROOT = path.resolve(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'sample-imports');

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
