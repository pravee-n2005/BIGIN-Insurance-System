const test = require('node:test');
const assert = require('node:assert');

const prisma = require('../../config/prisma');
const service = require('./renewal.service');

let result;
let today;
let tomorrow;
let in7Days;
let in15Days;
let in30Days;
let in60Days;
let in90Days;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

test('worklist() returns a well-formed payload', async () => {
  const now = new Date();
  today = startOfDay(now);
  tomorrow = addDays(today, 1);
  in7Days = addDays(today, 7);
  in15Days = addDays(today, 15);
  in30Days = addDays(today, 30);
  in60Days = addDays(today, 60);
  in90Days = addDays(today, 90);

  result = await service.worklist();

  assert.ok(result.summary);
  assert.ok(Array.isArray(result.policies));
});

test('worklist excludes CANCELLED policies', async () => {
  const cancelledCount = await prisma.policy.count({ where: { status: 'CANCELLED' } });
  const nonCancelledCount = await prisma.policy.count({ where: { status: { not: 'CANCELLED' } } });

  assert.strictEqual(result.policies.length, nonCancelledCount);
  for (const row of result.policies) {
    assert.notStrictEqual(row.status, 'CANCELLED');
  }
  // Sanity: every returned policy is accounted for (cancelled + non-cancelled = total)
  const total = await prisma.policy.count();
  assert.strictEqual(cancelledCount + nonCancelledCount, total);
});

test('dueToday count matches policies renewing today', async () => {
  const expected = await prisma.policy.count({
    where: {
      status: { not: 'CANCELLED' },
      renewalDate: { gte: today, lt: tomorrow },
    },
  });
  assert.strictEqual(result.summary.dueToday, expected);
});

test('overdue count matches policies with renewalDate before today', async () => {
  const expected = await prisma.policy.count({
    where: {
      status: { not: 'CANCELLED' },
      renewalDate: { lt: today },
    },
  });
  assert.strictEqual(result.summary.overdue, expected);
});

test('dueIn7/15/30/60/90 counts match window queries and are non-decreasing', async () => {
  const within7 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: in7Days } },
  });
  const within15 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: in15Days } },
  });
  const within30 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: in30Days } },
  });
  const within60 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: in60Days } },
  });
  const within90 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: in90Days } },
  });

  assert.strictEqual(result.summary.dueIn7Days, within7);
  assert.strictEqual(result.summary.dueIn15Days, within15);
  assert.strictEqual(result.summary.dueIn30Days, within30);
  assert.strictEqual(result.summary.dueIn60Days, within60);
  assert.strictEqual(result.summary.dueIn90Days, within90);

  assert.ok(result.summary.dueIn7Days <= result.summary.dueIn15Days);
  assert.ok(result.summary.dueIn15Days <= result.summary.dueIn30Days);
  assert.ok(result.summary.dueIn30Days <= result.summary.dueIn60Days);
  assert.ok(result.summary.dueIn60Days <= result.summary.dueIn90Days);
});

test('per-row bucket flags are internally consistent', async () => {
  for (const row of result.policies) {
    const renewalDate = new Date(row.renewalDate);

    assert.strictEqual(row.isOverdue, renewalDate < today);
    assert.strictEqual(row.isToday, renewalDate >= today && renewalDate < tomorrow);
    assert.strictEqual(row.isWithin7, renewalDate >= today && renewalDate <= in7Days);
    assert.strictEqual(row.isWithin15, renewalDate >= today && renewalDate <= in15Days);
    assert.strictEqual(row.isWithin30, renewalDate >= today && renewalDate <= in30Days);
    assert.strictEqual(row.isWithin60, renewalDate >= today && renewalDate <= in60Days);
    assert.strictEqual(row.isWithin90, renewalDate >= today && renewalDate <= in90Days);

    // Overdue and today are mutually exclusive
    assert.ok(!(row.isOverdue && row.isToday));
  }
});

test('renewal worklist — cleanup', async () => {
  await prisma.$disconnect();
});
