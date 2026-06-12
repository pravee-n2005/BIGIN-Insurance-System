const prisma = require('../../config/prisma');

// ─── Read-only Dashboard Statistics ────────────────────────────────────────
// All queries here are SELECT/aggregate-only. Nothing in this module writes
// to the database and it does not touch policy/commission/import/report
// business logic.

function num(val) {
  return Number(val ?? 0);
}

const SUM_FIELDS = { grossPremium: true, commissionAmount: true };

function startOfMonth(now) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfYear(now) {
  return new Date(now.getFullYear(), 0, 1);
}

function startOfDay(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysFromNow(now, days) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d;
}

async function getStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const today = startOfDay(now);

  const [
    allTime,
    thisMonth,
    thisYear,
    expiring30,
    expiring60,
    expiring90,
  ] = await Promise.all([
    prisma.policy.aggregate({ _count: { id: true }, _sum: SUM_FIELDS }),
    prisma.policy.aggregate({
      where: { issueDate: { gte: monthStart } },
      _count: { id: true },
      _sum: SUM_FIELDS,
    }),
    prisma.policy.aggregate({
      where: { issueDate: { gte: yearStart } },
      _count: { id: true },
      _sum: SUM_FIELDS,
    }),
    prisma.policy.count({
      where: {
        status: { not: 'CANCELLED' },
        renewalDate: { gte: today, lte: daysFromNow(today, 30) },
      },
    }),
    prisma.policy.count({
      where: {
        status: { not: 'CANCELLED' },
        renewalDate: { gte: today, lte: daysFromNow(today, 60) },
      },
    }),
    prisma.policy.count({
      where: {
        status: { not: 'CANCELLED' },
        renewalDate: { gte: today, lte: daysFromNow(today, 90) },
      },
    }),
  ]);

  return {
    policies: {
      total: allTime._count.id,
      addedThisMonth: thisMonth._count.id,
      addedThisYear: thisYear._count.id,
    },
    premium: {
      total: num(allTime._sum.grossPremium),
      thisMonth: num(thisMonth._sum.grossPremium),
      thisYear: num(thisYear._sum.grossPremium),
    },
    commission: {
      total: num(allTime._sum.commissionAmount),
      thisMonth: num(thisMonth._sum.commissionAmount),
      thisYear: num(thisYear._sum.commissionAmount),
    },
    renewals: {
      within30Days: expiring30,
      within60Days: expiring60,
      within90Days: expiring90,
    },
  };
}

module.exports = { getStats };
