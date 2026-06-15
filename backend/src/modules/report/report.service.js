const prisma = require('../../config/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDecimal(val) {
  return Number(val ?? 0);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
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

// ─── Module 4 — GST Sales Report ──────────────────────────────────────────────
// One row per non-cancelled Invoice for the given month (by invoiceDate). Joins
// to the linked InsurerStatement (if any) for creditDate, and to underlying
// policies (via StatementPolicy) to derive a per-invoice TDS rate.

function deriveTdsRate(statement) {
  // If linked to a statement, take the most representative policy TDS%.
  // Convention: if any policy is LIFE category, use 12%; else 10%.
  if (!statement || !statement.policies?.length) return 0.10;
  const hasLife = statement.policies.some(
    (sp) => sp.policy?.insuranceCategory === 'LIFE'
  );
  return hasLife ? 0.12 : 0.10;
}

async function gstSales({ month }) {
  if (!/^\d{4}-\d{2}$/.test(month))
    throw Object.assign(new Error('month must be in YYYY-MM format.'), { status: 400 });
  const [y, m] = month.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to   = new Date(y, m, 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: { gte: from, lt: to },
      status:      { in: ['FINALIZED', 'ISSUED'] },   // exclude DRAFT and CANCELLED
    },
    include: {
      statement: {
        include: {
          policies: {
            include: { policy: { select: { insuranceCategory: true } } },
          },
        },
      },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  const rows = invoices.map((inv) => {
    const rate = Number(inv.cgstRate) > 0
      ? (Number(inv.cgstRate) + Number(inv.sgstRate)) / 100   // 18% intra
      : Number(inv.igstRate) / 100;                            // 18% inter

    const taxable  = Number(inv.taxableValue);
    const tdsRate  = deriveTdsRate(inv.statement);
    const exempted = inv.isGstExempt ? taxable : 0;

    return {
      gstin:            inv.recipientGstin,
      receiverName:     inv.recipientLegalName,
      invoiceNumber:    inv.invoiceNumber,
      invoiceDate:      inv.invoiceDate,
      invoiceValue:     Number(inv.totalAmount),
      hsn:              '997161',
      rate,
      taxableValue:     inv.isGstExempt ? 0 : taxable,
      exemptedTurnover: exempted,
      cgst:             Number(inv.cgstAmount),
      sgst:             Number(inv.sgstAmount),
      igst:             Number(inv.igstAmount),
      tdsRate,
      creditedOn:       inv.statement?.creditDate ?? null,
      isGstExempt:      inv.isGstExempt,
      status:           inv.status,
    };
  });

  const totals = rows.reduce((acc, r) => ({
    invoiceValue:     acc.invoiceValue     + r.invoiceValue,
    taxableValue:     acc.taxableValue     + r.taxableValue,
    exemptedTurnover: acc.exemptedTurnover + r.exemptedTurnover,
    cgst:             acc.cgst             + r.cgst,
    sgst:             acc.sgst             + r.sgst,
    igst:             acc.igst             + r.igst,
  }), { invoiceValue: 0, taxableValue: 0, exemptedTurnover: 0, cgst: 0, sgst: 0, igst: 0 });

  return { period: month, rows, totals };
}

// ─── Module 4 — Credits Report ────────────────────────────────────────────────
// One row per InsurerStatement that has a creditDate within [from,to] AND
// has amountCredited populated (admin-entered actual credit). Filtered by
// optional bankAccount.

async function credits({ from, to, bankAccount }) {
  if (!from || !to)
    throw Object.assign(new Error('from and to dates are required (YYYY-MM-DD).'), { status: 400 });

  const fromDate = new Date(from);
  const toDate   = new Date(to);
  toDate.setDate(toDate.getDate() + 1);  // make `to` inclusive

  const where = {
    creditDate:     { gte: fromDate, lt: toDate },
    amountCredited: { not: null },
    status:         { not: 'CANCELLED' },
  };
  if (bankAccount) where.bankAccount = bankAccount;

  const statements = await prisma.insurerStatement.findMany({
    where,
    include: {
      insurer: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
    },
    orderBy: [{ bankAccount: 'asc' }, { creditDate: 'asc' }],
  });

  const rows = statements.map((s) => ({
    statementId:    s.id,
    date:           s.creditDate,
    receivedFrom:   s.insurer?.name ?? '—',
    nature:         s.bankReference ?? '',
    deposit:        Number(s.amountCredited ?? 0),
    payment:        0,
    notes:          s.remarks ?? '',
    remarks:        s.invoice?.invoiceNumber ?? '',
    bankAccount:    s.bankAccount ?? 'Unassigned',
    statementRefNo: s.statementRefNo,
    invoiceValue:   Number(s.invoiceValue),
  }));

  const totals = {
    amountCredited: rows.reduce((sum, r) => sum + r.deposit, 0),
    count:          rows.length,
  };

  return { period: { from, to }, rows, totals };
}

// ─── Phase 5 — Monthly GST Report ─────────────────────────────────────────────
// One row per InsurerStatement credited within the given month, showing:
//   Credited Date, Bank Reference, Nature of Transaction, Debit (Deposits), Credit (Payments).
// Deposit entries (amountCredited) populate Debit. Credit is reserved for a future
// payment-tracking workflow and remains 0 until that data exists.

async function monthlyGst({ month }) {
  if (!month || !/^\d{4}-\d{2}$/.test(month))
    throw Object.assign(new Error('month is required and must be in YYYY-MM format.'), { status: 400 });

  const [year, mon] = month.split('-').map(Number);
  const from = new Date(year, mon - 1, 1);
  const to   = new Date(year, mon, 1);

  const statements = await prisma.insurerStatement.findMany({
    where: {
      creditDate: { gte: from, lt: to },
      status:     { not: 'CANCELLED' },
    },
    include: {
      insurer: { select: { id: true, name: true } },
    },
    orderBy: { creditDate: 'asc' },
  });

  const rows = statements.map((s) => ({
    statementId:         s.id,
    creditedDate:        s.creditDate,
    bankReference:       s.bankReference ?? '',
    natureOfTransaction: s.natureOfTransaction ?? '',
    debit:               Number(s.amountCredited ?? 0),
    credit:              0,
    insurerName:         s.insurer?.name ?? '—',
    statementRefNo:      s.statementRefNo,
  }));

  const totals = {
    debit:  round2(rows.reduce((sum, r) => sum + r.debit, 0)),
    credit: round2(rows.reduce((sum, r) => sum + r.credit, 0)),
    count:  rows.length,
  };

  return { period: month, rows, totals };
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

module.exports = {
  monthly, byInsurer, byLeadSource, byCategory, availableMonths,
  gstSales, credits, monthlyGst,
};
