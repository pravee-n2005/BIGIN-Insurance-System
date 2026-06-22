const test = require('node:test');
const assert = require('node:assert');

const prisma = require('../../config/prisma');
const service = require('./data-health.service');

let snapshot;

test('overview() returns a well-formed payload', async () => {
  snapshot = await service.overview();

  assert.ok(snapshot.summary);
  assert.ok(Array.isArray(snapshot.inactiveInsurerPolicies));
  assert.ok(Array.isArray(snapshot.missingLeadExecutivePolicies));
  assert.ok(Array.isArray(snapshot.confirmedZeroPolicies), 'confirmedZeroPolicies must be an array');
  assert.ok(Array.isArray(snapshot.missingCommissionPolicies));
  assert.ok(Array.isArray(snapshot.duplicatePolicyNumbers));
  // New summary fields
  assert.ok('confirmedZeroCommissionCount' in snapshot.summary);
  assert.ok('missingCommissionCount' in snapshot.summary);
});

test('summary.totalPolicies matches prisma.policy.count()', async () => {
  const total = await prisma.policy.count();
  assert.strictEqual(snapshot.summary.totalPolicies, total);
});

test('summary.inactiveInsurerCount matches policies whose insurerName is an inactive insurer', async () => {
  const inactiveInsurers = await prisma.insurer.findMany({ where: { active: false }, select: { name: true } });
  const inactiveNames = inactiveInsurers.map((i) => i.name);

  const expected = await prisma.policy.count({
    where: { insurerName: { in: inactiveNames } },
  });

  assert.strictEqual(snapshot.summary.inactiveInsurerCount, expected);
  assert.strictEqual(snapshot.inactiveInsurerPolicies.length, expected);
});

test('summary.missingCommissionPercentCount matches all policies with commissionPercent = 0 (legacy field)', async () => {
  const expected = await prisma.policy.count({ where: { commissionPercent: 0 } });
  assert.strictEqual(snapshot.summary.missingCommissionPercentCount, expected);
});

test('summary.missingCommissionAmountCount matches all policies with commissionAmount = 0 (legacy field)', async () => {
  const expected = await prisma.policy.count({ where: { commissionAmount: 0 } });
  assert.strictEqual(snapshot.summary.missingCommissionAmountCount, expected);
});

test('confirmedZeroPolicies + missingCommissionPolicies together equal all zero-commission policies', async () => {
  // Count policies where EITHER percent OR amount is zero — matches the OR logic in the service.
  const totalZero = await prisma.policy.count({
    where: { OR: [{ commissionPercent: 0 }, { commissionAmount: 0 }] },
  });
  const combined = snapshot.confirmedZeroPolicies.length + snapshot.missingCommissionPolicies.length;
  assert.strictEqual(combined, totalZero, 'confirmed + missing must cover all zero-commission policies');
});

test('confirmedZeroPolicies and missingCommissionPolicies are disjoint (no overlap)', () => {
  const confirmedIds = new Set(snapshot.confirmedZeroPolicies.map(r => r.id));
  for (const row of snapshot.missingCommissionPolicies) {
    assert.ok(!confirmedIds.has(row.id), `id ${row.id} appears in both confirmedZero and missingCommission`);
  }
});

test('summary counts are consistent with array lengths', () => {
  assert.strictEqual(snapshot.summary.confirmedZeroCommissionCount, snapshot.confirmedZeroPolicies.length);
  assert.strictEqual(snapshot.summary.missingCommissionCount, snapshot.missingCommissionPolicies.length);
});

test('every row exposes the fields required by the UI (policyNumber, customerName, insurerName, productName, issue, id)', async () => {
  const allRows = [
    ...snapshot.inactiveInsurerPolicies,
    ...snapshot.missingLeadExecutivePolicies,
    ...snapshot.confirmedZeroPolicies,
    ...snapshot.missingCommissionPolicies,
    ...snapshot.duplicatePolicyNumbers,
  ];

  for (const row of allRows) {
    assert.ok(row.id);
    assert.ok('policyNumber' in row);
    assert.ok('customerName' in row);
    assert.ok('insurerName' in row);
    assert.ok('productName' in row);
    assert.ok(typeof row.issue === 'string' && row.issue.length > 0);
  }
});

test('duplicatePolicyNumbers only contains policy numbers that occur more than once', async () => {
  const allPolicies = await prisma.policy.findMany({ select: { id: true, policyNumber: true } });
  const counts = new Map();
  for (const p of allPolicies) {
    const key = (p.policyNumber || '').trim().toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const row of snapshot.duplicatePolicyNumbers) {
    const key = (row.policyNumber || '').trim().toUpperCase();
    assert.ok(counts.get(key) > 1, `expected ${row.policyNumber} to be a duplicate`);
  }
});

test('data health — cleanup', async () => {
  await prisma.$disconnect();
});
