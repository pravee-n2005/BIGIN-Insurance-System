'use strict';

const { validateCreate } = require('../policy/policy.validation');

// Validates one normalized import row.
// ctx = { insurerNames: Set<uppercase name>, leadSourceNames: Set<uppercase name> }
// Returns string[] of error messages (empty array = shape-valid; duplicate
// checks are applied separately by the caller since they need cross-row state).
function validateImportRow(row, ctx) {
  const errors = validateCreate(row);

  if (row.insurerName && typeof row.insurerName === 'string') {
    if (!ctx.insurerNames.has(row.insurerName.trim().toUpperCase())) {
      errors.push(`Unknown insurer "${row.insurerName}" — add it in Master Data first or check spelling.`);
    }
  }

  if (row.leadSource && typeof row.leadSource === 'string') {
    if (!ctx.leadSourceNames.has(row.leadSource.trim().toUpperCase())) {
      errors.push(`Unknown lead source "${row.leadSource}" — add it in Master Data first or check spelling.`);
    }
  }

  return errors;
}

module.exports = { validateImportRow };
