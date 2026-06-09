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
  if (!isPositiveNumber(body.grossPremium)) errors.push('grossPremium must be a non-negative number.');
  if (!isPositiveNumber(body.netPremium)) errors.push('netPremium must be a non-negative number.');
  if (!isPositiveNumber(body.gstPercent)) errors.push('gstPercent must be a non-negative number.');
  if (!isPositiveNumber(body.commissionPercent)) errors.push('commissionPercent must be a non-negative number.');
  if (!isPositiveNumber(body.tdsPercent)) errors.push('tdsPercent must be a non-negative number.');
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
  if (body.grossPremium !== undefined && !isPositiveNumber(body.grossPremium))
    errors.push('grossPremium must be a non-negative number.');
  if (body.netPremium !== undefined && !isPositiveNumber(body.netPremium))
    errors.push('netPremium must be a non-negative number.');
  if (body.gstPercent !== undefined && !isPositiveNumber(body.gstPercent))
    errors.push('gstPercent must be a non-negative number.');
  if (body.commissionPercent !== undefined && !isPositiveNumber(body.commissionPercent))
    errors.push('commissionPercent must be a non-negative number.');
  if (body.tdsPercent !== undefined && !isPositiveNumber(body.tdsPercent))
    errors.push('tdsPercent must be a non-negative number.');
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

module.exports = { validateCreate, validateUpdate, validateCancellation };
