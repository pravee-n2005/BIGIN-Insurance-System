const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isNonNegativeInteger(val) {
  return val !== undefined && val !== null && val !== '' && Number.isInteger(Number(val)) && Number(val) >= 0;
}

function isNonNegativeNumber(val) {
  return val !== undefined && val !== null && val !== '' && !isNaN(Number(val)) && Number(val) >= 0;
}

function isValidDate(val) {
  return typeof val === 'string' && DATE_REGEX.test(val) && !isNaN(new Date(val).getTime());
}

function validateCreate(body) {
  const errors = [];

  if (body.employeeId === undefined || body.employeeId === null || body.employeeId === '')
    errors.push('employeeId is required.');
  else if (!Number.isInteger(Number(body.employeeId)) || Number(body.employeeId) <= 0)
    errors.push('employeeId must be a positive integer.');

  if (!isValidDate(body.date))
    errors.push('date is required and must be in YYYY-MM-DD format.');

  for (const field of ['totalCalls', 'touchBase', 'interested']) {
    if (!isNonNegativeInteger(body[field]))
      errors.push(`${field} must be a non-negative integer.`);
  }

  if (!body.conversionType || !['LIFE', 'HEALTH'].includes(body.conversionType))
    errors.push('conversionType is required and must be LIFE or HEALTH.');

  if (body.remarks !== undefined && body.remarks !== null && String(body.remarks).length > 500)
    errors.push('remarks must not exceed 500 characters.');

  return errors;
}

function validateUpdate(body) {
  const errors = [];

  if (body.employeeId !== undefined &&
      (!Number.isInteger(Number(body.employeeId)) || Number(body.employeeId) <= 0))
    errors.push('employeeId must be a positive integer.');

  if (body.date !== undefined && !isValidDate(body.date))
    errors.push('date must be in YYYY-MM-DD format.');

  for (const field of ['totalCalls', 'touchBase', 'interested']) {
    if (body[field] !== undefined && !isNonNegativeInteger(body[field]))
      errors.push(`${field} must be a non-negative integer.`);
  }

  if (body.conversionType !== undefined && !['LIFE', 'HEALTH'].includes(body.conversionType))
    errors.push('conversionType must be LIFE or HEALTH.');

  if (body.remarks !== undefined && body.remarks !== null && String(body.remarks).length > 500)
    errors.push('remarks must not exceed 500 characters.');

  return errors;
}

function validateSettings(body) {
  const errors = [];

  for (const field of ['touchBasePoints', 'interestedPoints', 'lifeConversionPoints', 'healthConversionPoints', 'amountPerPoint']) {
    if (body[field] !== undefined && !isNonNegativeNumber(body[field]))
      errors.push(`${field} must be a non-negative number.`);
  }

  return errors;
}

function validateWeeklyReportQuery(query) {
  const errors = [];

  if (!isValidDate(query.weekStart))
    errors.push('weekStart is required and must be in YYYY-MM-DD format.');

  if (!isValidDate(query.weekEnd))
    errors.push('weekEnd is required and must be in YYYY-MM-DD format.');

  if (query.employeeId !== undefined && query.employeeId !== '' &&
      (!Number.isInteger(Number(query.employeeId)) || Number(query.employeeId) <= 0))
    errors.push('employeeId must be a positive integer.');

  return errors;
}

module.exports = { validateCreate, validateUpdate, validateSettings, validateWeeklyReportQuery, isValidDate };
