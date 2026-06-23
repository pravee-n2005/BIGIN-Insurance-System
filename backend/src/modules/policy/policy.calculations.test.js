const test = require('node:test');
const assert = require('node:assert');

const { calcFinancials, normalizePercent, round2 } = require('./policy.service');
const { validateCreate, validateUpdate } = require('./policy.validation');

const BASE_CREATE_BODY = {
  insurerName: 'Go Digit General',
  insuranceCategory: 'MOTOR',
  productName: 'Car Insurance',
  customerName: 'TEST CUSTOMER',
  policyNumber: 'TEST-0001',
  issueDate: '2026-06-01',
  paymentFrequency: 'YEARLY',
  grossPremium: 10000,
  netPremium: 10000,
  gstPercent: 18,
  commissionPercent: 20,
  tdsPercent: 10,
  leadSource: 'Leadership',
};

// ─── round2 ─────────────────────────────────────────────────────────────────

test('round2 rounds to 2 decimal places', () => {
  assert.strictEqual(round2(8097.1799999), 8097.18);
  assert.strictEqual(round2(0.005), 0.01);
  assert.strictEqual(round2(100), 100);
});

// ─── normalizePercent ───────────────────────────────────────────────────────

test('normalizePercent treats blank/null/undefined as 0', () => {
  assert.strictEqual(normalizePercent(''), 0);
  assert.strictEqual(normalizePercent(null), 0);
  assert.strictEqual(normalizePercent(undefined), 0);
});

test('normalizePercent passes through numeric and numeric-string values', () => {
  assert.strictEqual(normalizePercent(27.3), 27.3);
  assert.strictEqual(normalizePercent('27.3'), 27.3);
  assert.strictEqual(normalizePercent(0), 0);
});

// ─── calcFinancials — core formula ─────────────────────────────────────────
// gstAmount        = round2(netPremium * gstPercent / 100)
// commissionAmount = round2(netPremium * commissionPercent / 100)
// tdsAmount        = round2(commissionAmount * tdsPercent / 100)
// finalReceivable  = round2(commissionAmount - tdsAmount)

test('calcFinancials — known real-world figures (D250918681)', () => {
  const result = calcFinancials({
    netPremium: 29660, gstPercent: 18, commissionPercent: 27.3, tdsPercent: 10,
  });
  assert.strictEqual(result.gstAmount, 5338.8);
  assert.strictEqual(result.commissionAmount, 8097.18);
  assert.strictEqual(result.tdsAmount, 809.72);
  assert.strictEqual(result.finalReceivable, 7287.46);
});

test('calcFinancials — different GST percentages', () => {
  const r0  = calcFinancials({ netPremium: 1000, gstPercent: 0,  commissionPercent: 10, tdsPercent: 10 });
  const r5  = calcFinancials({ netPremium: 1000, gstPercent: 5,  commissionPercent: 10, tdsPercent: 10 });
  const r12 = calcFinancials({ netPremium: 1000, gstPercent: 12, commissionPercent: 10, tdsPercent: 10 });
  const r28 = calcFinancials({ netPremium: 1000, gstPercent: 28, commissionPercent: 10, tdsPercent: 10 });

  assert.strictEqual(r0.gstAmount, 0);
  assert.strictEqual(r5.gstAmount, 50);
  assert.strictEqual(r12.gstAmount, 120);
  assert.strictEqual(r28.gstAmount, 280);

  // GST does not affect commission/TDS/receivable — independent of gstPercent
  for (const r of [r0, r5, r12, r28]) {
    assert.strictEqual(r.commissionAmount, 100);
    assert.strictEqual(r.tdsAmount, 10);
    assert.strictEqual(r.finalReceivable, 90);
  }
});

test('calcFinancials — different commission percentages', () => {
  const r0    = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 0,    tdsPercent: 10 });
  const r15   = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 15,   tdsPercent: 10 });
  const r2730 = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 27.3, tdsPercent: 10 });
  const r100  = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 100,  tdsPercent: 10 });

  assert.strictEqual(r0.commissionAmount, 0);
  assert.strictEqual(r15.commissionAmount, 1500);
  assert.strictEqual(r2730.commissionAmount, 2730);
  assert.strictEqual(r100.commissionAmount, 10000);

  // TDS and receivable derive from commissionAmount
  assert.strictEqual(r15.tdsAmount, 150);
  assert.strictEqual(r15.finalReceivable, 1350);
});

