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

async function worklist() {
  const policies = await prisma.policy.findMany({
    where: { status: { not: 'CANCELLED' } },
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
