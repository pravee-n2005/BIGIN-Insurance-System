const prisma = require('../../config/prisma');

// ─── Read-only Renewal Worklist ────────────────────────────────────────────
// All queries here are SELECT-only. Nothing in this module writes to the
// database, and it does not touch policy/commission/import/report/incentive/
// dashboard business logic.

const POLICY_SELECT = {
  id: true,
  policyNumber: true,
  customerName: true,
  customerPhone: true,
  insurerName: true,
  leadSource: true,
  renewalDate: true,
  paymentFrequency: true,
  status: true,
};

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─── Phase 1 — Renewal Month Filter ────────────────────────────────────────
// `month` is 1-12 (calendar month). `year` defaults to the current year when
// only `month` is given. Both optional — omitting both preserves prior
// behavior (all non-cancelled policies).

function renewalDateRange(month, year) {
  if (!month && !year) return null;

  const now = new Date();
  const y = year ? Number(year) : now.getFullYear();

  if (month) {
    const m = Number(month);
    return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  // Year only — whole calendar year
  return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
}

async function worklist({ month, year } = {}) {
  // Phase 3b — Travel insurance is excluded from renewal reminders/reports per
  // client requirement (it does not have a meaningful renewal cycle here).
  const where = { status: { not: 'CANCELLED' }, insuranceCategory: { not: 'TRAVEL' } };
  const renewalDateFilter = renewalDateRange(month, year);
  if (renewalDateFilter) where.renewalDate = renewalDateFilter;

  const policies = await prisma.policy.findMany({
    where,
    select: POLICY_SELECT,
    orderBy: { renewalDate: 'asc' },
  });

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const in7Days = addDays(today, 7);
  const in15Days = addDays(today, 15);
  const in30Days = addDays(today, 30);
  const in60Days = addDays(today, 60);
  const in90Days = addDays(today, 90);

  let dueToday = 0;
  let dueIn7Days = 0;
  let dueIn15Days = 0;
  let dueIn30Days = 0;
  let dueIn60Days = 0;
  let dueIn90Days = 0;
  let overdue = 0;

  const rows = policies.map((p) => {
    const renewalDate = new Date(p.renewalDate);

    const isOverdue = renewalDate < today;
    const isToday = renewalDate >= today && renewalDate < tomorrow;
    const isWithin7 = renewalDate >= today && renewalDate <= in7Days;
    const isWithin15 = renewalDate >= today && renewalDate <= in15Days;
    const isWithin30 = renewalDate >= today && renewalDate <= in30Days;
    const isWithin60 = renewalDate >= today && renewalDate <= in60Days;
    const isWithin90 = renewalDate >= today && renewalDate <= in90Days;

    if (isOverdue) overdue++;
    if (isToday) dueToday++;
    if (isWithin7) dueIn7Days++;
    if (isWithin15) dueIn15Days++;
    if (isWithin30) dueIn30Days++;
    if (isWithin60) dueIn60Days++;
    if (isWithin90) dueIn90Days++;

    return {
      id: p.id,
      renewalDate: p.renewalDate,
      policyNumber: p.policyNumber,
      customerName: p.customerName,
      customerPhone: p.customerPhone,
      insurerName: p.insurerName,
      leadSource: p.leadSource,
      paymentFrequency: p.paymentFrequency,
      status: p.status,
      isOverdue,
      isToday,
      isWithin7,
      isWithin15,
      isWithin30,
      isWithin60,
      isWithin90,
    };
  });

  return {
    summary: {
      dueToday,
      dueIn7Days,
      dueIn15Days,
      dueIn30Days,
      dueIn60Days,
      dueIn90Days,
      overdue,
    },
    policies: rows,
  };
}

module.exports = { worklist };
