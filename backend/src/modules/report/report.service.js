const prisma = require('../../config/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDecimal(val) {
  return Number(val ?? 0);
}

// Build a Prisma `where` clause from optional from/to date strings.
function dateRange(from, to) {
  if (!from && !to) return undefined;
  const range = {};
  if (from) range.gte = new Date(from);
  if (to) {
    // Include the entire `to` day
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    range.lt = end;
  }
  return range;
}

// Sum a Prisma aggregate result's _sum block into plain numbers.
function sumBlock(sum) {
  return {
    totalGrossPremium: parseDecimal(sum.grossPremium),
    totalNetPremium: parseDecimal(sum.netPremium),
    totalGstAmount: parseDecimal(sum.gstAmount),
    totalCommission: parseDecimal(sum.commissionAmount),
    totalTds: parseDecimal(sum.tdsAmount),
    totalReceivable: parseDecimal(sum.finalReceivable),
  };
}

const FINANCIAL_SUM = {
  grossPremium: true,
  netPremium: true,
  gstAmount: true,
  commissionAmount: true,
  tdsAmount: true,
  finalReceivable: true,
};

// ─── Monthly Report ───────────────────────────────────────────────────────────

async function monthly({ month, from, to }) {
  const where = {};

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw Object.assign(new Error('month must be YYYY-MM'), { status: 400 });
    const [year, mon] = month.split('-').map(Number);
    where.issueDate = { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) };
  } else {
    const range = dateRange(from, to);
    if (range) where.issueDate = range;
  }

  const [agg, policies] = await Promise.all([
    prisma.policy.aggregate({ where, _count: { id: true }, _sum: FINANCIAL_SUM }),
    prisma.policy.findMany({
      where,
      orderBy: { issueDate: 'asc' },
      select: {
        id: true, policyNumber: true, customerName: true,
        insurerName: true, insuranceCategory: true, productName: true,
        issueDate: true, renewalDate: true,
        grossPremium: true, netPremium: true,
        commissionPercent: true, commissionAmount: true,
        tdsAmount: true, finalReceivable: true,
        leadSource: true, status: true, invoiceNumber: true,
      },
    }),
  ]);

  return {
    period: month || (from || to ? `${from ?? ''}..${to ?? ''}` : 'all'),
    totalPolicies: agg._count.id,
    ...sumBlock(agg._sum),
    policies,
  };
}

// ─── Insurer-wise Report ──────────────────────────────────────────────────────

async function byInsurer({ from, to }) {
  const where = {};
  const range = dateRange(from, to);
  if (range) where.issueDate = range;

  const groups = await prisma.policy.groupBy({
    by: ['insurerName'],
    where,
    _count: { id: true },
    _sum: { grossPremium: true, netPremium: true, commissionAmount: true, finalReceivable: true },
    orderBy: { _sum: { grossPremium: 'desc' } },
  });

  return groups.map((g) => ({
    insurerName: g.insurerName,
    totalPolicies: g._count.id,
    totalGrossPremium: parseDecimal(g._sum.grossPremium),
    totalNetPremium: parseDecimal(g._sum.netPremium),
    totalCommission: parseDecimal(g._sum.commissionAmount),
    totalReceivable: parseDecimal(g._sum.finalReceivable),
  }));
}

// ─── Lead Source Report ───────────────────────────────────────────────────────

async function byLeadSource({ from, to }) {
  const where = {};
  const range = dateRange(from, to);
  if (range) where.issueDate = range;

  const groups = await prisma.policy.groupBy({
    by: ['leadSource'],
    where,
    _count: { id: true },
    _sum: { grossPremium: true, commissionAmount: true, finalReceivable: true },
    orderBy: { _sum: { grossPremium: 'desc' } },
  });

  return groups.map((g) => ({
    leadSource: g.leadSource,
    totalPolicies: g._count.id,
    totalGrossPremium: parseDecimal(g._sum.grossPremium),
    totalCommission: parseDecimal(g._sum.commissionAmount),
    totalReceivable: parseDecimal(g._sum.finalReceivable),
  }));
}

// ─── Category Report ──────────────────────────────────────────────────────────

async function byCategory({ from, to }) {
  const where = {};
  const range = dateRange(from, to);
  if (range) where.issueDate = range;

  const groups = await prisma.policy.groupBy({
    by: ['insuranceCategory'],
    where,
    _count: { id: true },
    _sum: { grossPremium: true, commissionAmount: true, finalReceivable: true },
    orderBy: { _sum: { grossPremium: 'desc' } },
  });

  return groups.map((g) => ({
    insuranceCategory: g.insuranceCategory,
    totalPolicies: g._count.id,
    totalGrossPremium: parseDecimal(g._sum.grossPremium),
    totalCommission: parseDecimal(g._sum.commissionAmount),
    totalReceivable: parseDecimal(g._sum.finalReceivable),
  }));
}

// ─── Available months ─────────────────────────────────────────────────────────
// Returns distinct YYYY-MM strings for every month that has at least one policy.
// Used by the Dashboard month picker so users only see months with real data.

async function availableMonths() {
  // Use raw query for DATE_TRUNC — clean and database-side, no JS post-processing.
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', "issueDate"), 'YYYY-MM') AS month
    FROM   policies
    ORDER  BY month ASC
  `;
  return rows.map(r => r.month);
}

module.exports = { monthly, byInsurer, byLeadSource, byCategory, availableMonths };
