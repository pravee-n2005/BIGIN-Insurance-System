const test = require('node:test');
const assert = require('node:assert');

const prisma = require('../../config/prisma');
const service = require('./dashboard.service');

let stats;
let now;
let monthStart;
let yearStart;
let today;

test('getStats() returns a well-formed payload', async () => {
  now = new Date();
  monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  yearStart = new Date(now.getFullYear(), 0, 1);
  today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  stats = await service.getStats();

  assert.ok(stats.policies);
  assert.ok(stats.premium);
  assert.ok(stats.commission);
  assert.ok(stats.renewals);
});

test('policies.total matches prisma.policy.count()', async () => {
  const total = await prisma.policy.count();
  assert.strictEqual(stats.policies.total, total);
});

test('policies.addedThisMonth / addedThisYear match issueDate-filtered counts', async () => {
  const month = await prisma.policy.count({ where: { issueDate: { gte: monthStart } } });
  const year = await prisma.policy.count({ where: { issueDate: { gte: yearStart } } });

  assert.strictEqual(stats.policies.addedThisMonth, month);
  assert.strictEqual(stats.policies.addedThisYear, year);
});

test('premium totals match aggregate sums of grossPremium', async () => {
  const all = await prisma.policy.aggregate({ _sum: { grossPremium: true } });
  const month = await prisma.policy.aggregate({ where: { issueDate: { gte: monthStart } }, _sum: { grossPremium: true } });
  const year = await prisma.policy.aggregate({ where: { issueDate: { gte: yearStart } }, _sum: { grossPremium: true } });

  assert.strictEqual(stats.premium.total, Number(all._sum.grossPremium ?? 0));
  assert.strictEqual(stats.premium.thisMonth, Number(month._sum.grossPremium ?? 0));
  assert.strictEqual(stats.premium.thisYear, Number(year._sum.grossPremium ?? 0));
});

test('commission totals match aggregate sums of commissionAmount', async () => {
  const all = await prisma.policy.aggregate({ _sum: { commissionAmount: true } });
  const month = await prisma.policy.aggregate({ where: { issueDate: { gte: monthStart } }, _sum: { commissionAmount: true } });
  const year = await prisma.policy.aggregate({ where: { issueDate: { gte: yearStart } }, _sum: { commissionAmount: true } });

  assert.strictEqual(stats.commission.total, Number(all._sum.commissionAmount ?? 0));
  assert.strictEqual(stats.commission.thisMonth, Number(month._sum.commissionAmount ?? 0));
  assert.strictEqual(stats.commission.thisYear, Number(year._sum.commissionAmount ?? 0));
});

test('renewal counts match non-cancelled policies renewing within the window', async () => {
  function daysFromToday(days) {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  }

  const within30 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: daysFromToday(30) } },
  });
  const within60 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: daysFromToday(60) } },
  });
  const within90 = await prisma.policy.count({
    where: { status: { not: 'CANCELLED' }, renewalDate: { gte: today, lte: daysFromToday(90) } },
  });

  assert.strictEqual(stats.renewals.within30Days, within30);
  assert.strictEqual(stats.renewals.within60Days, within60);
  assert.strictEqual(stats.renewals.within90Days, within90);

  // 30-day window is a subset of 60-day, which is a subset of 90-day
  assert.ok(stats.renewals.within30Days <= stats.renewals.within60Days);
  assert.ok(stats.renewals.within60Days <= stats.renewals.within90Days);
});

test('dashboard stats — cleanup', async () => {
  await prisma.$disconnect();
});
