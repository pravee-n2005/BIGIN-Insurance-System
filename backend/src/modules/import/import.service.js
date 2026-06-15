const prisma = require('../../config/prisma');
const { validateCreate } = require('../policy/policy.validation');
const { create } = require('../policy/policy.service');
const { parseWorkbook } = require('./import.parser');
const { validateImportRow } = require('./import.validation');

async function bulkImport(rows, userId) {
  const results = { imported: 0, skipped: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // ── Validation ─────────────────────────────────────────────────────────
    const validationErrors = validateCreate(row);
    if (validationErrors.length) {
      results.failed++;
      results.errors.push({ row: rowNum, policyNumber: row.policyNumber || '—', reason: validationErrors });
      continue;
    }

    // ── Insert ──────────────────────────────────────────────────────────────
    try {
      await create(row, userId);
      results.imported++;
    } catch (err) {
      if (err.code === 'P2002') {
        // Duplicate policy number — skip silently
        results.skipped++;
        results.errors.push({
          row: rowNum,
          policyNumber: row.policyNumber,
          reason: 'Duplicate policy number — already exists.',
        });
      } else {
        results.failed++;
        results.errors.push({
          row: rowNum,
          policyNumber: row.policyNumber || '—',
          reason: err.message,
        });
      }
    }
  }

  return results;
}

// ─── Excel template preview/commit ────────────────────────────────────────────
// Classifies every row in the uploaded workbook as 'valid', 'duplicate', or
// 'invalid' WITHOUT writing to the database. Duplicate checks cover both
// duplicates within the file itself and policy numbers already in the DB.

async function classifyRows(buffer) {
  const { headerErrors, rows } = await parseWorkbook(buffer);
  if (headerErrors.length) {
    const err = new Error(headerErrors.join(' '));
    err.status = 400;
    throw err;
  }

  const [insurers, leadMembers] = await Promise.all([
    prisma.insurer.findMany({ select: { name: true } }),
    prisma.leadMember.findMany({ select: { name: true } }),
  ]);
  const ctx = {
    insurerNames:    new Set(insurers.map((i) => i.name.toUpperCase())),
    leadSourceNames: new Set(leadMembers.map((l) => l.name.toUpperCase())),
  };

  const policyNumbers = rows
    .map((r) => r.normalized.policyNumber)
    .filter((v) => typeof v === 'string' && v.trim() !== '');

  const existing = policyNumbers.length
    ? await prisma.policy.findMany({
        where: { policyNumber: { in: policyNumbers } },
        select: { policyNumber: true },
      })
    : [];
  const existingSet = new Set(existing.map((p) => p.policyNumber));

  const seenInFile = new Set();
  const classified = [];

  for (const r of rows) {
    const { rowNum, normalized } = r;
    const policyNumber = typeof normalized.policyNumber === 'string' ? normalized.policyNumber.trim() : '';
    const errors = validateImportRow(normalized, ctx);

    let status;
    if (errors.length) {
      status = 'invalid';
    } else if (existingSet.has(policyNumber)) {
      status = 'duplicate';
      errors.push('Policy number already exists in the database — row will be skipped.');
    } else if (seenInFile.has(policyNumber)) {
      status = 'duplicate';
      errors.push('Duplicate policy number within this file — row will be skipped.');
    } else {
      status = 'valid';
      seenInFile.add(policyNumber);
    }

    classified.push({
      row: rowNum,
      policyNumber: policyNumber || '—',
      status,
      errors,
      data: normalized,
    });
  }

  return classified;
}

async function previewImport(buffer) {
  const classified = await classifyRows(buffer);

  const summary = {
    totalRows: classified.length,
    validRows: classified.filter((r) => r.status === 'valid').length,
    duplicateRows: classified.filter((r) => r.status === 'duplicate').length,
    invalidRows: classified.filter((r) => r.status === 'invalid').length,
  };

  return {
    ...summary,
    errors: classified.filter((r) => r.errors.length).map(({ row, policyNumber, status, errors }) => ({ row, policyNumber, status, errors })),
    rows: classified,
  };
}

async function commitImport(buffer, userId) {
  const classified = await classifyRows(buffer);
  const validRows = classified.filter((r) => r.status === 'valid').map((r) => r.data);

  const summary = {
    totalRows: classified.length,
    validRows: validRows.length,
    duplicateRows: classified.filter((r) => r.status === 'duplicate').length,
    invalidRows: classified.filter((r) => r.status === 'invalid').length,
  };

  const results = validRows.length
    ? await bulkImport(validRows, userId)
    : { imported: 0, skipped: 0, failed: 0, errors: [] };

  return { ...summary, ...results };
}

module.exports = { bulkImport, previewImport, commitImport };
