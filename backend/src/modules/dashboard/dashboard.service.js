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

// ─── Phase 2 — Financial Year helpers ──────────────────────────────────────
// Indian FY runs April → March. `fy` is a string like "2025-26" meaning
// 1 Apr 2025 – 31 Mar 2026 (exclusive upper bound 1 Apr 2026).

function fyRange(fy) {
  if (!fy || !/^\d{4}-\d{2}$/.test(fy)) return null;
  const startYear = Number(fy.slice(0, 4));
  return {
    from: new Date(startYear, 3, 1),
    to:   new Date(startYear + 1, 3, 1),
  };
}

async function getStats(fy) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const today = startOfDay(now);

  const fyDates = fyRange(fy);

  const [
    allTime,
    thisMonth,
    thisYear,
    expiring30,
    expiring60,
    expiring90,
    invoicedCount,
    pendingCount,
    fyAgg,
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
    // Phase 3b — Travel insurance excluded from renewal stats (no meaningful
    // renewal cycle, per client requirement).
    prisma.policy.count({
      where: {
        status: { not: 'CANCELLED' },
        insuranceCategory: { not: 'TRAVEL' },
        renewalDate: { gte: today, lte: daysFromNow(today, 30) },
      },
    }),
    prisma.policy.count({
      where: {
        status: { not: 'CANCELLED' },
        insuranceCategory: { not: 'TRAVEL' },
        renewalDate: { gte: today, lte: daysFromNow(today, 60) },
      },
    }),
    prisma.policy.count({
      where: {
        status: { not: 'CANCELLED' },
        insuranceCategory: { not: 'TRAVEL' },
        renewalDate: { gte: today, lte: daysFromNow(today, 90) },
      },
    }),
    // Phase 1 — Invoice Raised Tracking counts (excluding cancelled policies)
    prisma.policy.count({
      where: { status: { not: 'CANCELLED' }, invoiceRaised: true },
    }),
    prisma.policy.count({
      where: { status: { not: 'CANCELLED' }, invoiceRaised: false },
    }),
    // Phase 2 — Financial Year aggregate (null if no/invalid fy given)
    fyDates
      ? prisma.policy.aggregate({
          where: { issueDate: { gte: fyDates.from, lt: fyDates.to } },
          _count: { id: true },
          _sum: SUM_FIELDS,
        })
      : Promise.resolve(null),
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
    invoiceTracking: {
      invoiced: invoicedCount,
      pending: pendingCount,
    },
    fy: fyDates ? {
      label: fy,
      policies: fyAgg._count.id,
      premium: num(fyAgg._sum.grossPremium),
      commission: num(fyAgg._sum.commissionAmount),
    } : null,
  };
}

module.exports = { getStats };
