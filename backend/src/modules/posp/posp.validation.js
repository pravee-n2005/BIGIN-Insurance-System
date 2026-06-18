'use strict';

function validateCreateMember(body) {
  const errors = [];
  if (!body.name?.trim()) errors.push('POSP name is required.');
  if (!body.code?.trim()) errors.push('POSP code is required.');
  if (body.status && !['ACTIVE', 'INACTIVE'].includes(body.status)) {
    errors.push('Status must be ACTIVE or INACTIVE.');
  }
  return errors;
}

function validateUpdateMember(body) {
  const errors = [];
  if (body.name !== undefined && !body.name?.trim()) errors.push('POSP name cannot be empty.');
  if (body.code !== undefined && !body.code?.trim()) errors.push('POSP code cannot be empty.');
  if (body.status && !['ACTIVE', 'INACTIVE'].includes(body.status)) {
    errors.push('Status must be ACTIVE or INACTIVE.');
  }
  return errors;
}

function validateCreateEntry(body) {
  const errors = [];
  if (!body.pospMemberId) errors.push('POSP member is required.');
  if (!body.entryDate)    errors.push('Entry date is required.');
  if (!body.policyNumber?.trim()) errors.push('Policy number is required.');
  if (!body.customerName?.trim()) errors.push('Customer name is required.');

  const premium = Number(body.premium);
  if (body.premium === undefined || body.premium === '') errors.push('Premium is required.');
  else if (isNaN(premium) || premium < 0) errors.push('Premium must be a non-negative number.');

  const commissionRate = Number(body.commissionRate);
  if (body.commissionRate === undefined || body.commissionRate === '') errors.push('Commission rate is required.');
  else if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    errors.push('Commission rate must be between 0 and 100.');
  }

  const pospShare = Number(body.pospShare);
  if (body.pospShare === undefined || body.pospShare === '') errors.push('POSP share % is required.');
  else if (isNaN(pospShare) || pospShare < 0 || pospShare > 100) {
    errors.push('POSP share must be between 0 and 100.');
  }

  if (body.paymentStatus && !['PENDING', 'PAID', 'PARTIALLY_PAID'].includes(body.paymentStatus)) {
    errors.push('Payment status must be PENDING, PAID, or PARTIALLY_PAID.');
  }

  return errors;
}

function validateUpdateEntry(body) {
  const errors = [];
  if (body.commissionRate !== undefined) {
    const v = Number(body.commissionRate);
    if (isNaN(v) || v < 0 || v > 100) errors.push('Commission rate must be between 0 and 100.');
  }
  if (body.pospShare !== undefined) {
    const v = Number(body.pospShare);
    if (isNaN(v) || v < 0 || v > 100) errors.push('POSP share must be between 0 and 100.');
  }
  if (body.paymentStatus !== undefined && !['PENDING', 'PAID', 'PARTIALLY_PAID'].includes(body.paymentStatus)) {
    errors.push('Payment status must be PENDING, PAID, or PARTIALLY_PAID.');
  }
  if (body.premium !== undefined) {
    const v = Number(body.premium);
    if (isNaN(v) || v < 0) errors.push('Premium must be a non-negative number.');
  }
  return errors;
}

module.exports = { validateCreateMember, validateUpdateMember, validateCreateEntry, validateUpdateEntry };
