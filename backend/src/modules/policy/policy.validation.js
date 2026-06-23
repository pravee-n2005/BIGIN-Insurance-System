const INSURANCE_CATEGORIES = ['LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];
const PAYMENT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
const POLICY_STATUSES = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];
const CANCELLATION_REASONS = [
  'CUSTOMER_DECLINED', 'CUSTOMER_REQUESTED_CANCELLATION', 'PREMIUM_TOO_HIGH',
  'CUSTOMER_PURCHASED_ELSEWHERE', 'CUSTOMER_NOT_REACHABLE', 'POLICY_ISSUED_INCORRECTLY',
  'WRONG_POLICY_DETAILS', 'KYC_DOCUMENTS_NOT_PROVIDED', 'INSURER_REJECTED_PROPOSAL',
  'PAYMENT_NOT_RECEIVED', 'PROPOSAL_EXPIRED', 'POLICY_REPLACED', 'RENEWAL_NOT_PROCEEDED',
  'DUPLICATE_ENTRY', 'DUPLICATE_POLICY_IMPORTED', 'TEST_DUMMY_ENTRY', 'OTHER',
];

function isPositiveNumber(val) {
  return val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) >= 0;
}

// Must be a number strictly greater than 0 (used for grossPremium / netPremium).
function isAboveZero(val) {
  return val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0;
}

// Required percent: must be a number between 0 and 100 inclusive.
function isPercent(val) {
  return isPositiveNumber(val) && Number(val) <= 100;
}

// Optional percent: blank/undefined/null is allowed (treated as 0%); if
// provided, must be a number between 0 and 100 inclusive.
function isOptionalPercent(val) {
  if (val === undefined || val === null || val === '') return true;
  return isPercent(val);
}

function isValidDate(val) {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function validateCreate(body) {
  const errors = [];

  if (!body.insurerName?.trim()) errors.push('insurerName is required.');
  if (!INSURANCE_CATEGORIES.includes(body.insuranceCategory))
    errors.push(`insuranceCategory must be one of: ${INSURANCE_CATEGORIES.join(', ')}.`);
  if (!body.productName?.trim()) errors.push('productName is required.');
  if (!body.customerName?.trim()) errors.push('customerName is required.');
  if (!body.policyNumber?.trim()) errors.push('policyNumber is required.');
  if (!isValidDate(body.issueDate)) errors.push('issueDate is required and must be a valid date.');
  if (!PAYMENT_FREQUENCIES.includes(body.paymentFrequency))
    errors.push(`paymentFrequency must be one of: ${PAYMENT_FREQUENCIES.join(', ')}.`);
  if (!isAboveZero(body.grossPremium)) errors.push('grossPremium must be greater than 0.');
  if (!isAboveZero(body.netPremium)) errors.push('netPremium must be greater than 0.');
  if (!isPercent(body.gstPercent)) errors.push('gstPercent must be a number between 0 and 100.');
  if (!isOptionalPercent(body.commissionPercent)) errors.push('commissionPercent must be a number between 0 and 100.');
  if (!isOptionalPercent(body.tdsPercent)) errors.push('tdsPercent must be a number between 0 and 100.');
  if (!body.leadSource?.trim()) errors.push('leadSource is required.');

  if (body.status && !POLICY_STATUSES.includes(body.status))
    errors.push(`status must be one of: ${POLICY_STATUSES.join(', ')}.`);

  if (body.invoiceDate && !isValidDate(body.invoiceDate))
    errors.push('invoiceDate must be a valid date.');
  if (body.creditedDate && !isValidDate(body.creditedDate))
    errors.push('creditedDate must be a valid date.');

  return errors;
}

function validateUpdate(body) {
  const errors = [];

  if (body.insuranceCategory !== undefined && !INSURANCE_CATEGORIES.includes(body.insuranceCategory))
    errors.push(`insuranceCategory must be one of: ${INSURANCE_CATEGORIES.join(', ')}.`);
  if (body.paymentFrequency !== undefined && !PAYMENT_FREQUENCIES.includes(body.paymentFrequency))
    errors.push(`paymentFrequency must be one of: ${PAYMENT_FREQUENCIES.join(', ')}.`);
  if (body.status !== undefined && !POLICY_STATUSES.includes(body.status))
    errors.push(`status must be one of: ${POLICY_STATUSES.join(', ')}.`);
  if (body.grossPremium !== undefined && !isAboveZero(body.grossPremium))
    errors.push('grossPremium must be greater than 0.');
  if (body.netPremium !== undefined && !isAboveZero(body.netPremium))
    errors.push('netPremium must be greater than 0.');
  if (body.gstPercent !== undefined && !isPercent(body.gstPercent))
    errors.push('gstPercent must be a number between 0 and 100.');
  if (body.commissionPercent !== undefined && !isOptionalPercent(body.commissionPercent))
    errors.push('commissionPercent must be a number between 0 and 100.');
  if (body.tdsPercent !== undefined && !isOptionalPercent(body.tdsPercent))
    errors.push('tdsPercent must be a number between 0 and 100.');
  if (body.leadSource !== undefined && !body.leadSource?.trim())
    errors.push('leadSource is required and cannot be empty.');
  if (body.issueDate !== undefined && !isValidDate(body.issueDate))
    errors.push('issueDate must be a valid date.');
  if (body.invoiceDate !== undefined && body.invoiceDate !== null && !isValidDate(body.invoiceDate))
    errors.push('invoiceDate must be a valid date.');
  if (body.creditedDate !== undefined && body.creditedDate !== null && !isValidDate(body.creditedDate))
    errors.push('creditedDate must be a valid date.');

  return errors;
}

function validateCancellation(body, existingStatus) {
  const errors = [];
  const transitioningToCancelled = existingStatus !== 'CANCELLED' && body.status === 'CANCELLED';

  if (transitioningToCancelled) {
    if (!body.cancellationReason) {
      errors.push('cancellationReason is required when cancelling a policy.');
    } else if (!CANCELLATION_REASONS.includes(body.cancellationReason)) {
      errors.push(`cancellationReason must be one of: ${CANCELLATION_REASONS.join(', ')}.`);
    } else if (body.cancellationReason === 'OTHER' && !body.cancellationReasonOther?.trim()) {
      errors.push('cancellationReasonOther is required when reason is OTHER.');
    }
  } else if (body.cancellationReason !== undefined && !CANCELLATION_REASONS.includes(body.cancellationReason)) {
    errors.push(`cancellationReason must be one of: ${CANCELLATION_REASONS.join(', ')}.`);
  }

  if (body.cancellationReasonOther && body.cancellationReasonOther.length > 500) {
    errors.push('cancellationReasonOther must not exceed 500 characters.');
  }

  return errors;
}

module.exports = {
  validateCreate, validateUpdate, validateCancellation, isPositiveNumber, isAboveZero, isPercent, isOptionalPercent,
  INSURANCE_CATEGORIES, PAYMENT_FREQUENCIES, POLICY_STATUSES,
};
