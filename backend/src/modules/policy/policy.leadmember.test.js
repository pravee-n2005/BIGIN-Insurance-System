const test = require('node:test');
const assert = require('node:assert');

const { validateCreate, validateUpdate } = require('./policy.validation');

const BASE_CREATE_BODY = {
  insurerName: 'Go Digit General',
  insuranceCategory: 'MOTOR',
  productName: 'Car Insurance',
  customerName: 'TEST CUSTOMER',
  policyNumber: 'TEST-LEAD-0001',
  issueDate: '2026-06-01',
  paymentFrequency: 'YEARLY',
  grossPremium: 10000,
  netPremium: 10000,
  gstPercent: 18,
  commissionPercent: 20,
  tdsPercent: 10,
  leadSource: 'Leadership',
};

// ─── Rule A/B — every policy must have exactly one Lead Member, never zero ────

test('validateCreate — passes with a valid leadSource', () => {
  assert.deepStrictEqual(validateCreate(BASE_CREATE_BODY), []);
});

test('validateCreate — rejects missing leadSource', () => {
  const body = { ...BASE_CREATE_BODY };
  delete body.leadSource;
  const errors = validateCreate(body);
  assert.ok(errors.some((e) => e.toLowerCase().includes('leadsource')));
});

test('validateCreate — rejects empty string leadSource', () => {
  const body = { ...BASE_CREATE_BODY, leadSource: '' };
  const errors = validateCreate(body);
  assert.ok(errors.some((e) => e.toLowerCase().includes('leadsource')));
});

test('validateCreate — rejects whitespace-only leadSource', () => {
  const body = { ...BASE_CREATE_BODY, leadSource: '   ' };
  const errors = validateCreate(body);
  assert.ok(errors.some((e) => e.toLowerCase().includes('leadsource')));
});

// ─── validateUpdate ─────────────────────────────────────────────────────────

test('validateUpdate — passes when leadSource is not part of the payload', () => {
  assert.deepStrictEqual(validateUpdate({ status: 'ACTIVE' }), []);
});

test('validateUpdate — passes when leadSource is a valid non-empty string', () => {
  assert.deepStrictEqual(validateUpdate({ leadSource: 'POSP Member A' }), []);
});

test('validateUpdate — rejects empty string leadSource (Rule B: never zero Lead Members)', () => {
  const errors = validateUpdate({ leadSource: '' });
  assert.ok(errors.some((e) => e.toLowerCase().includes('leadsource')));
});

test('validateUpdate — rejects whitespace-only leadSource', () => {
  const errors = validateUpdate({ leadSource: '   ' });
  assert.ok(errors.some((e) => e.toLowerCase().includes('leadsource')));
});

test('validateUpdate — rejects null leadSource', () => {
  const errors = validateUpdate({ leadSource: null });
  assert.ok(errors.some((e) => e.toLowerCase().includes('leadsource')));
});
