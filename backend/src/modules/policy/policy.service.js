const prisma = require('../../config/prisma');

// ─── Renewal date calculator ──────────────────────────────────────────────────

const FREQUENCY_MONTHS = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

function calcRenewalDate(issueDate, paymentFrequency) {
  const date = new Date(issueDate);
  const months = FREQUENCY_MONTHS[paymentFrequency];
  date.setMonth(date.getMonth() + months);
  return date;
}

// ─── Financial calculator ─────────────────────────────────────────────────────
// All inputs are plain numbers. Returns rounded Decimal-safe strings.

function calcFinancials({ netPremium, gstPercent, commissionPercent, tdsPercent }) {
  const net = Number(netPremium);
  const gstPct = Number(gstPercent);
  const commPct = Number(commissionPercent);
  const tdsPct = Number(tdsPercent);

  const gstAmount = round2(net * gstPct / 100);
  const commissionAmount = round2(net * commPct / 100);
  const tdsAmount = round2(commissionAmount * tdsPct / 100);
  const finalReceivable = round2(commissionAmount - tdsAmount);

  return { gstAmount, commissionAmount, tdsAmount, finalReceivable };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── Build Prisma-ready data from a validated request body ───────────────────

function buildPolicyData(body, userId) {
  const {
    insurerName, insuranceCategory, productName,
    customerName, customerPhone, customerEmail,
    policyNumber, issueDate, paymentFrequency,
    grossPremium, netPremium,
    gstPercent, commissionPercent, tdsPercent,
    leadSource, invoiceNumber, invoiceDate, creditedDate,
    paymentMode, remarks, status,
  } = body;

  const financials = calcFinancials({
    netPremium, gstPercent, commissionPercent, tdsPercent,
  });

  const renewalDate = calcRenewalDate(issueDate, paymentFrequency);

  return {
    insurerName,
    insuranceCategory,
    productName,
    customerName,
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    policyNumber,
    issueDate: new Date(issueDate),
    renewalDate,
    paymentFrequency,
    status: status || 'ACTIVE',
    grossPremium: Number(grossPremium),
    netPremium: Number(netPremium),
    gstPercent: Number(gstPercent),
    gstAmount: financials.gstAmount,
    commissionPercent: Number(commissionPercent),
    commissionAmount: financials.commissionAmount,
    tdsPercent: Number(tdsPercent),
    tdsAmount: financials.tdsAmount,
    finalReceivable: financials.finalReceivable,
    leadSource,
    invoiceNumber: invoiceNumber || null,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
    creditedDate: creditedDate ? new Date(creditedDate) : null,
    paymentMode: paymentMode || null,
    remarks: remarks || null,
    createdById: userId,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

async function create(body, userId) {
  const data = buildPolicyData(body, userId);
  return prisma.policy.create({ data, include: { createdBy: { select: { id: true, name: true } } } });
}

async function list({ page, limit, month, insurerName, leadSource, insuranceCategory, status }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (insuranceCategory) where.insuranceCategory = insuranceCategory;
  if (status) where.status = status;

  if (insurerName) where.insurerName = { contains: insurerName, mode: 'insensitive' };
  if (leadSource) where.leadSource = { contains: leadSource, mode: 'insensitive' };

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    where.issueDate = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    };
  }

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issueDate: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.policy.count({ where }),
  ]);

  return { policies, total };
}

async function getById(id) {
  return prisma.policy.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

async function update(id, body) {
  // Recalculate financials for any update that touches financial fields.
  // Fetch existing to fill in unchanged fields.
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) return null;

  const merged = {
    insurerName: body.insurerName ?? existing.insurerName,
    insuranceCategory: body.insuranceCategory ?? existing.insuranceCategory,
    productName: body.productName ?? existing.productName,
    customerName: body.customerName ?? existing.customerName,
    customerPhone: 'customerPhone' in body ? body.customerPhone : existing.customerPhone,
    customerEmail: 'customerEmail' in body ? body.customerEmail : existing.customerEmail,
    policyNumber: body.policyNumber ?? existing.policyNumber,
    issueDate: body.issueDate ?? existing.issueDate,
    paymentFrequency: body.paymentFrequency ?? existing.paymentFrequency,
    status: body.status ?? existing.status,
    grossPremium: body.grossPremium ?? existing.grossPremium,
    netPremium: body.netPremium ?? existing.netPremium,
    gstPercent: body.gstPercent ?? existing.gstPercent,
    commissionPercent: body.commissionPercent ?? existing.commissionPercent,
    tdsPercent: body.tdsPercent ?? existing.tdsPercent,
    leadSource: body.leadSource ?? existing.leadSource,
    invoiceNumber: 'invoiceNumber' in body ? body.invoiceNumber : existing.invoiceNumber,
    invoiceDate: 'invoiceDate' in body ? body.invoiceDate : existing.invoiceDate,
    creditedDate: 'creditedDate' in body ? body.creditedDate : existing.creditedDate,
    paymentMode: 'paymentMode' in body ? body.paymentMode : existing.paymentMode,
    remarks: 'remarks' in body ? body.remarks : existing.remarks,
  };

  const financials = calcFinancials({
    netPremium: merged.netPremium,
    gstPercent: merged.gstPercent,
    commissionPercent: merged.commissionPercent,
    tdsPercent: merged.tdsPercent,
  });

  const renewalDate = calcRenewalDate(merged.issueDate, merged.paymentFrequency);

  return prisma.policy.update({
    where: { id },
    data: {
      insurerName: merged.insurerName,
      insuranceCategory: merged.insuranceCategory,
      productName: merged.productName,
      customerName: merged.customerName,
      customerPhone: merged.customerPhone || null,
      customerEmail: merged.customerEmail || null,
      policyNumber: merged.policyNumber,
      issueDate: new Date(merged.issueDate),
      renewalDate,
      paymentFrequency: merged.paymentFrequency,
      status: merged.status,
      grossPremium: Number(merged.grossPremium),
      netPremium: Number(merged.netPremium),
      gstPercent: Number(merged.gstPercent),
      gstAmount: financials.gstAmount,
      commissionPercent: Number(merged.commissionPercent),
      commissionAmount: financials.commissionAmount,
      tdsPercent: Number(merged.tdsPercent),
      tdsAmount: financials.tdsAmount,
      finalReceivable: financials.finalReceivable,
      leadSource: merged.leadSource,
      invoiceNumber: merged.invoiceNumber || null,
      invoiceDate: merged.invoiceDate ? new Date(merged.invoiceDate) : null,
      creditedDate: merged.creditedDate ? new Date(merged.creditedDate) : null,
      paymentMode: merged.paymentMode || null,
      remarks: merged.remarks || null,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

module.exports = { create, list, getById, update };
