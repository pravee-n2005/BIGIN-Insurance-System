'use strict';

// Manual shape validation — no third-party library, matches the convention used
// in policy.validation.js. Every validator returns string[] of error messages
// (empty array = valid).

const MONTH_RE = /^\d{4}-\d{2}$/;

function isPositiveInt(v) {
  return v !== undefined && v !== null && Number.isInteger(Number(v)) && Number(v) > 0;
}

function isNonNegativeNumber(v) {
  return v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) >= 0;
}

function isValidDate(v) {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function trimStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// ── Create ────────────────────────────────────────────────────────────────────

function validateCreate(body) {
  const errors = [];

  if (!isPositiveInt(body.insurerId))
    errors.push('insurerId is required and must be a positive integer.');

  if (!trimStr(body.statementRefNo))
    errors.push('statementRefNo is required.');
  else if (trimStr(body.statementRefNo).length > 100)
    errors.push('statementRefNo must not exceed 100 characters.');

  if (!isValidDate(body.statementDate))
    errors.push('statementDate is required and must be a valid date.');

  if (body.creditDate !== undefined && body.creditDate !== null && body.creditDate !== '' && !isValidDate(body.creditDate))
    errors.push('creditDate must be a valid date.');

  if (!body.businessMonth || !MONTH_RE.test(body.businessMonth))
    errors.push('businessMonth is required and must be in YYYY-MM format.');

  if (body.remarks !== undefined && body.remarks !== null && trimStr(body.remarks).length > 500)
    errors.push('remarks must not exceed 500 characters.');

  if (body.statementFileUrl !== undefined && body.statementFileUrl !== null && trimStr(body.statementFileUrl).length > 500)
    errors.push('statementFileUrl must not exceed 500 characters.');

  return errors;
}

// ── Update (metadata only — every field optional, insurerId rejected) ─────────

function validateUpdate(body) {
  const errors = [];

  if ('insurerId' in body)
    errors.push('insurerId cannot be changed on an existing statement.');

  if ('statementRefNo' in body) {
    if (!trimStr(body.statementRefNo))
      errors.push('statementRefNo cannot be empty.');
    else if (trimStr(body.statementRefNo).length > 100)
      errors.push('statementRefNo must not exceed 100 characters.');
  }

  if ('statementDate' in body && !isValidDate(body.statementDate))
    errors.push('statementDate must be a valid date.');

  if ('creditDate' in body && body.creditDate !== null && body.creditDate !== '' && !isValidDate(body.creditDate))
    errors.push('creditDate must be a valid date.');

  if ('businessMonth' in body && !MONTH_RE.test(body.businessMonth))
    errors.push('businessMonth must be in YYYY-MM format.');

  if ('remarks' in body && body.remarks !== null && trimStr(body.remarks).length > 500)
    errors.push('remarks must not exceed 500 characters.');

  if ('statementFileUrl' in body && body.statementFileUrl !== null && trimStr(body.statementFileUrl).length > 500)
    errors.push('statementFileUrl must not exceed 500 characters.');

  return errors;
}

// ── Bulk attach policies ──────────────────────────────────────────────────────

function validateAttachPolicies(body) {
  const errors = [];

  if (!Array.isArray(body.policies))
    return ['policies must be an array of { policyId, taxableValue } objects.'];

  if (body.policies.length === 0)
    errors.push('policies array cannot be empty.');

  if (body.policies.length > 200)
    errors.push('Cannot attach more than 200 policies in a single request.');

  const seenIds = new Set();
  body.policies.forEach((item, idx) => {
    const tag = `policies[${idx}]`;
    if (!item || typeof item !== 'object') {
      errors.push(`${tag} must be an object.`);
      return;
    }
    if (!isPositiveInt(item.policyId))
      errors.push(`${tag}.policyId must be a positive integer.`);
    else if (seenIds.has(Number(item.policyId)))
      errors.push(`${tag}.policyId duplicates an earlier entry.`);
    else
      seenIds.add(Number(item.policyId));

    if (!isNonNegativeNumber(item.taxableValue))
      errors.push(`${tag}.taxableValue must be a non-negative number.`);
  });

  return errors;
}

// ── Update single attached policy's taxable value ─────────────────────────────

function validateUpdateStatementPolicy(body) {
  const errors = [];
  if (!isNonNegativeNumber(body.taxableValue))
    errors.push('taxableValue is required and must be a non-negative number.');
  return errors;
}

// ── Credit details (Module 4) ─────────────────────────────────────────────────

function validateCreditDetails(body) {
  const errors = [];
  if ('amountCredited' in body) {
    if (body.amountCredited !== null && body.amountCredited !== '' &&
        !isNonNegativeNumber(body.amountCredited))
      errors.push('amountCredited must be a non-negative number or null.');
  }
  if ('bankReference' in body && body.bankReference !== null && trimStr(body.bankReference).length > 100)
    errors.push('bankReference must not exceed 100 characters.');
  if ('bankAccount' in body && body.bankAccount !== null && trimStr(body.bankAccount).length > 100)
    errors.push('bankAccount must not exceed 100 characters.');
  return errors;
}

module.exports = {
  validateCreate,
  validateUpdate,
  validateAttachPolicies,
  validateUpdateStatementPolicy,
  validateCreditDetails,
};