test('calcFinancials — different TDS percentages', () => {
  const r0  = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 20, tdsPercent: 0 });
  const r5  = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 20, tdsPercent: 5 });
  const r10 = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 20, tdsPercent: 10 });
  const r20 = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 20, tdsPercent: 20 });

  // commissionAmount is fixed at 2000 for all of these
  assert.strictEqual(r0.commissionAmount, 2000);

  assert.strictEqual(r0.tdsAmount, 0);
  assert.strictEqual(r0.finalReceivable, 2000);

  assert.strictEqual(r5.tdsAmount, 100);
  assert.strictEqual(r5.finalReceivable, 1900);

  assert.strictEqual(r10.tdsAmount, 200);
  assert.strictEqual(r10.finalReceivable, 1800);

  assert.strictEqual(r20.tdsAmount, 400);
  assert.strictEqual(r20.finalReceivable, 1600);
});

test('calcFinancials — blank commission % is treated as 0', () => {
  const result = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: '', tdsPercent: 10 });
  assert.strictEqual(result.commissionAmount, 0);
  assert.strictEqual(result.tdsAmount, 0); // 0% of 0
  assert.strictEqual(result.finalReceivable, 0);
  // GST is unaffected by blank commission
  assert.strictEqual(result.gstAmount, 1800);
});

test('calcFinancials — blank TDS % is treated as 0', () => {
  const result = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: 25, tdsPercent: '' });
  assert.strictEqual(result.commissionAmount, 2500);
  assert.strictEqual(result.tdsAmount, 0);
  assert.strictEqual(result.finalReceivable, 2500); // commission - 0
});

test('calcFinancials — both commission % and TDS % blank', () => {
  const result = calcFinancials({ netPremium: 10000, gstPercent: 18, commissionPercent: '', tdsPercent: '' });
  assert.deepStrictEqual(result, {
    gstAmount: 1800, commissionAmount: 0, tdsAmount: 0, finalReceivable: 0,
  });
});

test('calcFinancials — all zero values', () => {
  const result = calcFinancials({ netPremium: 0, gstPercent: 0, commissionPercent: 0, tdsPercent: 0 });
  assert.deepStrictEqual(result, {
    gstAmount: 0, commissionAmount: 0, tdsAmount: 0, finalReceivable: 0,
  });
});

test('calcFinancials — zero net premium with non-zero percentages', () => {
  const result = calcFinancials({ netPremium: 0, gstPercent: 18, commissionPercent: 27.3, tdsPercent: 10 });
  assert.deepStrictEqual(result, {
    gstAmount: 0, commissionAmount: 0, tdsAmount: 0, finalReceivable: 0,
  });
});

test('calcFinancials — decimal net premium and percentages round correctly', () => {
  const result = calcFinancials({
    netPremium: 12345.67, gstPercent: 18.5, commissionPercent: 12.345, tdsPercent: 10.5,
  });
  // gstAmount        = 12345.67 * 0.185      = 2283.94895    -> 2283.95
  // commissionAmount = 12345.67 * 0.12345    = 1524.0729615  -> 1524.07
  // tdsAmount         = 1524.07 * 0.105       = 160.02735     -> 160.03
  // finalReceivable   = 1524.07 - 160.03      = 1364.04
  assert.strictEqual(result.gstAmount, 2283.95);
  assert.strictEqual(result.commissionAmount, 1524.07);
  assert.strictEqual(result.tdsAmount, 160.03);
  assert.strictEqual(result.finalReceivable, 1364.04);
});

// ─── validateCreate ─────────────────────────────────────────────────────────

test('validateCreate — passes with all financial fields populated', () => {
  const errors = validateCreate(BASE_CREATE_BODY);
  assert.deepStrictEqual(errors, []);
});

