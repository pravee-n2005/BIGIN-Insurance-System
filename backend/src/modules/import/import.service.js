const { validateCreate } = require('../policy/policy.validation');
const { create } = require('../policy/policy.service');

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

module.exports = { bulkImport };
