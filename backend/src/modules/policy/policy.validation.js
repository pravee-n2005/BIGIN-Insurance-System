const INSURANCE_CATEGORIES = ['LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];
const PAYMENT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
const POLICY_STATUSES = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];

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

module.exports = { validateCreate, validateUpdate };