test('validateCreate — passes with commissionPercent and tdsPercent blank', () => {
  const body = { ...BASE_CREATE_BODY, commissionPercent: '', tdsPercent: '' };
  const errors = validateCreate(body);
  assert.deepStrictEqual(errors, []);
});

test('validateCreate — passes with commissionPercent and tdsPercent omitted entirely', () => {
  const body = { ...BASE_CREATE_BODY };
  delete body.commissionPercent;
  delete body.tdsPercent;
  const errors = validateCreate(body);
  assert.deepStrictEqual(errors, []);
});

test('validateCreate — rejects commissionPercent over 100', () => {
  const body = { ...BASE_CREATE_BODY, commissionPercent: 150 };
  const errors = validateCreate(body);
  assert.ok(errors.some((e) => e.includes('commissionPercent')));
});

test('validateCreate — rejects negative tdsPercent', () => {
  const body = { ...BASE_CREATE_BODY, tdsPercent: -5 };
  const errors = validateCreate(body);
  assert.ok(errors.some((e) => e.includes('tdsPercent')));
});

test('validateCreate — gstPercent is still required and bounded', () => {
  const missing = validateCreate({ ...BASE_CREATE_BODY, gstPercent: undefined });
  assert.ok(missing.some((e) => e.includes('gstPercent')));

  const tooHigh = validateCreate({ ...BASE_CREATE_BODY, gstPercent: 101 });
  assert.ok(tooHigh.some((e) => e.includes('gstPercent')));
});

test('validateCreate — rejects zero grossPremium and netPremium', () => {
  const errorsGross = validateCreate({ ...BASE_CREATE_BODY, grossPremium: 0 });
  assert.ok(errorsGross.some((e) => e.includes('grossPremium')), 'expected grossPremium error');

  const errorsNet = validateCreate({ ...BASE_CREATE_BODY, netPremium: 0 });
  assert.ok(errorsNet.some((e) => e.includes('netPremium')), 'expected netPremium error');
});

test('validateCreate — accepts zero gstPercent, commissionPercent, tdsPercent', () => {
  const body = { ...BASE_CREATE_BODY, gstPercent: 0, commissionPercent: 0, tdsPercent: 0 };
  assert.deepStrictEqual(validateCreate(body), []);
});

// ─── validateUpdate ─────────────────────────────────────────────────────────

test('validateUpdate — passes with no financial fields in payload', () => {
  assert.deepStrictEqual(validateUpdate({ status: 'ACTIVE' }), []);
});

test('validateUpdate — passes when blanking out commissionPercent/tdsPercent', () => {
  const errors = validateUpdate({ commissionPercent: '', tdsPercent: '' });
  assert.deepStrictEqual(errors, []);
});

test('validateUpdate — rejects out-of-range commissionPercent/tdsPercent', () => {
  assert.ok(validateUpdate({ commissionPercent: 200 }).length > 0);
  assert.ok(validateUpdate({ tdsPercent: -1 }).length > 0);
});

test('validateUpdate — rejects out-of-range gstPercent when provided', () => {
  assert.ok(validateUpdate({ gstPercent: 150 }).length > 0);
  assert.deepStrictEqual(validateUpdate({ gstPercent: 18 }), []);
});

test('validateCreate — rejects removed multi-year payment frequencies', () => {
  for (const freq of ['TWO_YEAR', 'THREE_YEAR', 'FOUR_YEAR', 'FIVE_YEAR']) {
    const errors = validateCreate({ ...BASE_CREATE_BODY, paymentFrequency: freq });
    assert.ok(errors.some(e => e.includes('paymentFrequency')), `${freq} should be rejected`);
  }
});

test('validateCreate — rejects unknown payment frequency', () => {
  const errors = validateCreate({ ...BASE_CREATE_BODY, paymentFrequency: 'SIX_YEAR' });
  assert.ok(errors.some(e => e.includes('paymentFrequency')));
});

test('validateCreate — accepts all four valid payment frequencies', () => {
  for (const freq of ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']) {
    assert.deepStrictEqual(validateCreate({ ...BASE_CREATE_BODY, paymentFrequency: freq }), [], `${freq} should be valid`);
  }
});
