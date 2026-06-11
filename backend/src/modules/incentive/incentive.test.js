const test = require('node:test');
const assert = require('node:assert');

const { calcIncentiveAmount, normalizePointValue, round2, DEFAULT_POINT_VALUE } = require('./incentive.service');
const { validateCreate, validateUpdate, isValidMonth } = require('./incentive.validation');

const BASE_CREATE_BODY = {
  leadMemberId: 1,
  month: '2026-06',
  points: 100,
  pointValue: 0.50,
  remarks: 'Sample remark',
};

// ─── round2 ─────────────────────────────────────────────────────────────────

test('round2 rounds to 2 decimal places', () => {
  assert.strictEqual(round2(8097.1799999), 8097.18);
  assert.strictEqual(round2(0.005), 0.01);
  assert.strictEqual(round2(100), 100);
});

// ─── normalizePointValue ─────────────────────────────────────────────────────

test('normalizePointValue defaults to 0.50 when blank/null/undefined', () => {
  assert.strictEqual(normalizePointValue(''), DEFAULT_POINT_VALUE);
  assert.strictEqual(normalizePointValue(null), DEFAULT_POINT_VALUE);
  assert.strictEqual(normalizePointValue(undefined), DEFAULT_POINT_VALUE);
  assert.strictEqual(DEFAULT_POINT_VALUE, 0.50);
});

test('normalizePointValue passes through numeric and numeric-string values', () => {
  assert.strictEqual(normalizePointValue(1), 1);
  assert.strictEqual(normalizePointValue('0.75'), 0.75);
  assert.strictEqual(normalizePointValue(0), 0);
});

// ─── calcIncentiveAmount — core formula ─────────────────────────────────────
// incentiveAmount = round2(points * pointValue)

test('calcIncentiveAmount — default point value (0.50)', () => {
  assert.strictEqual(calcIncentiveAmount({ points: 100 }), 50);
  assert.strictEqual(calcIncentiveAmount({ points: 100, pointValue: '' }), 50);
});

test('calcIncentiveAmount — custom point value', () => {
  assert.strictEqual(calcIncentiveAmount({ points: 200, pointValue: 1.25 }), 250);
  assert.strictEqual(calcIncentiveAmount({ points: 50, pointValue: 0.10 }), 5);
});

test('calcIncentiveAmount — zero points', () => {
  assert.strictEqual(calcIncentiveAmount({ points: 0, pointValue: 0.50 }), 0);
});

test('calcIncentiveAmount — decimal rounding', () => {
  // 33.33 * 0.5 = 16.665 -> round2 -> 16.67 (round half away from zero via EPSILON)
  assert.strictEqual(calcIncentiveAmount({ points: 33.33, pointValue: 0.5 }), 16.67);
  // 12.345 * 0.5 = 6.1725 -> 6.17
  assert.strictEqual(calcIncentiveAmount({ points: 12.345, pointValue: 0.5 }), 6.17);
});

// ─── isValidMonth ─────────────────────────────────────────────────────────────

test('isValidMonth accepts valid YYYY-MM strings', () => {
  assert.ok(isValidMonth('2026-01'));
  assert.ok(isValidMonth('2026-12'));
});

test('isValidMonth rejects invalid formats and out-of-range months', () => {
  assert.ok(!isValidMonth('2026-1'));
  assert.ok(!isValidMonth('2026-13'));
  assert.ok(!isValidMonth('2026-00'));
  assert.ok(!isValidMonth('06-2026'));
  assert.ok(!isValidMonth(''));
  assert.ok(!isValidMonth(undefined));
});

// ─── validateCreate ─────────────────────────────────────────────────────────

test('validateCreate — passes with all fields populated', () => {
  assert.deepStrictEqual(validateCreate(BASE_CREATE_BODY), []);
});

test('validateCreate — passes with pointValue omitted (defaults later)', () => {
  const body = { ...BASE_CREATE_BODY };
  delete body.pointValue;
  assert.deepStrictEqual(validateCreate(body), []);
});

test('validateCreate — rejects missing leadMemberId', () => {
  const body = { ...BASE_CREATE_BODY };
  delete body.leadMemberId;
  const errors = validateCreate(body);
  assert.ok(errors.some((e) => e.includes('leadMemberId')));
});

test('validateCreate — rejects non-positive leadMemberId', () => {
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, leadMemberId: 0 }).some((e) => e.includes('leadMemberId')));
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, leadMemberId: -1 }).some((e) => e.includes('leadMemberId')));
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, leadMemberId: 1.5 }).some((e) => e.includes('leadMemberId')));
});

test('validateCreate — rejects invalid month', () => {
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, month: '2026-13' }).some((e) => e.includes('month')));
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, month: '' }).some((e) => e.includes('month')));
});

test('validateCreate — rejects negative points', () => {
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, points: -5 }).some((e) => e.includes('points')));
});

test('validateCreate — accepts zero points', () => {
  assert.deepStrictEqual(validateCreate({ ...BASE_CREATE_BODY, points: 0 }), []);
});

test('validateCreate — rejects negative pointValue', () => {
  assert.ok(validateCreate({ ...BASE_CREATE_BODY, pointValue: -0.5 }).some((e) => e.includes('pointValue')));
});

// ─── validateUpdate ─────────────────────────────────────────────────────────

test('validateUpdate — passes with empty payload', () => {
  assert.deepStrictEqual(validateUpdate({}), []);
});

test('validateUpdate — passes with partial valid update', () => {
  assert.deepStrictEqual(validateUpdate({ points: 150 }), []);
  assert.deepStrictEqual(validateUpdate({ pointValue: 0.75 }), []);
  assert.deepStrictEqual(validateUpdate({ month: '2026-07' }), []);
});

test('validateUpdate — rejects invalid month, points, pointValue when provided', () => {
  assert.ok(validateUpdate({ month: '2026-13' }).length > 0);
  assert.ok(validateUpdate({ points: -1 }).length > 0);
  assert.ok(validateUpdate({ pointValue: -1 }).length > 0);
  assert.ok(validateUpdate({ leadMemberId: 0 }).length > 0);
});
