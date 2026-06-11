const MONTH_REGEX = /^\d{4}-\d{2}$/;

function isPositiveNumber(val) {
  return val !== undefined && val !== null && val !== '' && !isNaN(Number(val)) && Number(val) >= 0;
}

function isValidMonth(val) {
  if (typeof val !== 'string' || !MONTH_REGEX.test(val)) return false;
  const month = Number(val.slice(5, 7));
  return month >= 1 && month <= 12;
}

function validateCreate(body) {
  const errors = [];

  if (body.leadMemberId === undefined || body.leadMemberId === null || body.leadMemberId === '')
    errors.push('leadMemberId is required.');
  else if (!Number.isInteger(Number(body.leadMemberId)) || Number(body.leadMemberId) <= 0)
    errors.push('leadMemberId must be a positive integer.');

  if (!isValidMonth(body.month))
    errors.push('month is required and must be in YYYY-MM format.');

  if (!isPositiveNumber(body.points))
    errors.push('points must be a non-negative number.');

  if (body.pointValue !== undefined && body.pointValue !== null && body.pointValue !== '' && !isPositiveNumber(body.pointValue))
    errors.push('pointValue must be a non-negative number.');

  if (body.remarks !== undefined && body.remarks !== null && String(body.remarks).length > 500)
    errors.push('remarks must not exceed 500 characters.');

  return errors;
}

function validateUpdate(body) {
  const errors = [];

  if (body.leadMemberId !== undefined &&
      (!Number.isInteger(Number(body.leadMemberId)) || Number(body.leadMemberId) <= 0))
    errors.push('leadMemberId must be a positive integer.');

  if (body.month !== undefined && !isValidMonth(body.month))
    errors.push('month must be in YYYY-MM format.');

  if (body.points !== undefined && !isPositiveNumber(body.points))
    errors.push('points must be a non-negative number.');

  if (body.pointValue !== undefined && body.pointValue !== null && body.pointValue !== '' && !isPositiveNumber(body.pointValue))
    errors.push('pointValue must be a non-negative number.');

  if (body.remarks !== undefined && body.remarks !== null && String(body.remarks).length > 500)
    errors.push('remarks must not exceed 500 characters.');

  return errors;
}

module.exports = { validateCreate, validateUpdate, isValidMonth, isPositiveNumber, MONTH_REGEX };
