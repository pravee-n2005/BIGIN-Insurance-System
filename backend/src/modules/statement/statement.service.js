'use strict';

const prisma         = require('../../config/prisma');
const invoiceService = require('../invoice/invoice.service');

// ── Constants ────────────────────────────────────────────────────────────────

const SUPPLIER_STATE = 'Tamil Nadu';

// Mirror of the alias map in invoice.service.js. Imported policies use legacy
// insurer names ("HDFC ERGO", "ICICI Lombard") that don't match canonical
// Insurer.name. We reuse this map so available-policies finds them all.
const INSURER_ALIASES = {
  'ICICI Lombard General':  ['ICICI Lombard'],
  'ICICI Prudential Life':  ['ICICI Pru Life'],
  'Star Health Insurance':  ['STAR Health'],
  'HDFC Ergo General':      ['HDFC ERGO'],
  'Care Health':            ['Care health', 'Care health '],
  'United India General':   ['United India Ins'],
  'New India Assurance':    ['New India Ins'],
  'Cholamandalam General':  ['Cholamandalam'],
  'Tata AIA Life':          ['TATA AIA'],
  'Go Digit General':       ['Digit General'],
  'Go Digit Life':          ['Digit Life'],
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function matchingInsurerNames(canonicalName) {
  return [canonicalName, ...(INSURER_ALIASES[canonicalName] || [])];
}

function err(status, message) {
  return Object.assign(new Error(message), { status });
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
}

// Default include for all reads — keeps controller payloads consistent.
const STATEMENT_INCLUDE = {
  insurer:   { select: { id: true, name: true } },
  invoice:   { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
  createdBy: { select: { id: true, name: true } },
  policies: {
    orderBy: { id: 'asc' },
    include: {
      policy: {
        select: {
          id: true, policyNumber: true, customerName: true,
          insurerName: true, insuranceCategory: true, productName: true,
          issueDate: true, netPremium: true, commissionAmount: true, status: true,
        },
      },
    },
  },
};

// ─── Create ───────────────────────────────────────────────────────────────────

async function create(body, createdById) {
  const insurer = await prisma.insurer.findUnique({ where: { id: Number(body.insurerId) } });
  if (!insurer) throw err(404, 'Insurer not found.');

  // Friendly uniqueness check before hitting the DB constraint
  const dup = await prisma.insurerStatement.findFirst({
    where: { insurerId: insurer.id, statementRefNo: body.statementRefNo.trim() },
    select: { id: true },
  });
  if (dup) throw err(409, `Statement reference "${body.statementRefNo}" already exists for this insurer.`);

  return prisma.insurerStatement.create({
    data: {
      insurerId:        insurer.id,
      statementRefNo:   body.statementRefNo.trim(),
      statementDate:    new Date(body.statementDate),
      creditDate:       body.creditDate ? new Date(body.creditDate) : null,
      businessMonth:    body.businessMonth,
      remarks:          body.remarks?.trim() || null,
      statementFileUrl: body.statementFileUrl?.trim() || null,
      createdById,
    },
    include: STATEMENT_INCLUDE,
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

async function list({ insurerId, status, businessMonth, page = 1, limit = 20 }) {
  const where = {};
  if (insurerId)     where.insurerId     = Number(insurerId);
  if (status)        where.status        = status;
  if (businessMonth) where.businessMonth = businessMonth;

  const [data, total] = await Promise.all([
    prisma.insurerStatement.findMany({
      where,
      orderBy: { statementDate: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        insurer:  { select: { id: true, name: true } },
        invoice:  { select: { id: true, invoiceNumber: true, status: true } },
        _count:   { select: { policies: true } },
      },
    }),
    prisma.insurerStatement.count({ where }),
  ]);

  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

// ─── Get by id ────────────────────────────────────────────────────────────────

async function getById(id) {
  const stmt = await prisma.insurerStatement.findUnique({
    where: { id },
    include: STATEMENT_INCLUDE,
  });
  if (!stmt) throw err(404, 'Statement not found.');
  return stmt;
}

// ─── Update metadata (DRAFT only) ─────────────────────────────────────────────

async function update(id, body) {
  const existing = await prisma.insurerStatement.findUnique({ where: { id } });
  if (!existing) throw err(404, 'Statement not found.');
  if (existing.status !== 'DRAFT')
    throw err(409, `Cannot edit a statement in status ${existing.status}. Only DRAFT statements are editable.`);

  // Check refNo collision if changed
  if (body.statementRefNo && body.statementRefNo.trim() !== existing.statementRefNo) {
    const dup = await prisma.insurerStatement.findFirst({
      where: {
        insurerId:      existing.insurerId,
        statementRefNo: body.statementRefNo.trim(),
        NOT:            { id },
      },
      select: { id: true },
    });
    if (dup) throw err(409, `Statement reference "${body.statementRefNo}" already exists for this insurer.`);
  }

  const data = {};
  if ('statementRefNo'   in body) data.statementRefNo   = body.statementRefNo.trim();
  if ('statementDate'    in body) data.statementDate    = new Date(body.statementDate);
  if ('creditDate'       in body) data.creditDate       = body.creditDate ? new Date(body.creditDate) : null;
  if ('businessMonth'    in body) data.businessMonth    = body.businessMonth;
  if ('remarks'          in body) data.remarks          = body.remarks?.trim() || null;
  if ('statementFileUrl' in body) data.statementFileUrl = body.statementFileUrl?.trim() || null;

  return prisma.insurerStatement.update({
    where: { id },
    data,
    include: STATEMENT_INCLUDE,
  });
}

// ─── Available policies for attaching ─────────────────────────────────────────
// Returns policies belonging to the given insurer (canonical + alias names),
// not cancelled, not already attached to any non-cancelled statement.

async function availablePolicies({ insurerId, businessMonth }) {
  const insurer = await prisma.insurer.findUnique({ where: { id: Number(insurerId) } });
  if (!insurer) throw err(404, 'Insurer not found.');

  const names = matchingInsurerNames(insurer.name);

  // Subquery: policy IDs locked in any non-cancelled statement
  const locked = await prisma.statementPolicy.findMany({
    where: { statement: { status: { not: 'CANCELLED' } } },
    select: { policyId: true },
  });
  const lockedIds = locked.map(r => r.policyId);

  const where = {
    insurerName: { in: names },
    status:      { not: 'CANCELLED' },
    id:          { notIn: lockedIds.length ? lockedIds : [-1] },
  };
  if (businessMonth) {
    const { from, to } = monthRange(businessMonth);
    where.issueDate = { gte: from, lt: to };
  }

  return prisma.policy.findMany({
    where,
    orderBy: { issueDate: 'desc' },
    select: {
      id: true, policyNumber: true, customerName: true,
      insurerName: true, insuranceCategory: true, productName: true,
      issueDate: true, netPremium: true,
      commissionPercent: true, commissionAmount: true,
      status: true,
    },
  });
}

// ─── Bulk attach policies (DRAFT only) ────────────────────────────────────────

async function attachPolicies(id, body) {
  const stmt = await prisma.insurerStatement.findUnique({
    where: { id },
    include: { insurer: true },
  });
  if (!stmt) throw err(404, 'Statement not found.');
  if (stmt.status !== 'DRAFT')
    throw err(409, `Cannot attach policies — statement status is ${stmt.status}.`);

  const ids        = body.policies.map(p => Number(p.policyId));
  const valueById  = new Map(body.policies.map(p => [Number(p.policyId), Number(p.taxableValue)]));
  const names      = matchingInsurerNames(stmt.insurer.name);

  // Validate all policies exist and belong to this insurer
  const policies = await prisma.policy.findMany({
    where:  { id: { in: ids } },
    select: { id: true, insurerName: true, status: true, policyNumber: true },
  });
  const policyById = new Map(policies.map(p => [p.id, p]));

  for (const pid of ids) {
    const p = policyById.get(pid);
    if (!p) throw err(404, `Policy ${pid} not found.`);
    if (p.status === 'CANCELLED') throw err(400, `Policy ${p.policyNumber} is cancelled and cannot be attached.`);
    if (!names.includes(p.insurerName))
      throw err(400, `Policy ${p.policyNumber} belongs to "${p.insurerName}", not to ${stmt.insurer.name}.`);
  }

  // Check none of them are already in another non-cancelled statement
  const conflicts = await prisma.statementPolicy.findMany({
    where: {
      policyId:   { in: ids },
      statement:  { status: { not: 'CANCELLED' } },
    },
    include: {
      statement: { select: { id: true, statementRefNo: true } },
      policy:    { select: { policyNumber: true } },
    },
  });
  if (conflicts.length > 0) {
    const c = conflicts[0];
    throw err(409, `Policy ${c.policy.policyNumber} is already attached to statement ${c.statement.statementRefNo}.`);
  }

  // All clear — bulk create inside a transaction
  await prisma.$transaction(
    ids.map(pid =>
      prisma.statementPolicy.create({
        data: {
          statementId:  id,
          policyId:     pid,
          taxableValue: round2(valueById.get(pid)),
        },
      })
    )
  );

  return getById(id);
}

// ─── Update one attached policy's taxable value (DRAFT only) ──────────────────

async function updateStatementPolicy(statementId, spId, body) {
  const stmt = await prisma.insurerStatement.findUnique({ where: { id: statementId } });
  if (!stmt) throw err(404, 'Statement not found.');
  if (stmt.status !== 'DRAFT')
    throw err(409, `Cannot edit policy — statement status is ${stmt.status}.`);

  const sp = await prisma.statementPolicy.findUnique({ where: { id: spId } });
  if (!sp || sp.statementId !== statementId)
    throw err(404, 'Statement policy not found.');

  return prisma.statementPolicy.update({
    where: { id: spId },
    data:  { taxableValue: round2(body.taxableValue) },
    include: {
      policy: {
        select: {
          id: true, policyNumber: true, customerName: true,
          insurerName: true, insuranceCategory: true, productName: true,
          issueDate: true, netPremium: true, commissionAmount: true,
        },
      },
    },
  });
}

// ─── Detach a policy (DRAFT only) ─────────────────────────────────────────────

async function detachPolicy(statementId, spId) {
  const stmt = await prisma.insurerStatement.findUnique({ where: { id: statementId } });
  if (!stmt) throw err(404, 'Statement not found.');
  if (stmt.status !== 'DRAFT')
    throw err(409, `Cannot detach policy — statement status is ${stmt.status}.`);

  const sp = await prisma.statementPolicy.findUnique({ where: { id: spId } });
  if (!sp || sp.statementId !== statementId)
    throw err(404, 'Statement policy not found.');

  await prisma.statementPolicy.delete({ where: { id: spId } });
  return { detached: true };
}

// ─── Finalize — compute totals + GST split, lock to FINALIZED ─────────────────

async function finalize(id) {
  const stmt = await prisma.insurerStatement.findUnique({
    where: { id },
    include: {
      insurer:  { include: { invoiceProfile: true } },
      policies: { select: { taxableValue: true } },
    },
  });
  if (!stmt) throw err(404, 'Statement not found.');
  if (stmt.status !== 'DRAFT')
    throw err(409, `Cannot finalize — statement status is ${stmt.status}.`);
  if (stmt.policies.length === 0)
    throw err(409, 'Cannot finalize a statement with no attached policies.');

  const profile = stmt.insurer.invoiceProfile;
  if (!profile || !profile.active)
    throw err(400, 'Insurer has no active invoice profile. Add one in /invoice-profiles first.');

  // Aggregate + GST split
  const total = round2(stmt.policies.reduce((s, p) => s + Number(p.taxableValue), 0));
  const intraState = profile.state.trim().toLowerCase() === SUPPLIER_STATE.toLowerCase();

  let cgstRate = 0, cgstAmount = 0, sgstRate = 0, sgstAmount = 0, igstRate = 0, igstAmount = 0;
  if (intraState) {
    cgstRate = 9; sgstRate = 9;
    cgstAmount = round2(total * 0.09);
    sgstAmount = round2(total * 0.09);
  } else {
    igstRate = 18;
    igstAmount = round2(total * 0.18);
  }
  const invoiceValue = round2(total + cgstAmount + sgstAmount + igstAmount);

  return prisma.insurerStatement.update({
    where: { id },
    data: {
      totalTaxableValue: total,
      cgstRate, cgstAmount,
      sgstRate, sgstAmount,
      igstRate, igstAmount,
      invoiceValue,
      status: 'FINALIZED',
    },
    include: STATEMENT_INCLUDE,
  });
}

// ─── Generate invoice (FINALIZED → INVOICED) ──────────────────────────────────
// Delegates to invoice.service.saveInvoiceFromStatement(), which creates the
// Invoice row, snapshots the recipient profile, generates BG###, and links
// both directions. Wraps the lifecycle change here.

async function generateInvoice(id, createdById) {
  const stmt = await prisma.insurerStatement.findUnique({ where: { id } });
  if (!stmt) throw err(404, 'Statement not found.');
  if (stmt.status !== 'FINALIZED')
    throw err(409, `Cannot generate invoice — statement status is ${stmt.status}. Must be FINALIZED.`);
  if (stmt.invoiceId)
    throw err(409, `Statement already has an invoice (id ${stmt.invoiceId}).`);

  const invoice = await invoiceService.saveInvoiceFromStatement({ statementId: id, createdById });
  const updated = await getById(id);
  return { statement: updated, invoice };
}

// ─── Cancel ───────────────────────────────────────────────────────────────────
// DRAFT / FINALIZED: free.
// INVOICED: only if linked Invoice is already CANCELLED (user must cancel
//   the invoice first via /api/invoices/:id/cancel).

async function cancel(id) {
  const stmt = await prisma.insurerStatement.findUnique({
    where: { id },
    include: { invoice: { select: { id: true, invoiceNumber: true, status: true } } },
  });
  if (!stmt) throw err(404, 'Statement not found.');
  if (stmt.status === 'CANCELLED')
    throw err(409, 'Statement is already cancelled.');

  if (stmt.status === 'INVOICED') {
    if (!stmt.invoice || stmt.invoice.status !== 'CANCELLED') {
      throw err(409,
        `Cannot cancel — linked invoice ${stmt.invoice?.invoiceNumber || ''} must be cancelled first.`);
    }
  }

  return prisma.insurerStatement.update({
    where: { id },
    data:  { status: 'CANCELLED' },
    include: STATEMENT_INCLUDE,
  });
}

module.exports = {
  create,
  list,
  getById,
  update,
  availablePolicies,
  attachPolicies,
  updateStatementPolicy,
  detachPolicy,
  finalize,
  generateInvoice,
  cancel,
};
