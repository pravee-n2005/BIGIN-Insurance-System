const prisma = require('../../config/prisma');

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPLIER_STATE = 'Tamil Nadu';

// Map canonical insurer name → legacy aliases used in historical Policy rows.
// Aggregation queries Policy.insurerName by union of these to capture all
// past policies under the canonical insurer.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function matchingInsurerNames(canonicalName) {
  return [canonicalName, ...(INSURER_ALIASES[canonicalName] || [])];
}

function monthRange(billingMonth) {
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
    throw Object.assign(new Error('billingMonth must be YYYY-MM'), { status: 400 });
  }
  const [year, mon] = billingMonth.split('-').map(Number);
  return {
    year, mon,
    from: new Date(year, mon - 1, 1),
    to:   new Date(year, mon, 1),
    label: new Date(year, mon - 1, 1).toLocaleString('en-US', { month: 'long' }) + ' ' + year,
  };
}

function formatLineItemText(byCategory, policyCount) {
  const entries = Object.entries(byCategory);
  if (entries.length === 0) return '';
  // Sort by count desc; use top category for the headline
  entries.sort((a, b) => b[1] - a[1]);
  const [topCat, topCount] = entries[0];
  const human = topCat
    .toLowerCase()
    .split('_').join(' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (entries.length === 1) {
    return `${human} Insurance - ${policyCount} Nos`;
  }
  return `${human} Insurance (mixed) - ${policyCount} Nos`;
}

// ─── Number sequencer ─────────────────────────────────────────────────────────
// Continues from the highest BG### seen across either:
//   - the new Invoice table (future generated invoices)
//   - the historical Policy.invoiceNumber column (legacy ledger numbers)

async function nextInvoiceNumber() {
  const [invoiceRow, policyRow] = await Promise.all([
    prisma.invoice.findFirst({
      where:   { invoiceNumber: { startsWith: 'BG' } },
      orderBy: { invoiceNumber: 'desc' },
      select:  { invoiceNumber: true },
    }),
    prisma.policy.findFirst({
      where:   { invoiceNumber: { startsWith: 'BG' } },
      orderBy: { invoiceNumber: 'desc' },
      select:  { invoiceNumber: true },
    }),
  ]);

  const candidates = [invoiceRow?.invoiceNumber, policyRow?.invoiceNumber]
    .filter(Boolean)
    .map((s) => parseInt(s.replace(/^BG/, ''), 10))
    .filter((n) => !isNaN(n));

  const next = (candidates.length ? Math.max(...candidates) : 0) + 1;
  return 'BG' + String(next).padStart(3, '0');
}

// ─── Indian-system number-to-words (rupees + paise) ───────────────────────────

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
              'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
              'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function twoDigit(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function threeDigit(n) {
  const h = Math.floor(n / 100), rest = n % 100;
  let s = '';
  if (h) s += ONES[h] + ' hundred';
  if (rest) s += (s ? ' and ' : '') + twoDigit(rest);
  return s;
}

function inrToWords(amount) {
  // Standard Indian numbering: crore (10^7), lakh (10^5), thousand (10^3), hundred
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero rupees only';

  const parts = [];
  let n = rupees;

  const crore    = Math.floor(n / 10000000); n %= 10000000;
  const lakh     = Math.floor(n / 100000);   n %= 100000;
  const thousand = Math.floor(n / 1000);     n %= 1000;
  const hundred  = n;

  if (crore)    parts.push(twoDigit(crore) + ' crore');
  if (lakh)     parts.push(twoDigit(lakh) + ' lakh');
  if (thousand) parts.push(twoDigit(thousand) + ' thousand');
  if (hundred)  parts.push(threeDigit(hundred));

  let words = parts.join(' ').trim();
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);

  let out = `${words} rupees`;
  if (paise > 0) out += ` and ${twoDigit(paise)} paise`;
  out += ' only';
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function generateDraft({ insurerId, billingMonth }) {
  // 1. Insurer + profile
  const insurer = await prisma.insurer.findUnique({
    where:   { id: insurerId },
    include: { invoiceProfile: true },
  });
  if (!insurer) {
    throw Object.assign(new Error('Insurer not found.'), { status: 404 });
  }
  if (!insurer.invoiceProfile || !insurer.invoiceProfile.active) {
    throw Object.assign(new Error('This insurer has no active invoice profile. Add one in /invoice-profiles first.'), { status: 400 });
  }

  // 2. Month range
  const { year, mon, from, to, label: monthLabel } = monthRange(billingMonth);

  // 3. Aggregate policies
  // Exclude CANCELLED — cancelled policies have their commission reversed by the insurer
  // and must not appear on brokerage invoices.
  // ACTIVE, PENDING, EXPIRED are all included: commission was earned at policy inception
  // regardless of current lifecycle state.
  const names = matchingInsurerNames(insurer.name);
  const policies = await prisma.policy.findMany({
    where: {
      insurerName: { in: names },
      issueDate:   { gte: from, lt: to },
      status:      { not: 'CANCELLED' },
    },
    select: { id: true, commissionAmount: true, insuranceCategory: true, policyNumber: true, customerName: true },
  });

  const policyCount = policies.length;
  const taxableValue = round2(policies.reduce((s, p) => s + Number(p.commissionAmount ?? 0), 0));

  // 4. Category breakdown for line item text
  const byCategory = {};
  for (const p of policies) {
    byCategory[p.insuranceCategory] = (byCategory[p.insuranceCategory] || 0) + 1;
  }
  const lineItemText = policyCount > 0 ? formatLineItemText(byCategory, policyCount) : '';

  // 5. GST split — intra-state Tamil Nadu vs IGST inter-state
  const profile = insurer.invoiceProfile;
  const intraState = profile.state.trim().toLowerCase() === SUPPLIER_STATE.toLowerCase();

  let cgstRate = 0, cgstAmount = 0, sgstRate = 0, sgstAmount = 0, igstRate = 0, igstAmount = 0;
  if (intraState) {
    cgstRate   = 9;
    sgstRate   = 9;
    cgstAmount = round2(taxableValue * 0.09);
    sgstAmount = round2(taxableValue * 0.09);
  } else {
    igstRate   = 18;
    igstAmount = round2(taxableValue * 0.18);
  }

  const totalAmount  = round2(taxableValue + cgstAmount + sgstAmount + igstAmount);
  const totalInWords = inrToWords(totalAmount);

  // 6. Headers + descriptors
  const description = `Brokerage for the month of ${monthLabel}`;
  const invoiceNumber = await nextInvoiceNumber();

  // 7. Draft response (NOT saved)
  return {
    status:      'DRAFT',
    invoiceNumber,
    invoiceDate: new Date().toISOString(),
    insurerId:   insurer.id,
    insurerName: insurer.name,  // snapshot value — stored on save
    billingMonth,

    description,
    lineItemText,
    policyCount,
    taxableValue,
    cgstRate, cgstAmount,
    sgstRate, sgstAmount,
    igstRate, igstAmount,
    totalAmount,
    totalInWords,

    recipient: {
      header:    profile.recipientHeader,
      legalName: profile.legalName,
      address:   profile.billingAddress,
      state:     profile.state,
      stateCode: profile.stateCode,
      gstin:     profile.gstin,
    },

    // Supplier (constant) — included for UI preview only; not stored.
    supplier: {
      legalName:  'Bigin Insurance Brokers Private Limited',
      address:    '26/1 Sree Building, Sarojini Street, T Nagar Chennai 600017',
      state:      'Tamil Nadu',
      stateCode:  '033',
      gstin:      '33AALCB7296B1ZN',
      hsnCode:    '997161',
    },

    // Debugging aid for admin review
    matchedInsurerNames: names,
    policyIds: policies.map((p) => p.id),
    policySamples: policies.slice(0, 5).map((p) => ({
      policyNumber: p.policyNumber,
      customerName: p.customerName,
      category:     p.insuranceCategory,
      commission:   Number(p.commissionAmount),
    })),
  };
}

// ─── List saved invoices ──────────────────────────────────────────────────────

async function list({ insurerId, status, billingMonth, page = 1, limit = 20 }) {
  const where = {};
  if (insurerId)    where.insurerId = parseInt(insurerId);
  if (status)       where.status = status;
  if (billingMonth) where.billingMonth = billingMonth;

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        insurer:   { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

// ─── Save invoice ─────────────────────────────────────────────────────────────
// Generates authoritative draft (backend-only calculations), then writes inside
// a transaction. The duplicate-check + insert happen atomically; the unique
// constraint on invoiceNumber is the final guard against concurrent races.

async function saveInvoice({ insurerId, billingMonth, createdById }) {
  // Compute draft OUTSIDE the transaction — reads are safe and this keeps
  // the transaction window short (minimises lock contention).
  const draft = await generateDraft({ insurerId, billingMonth });

  try {
    const saved = await prisma.$transaction(async (tx) => {
      // Guard: reject if a FINALIZED or legacy ISSUED invoice already exists
      // for this insurer + month. DRAFT invoices do not block re-generation.
      const existing = await tx.invoice.findFirst({
        where: { insurerId, billingMonth, status: { in: ['FINALIZED', 'ISSUED'] } },
        select: { invoiceNumber: true, status: true },
      });
      if (existing) {
        throw Object.assign(
          new Error(
            `A finalized invoice (${existing.invoiceNumber}) already exists for this insurer and month.`
          ),
          { status: 409 }
        );
      }

      const created = await tx.invoice.create({
        data: {
          invoiceNumber:      draft.invoiceNumber,
          invoiceDate:        new Date(draft.invoiceDate),
          insurerId:          draft.insurerId,
          insurerName:        draft.insurerName,           // snapshot
          billingMonth:       draft.billingMonth,
          description:        draft.description,
          lineItemText:       draft.lineItemText,
          policyCount:        draft.policyCount,
          taxableValue:       draft.taxableValue,
          cgstRate:           draft.cgstRate,
          cgstAmount:         draft.cgstAmount,
          sgstRate:           draft.sgstRate,
          sgstAmount:         draft.sgstAmount,
          igstRate:           draft.igstRate,
          igstAmount:         draft.igstAmount,
          totalAmount:        draft.totalAmount,
          totalInWords:       draft.totalInWords,
          recipientHeader:    draft.recipient.header,
          recipientLegalName: draft.recipient.legalName,
          recipientAddress:   draft.recipient.address,
          recipientState:     draft.recipient.state,
          recipientStateCode: draft.recipient.stateCode,
          recipientGstin:     draft.recipient.gstin,
          status:             'FINALIZED',
          createdById,
        },
        include: {
          insurer:   { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Phase 1 — Invoice Raised Tracking: mark the aggregated policies as invoiced.
      if (draft.policyIds.length) {
        await tx.policy.updateMany({
          where: { id: { in: draft.policyIds } },
          data:  { invoiceRaised: true, invoiceRaisedAt: new Date() },
        });
      }

      return created;
    });

    return saved;
  } catch (err) {
    // Unique-constraint violation on invoiceNumber means two concurrent saves
    // raced. Surface as a retriable 409 rather than an opaque 500.
    if (err.code === 'P2002') {
      throw Object.assign(
        new Error('Invoice number conflict due to concurrent save. Please try again.'),
        { status: 409 }
      );
    }
    throw err;
  }
}

// ─── Cancel invoice ───────────────────────────────────────────────────────────
// Sets status → CANCELLED with a mandatory reason. Never deletes the record.

const INVOICE_CANCELLATION_REASONS = [
  'DUPLICATE_INVOICE', 'INCORRECT_TAXABLE_VALUE', 'WRONG_INSURER_SELECTED',
  'GST_CALCULATION_ERROR', 'REPLACED_BY_NEW_INVOICE', 'TEST_DUMMY_INVOICE',
  'CLIENT_REQUEST', 'PAYMENT_REVERSED', 'OTHER',
];

async function cancelInvoice(id, body, userId) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw Object.assign(new Error('Invoice not found.'), { status: 404 });
  }
  if (invoice.status === 'CANCELLED') {
    throw Object.assign(new Error('Invoice is already cancelled.'), { status: 409 });
  }

  const reason = body?.cancellationReason;
  if (!reason) {
    throw Object.assign(new Error('cancellationReason is required.'), { status: 400 });
  }
  if (!INVOICE_CANCELLATION_REASONS.includes(reason)) {
    throw Object.assign(
      new Error(`cancellationReason must be one of: ${INVOICE_CANCELLATION_REASONS.join(', ')}.`),
      { status: 400 }
    );
  }
  if (reason === 'OTHER' && !body?.cancellationReasonOther?.trim()) {
    throw Object.assign(new Error('cancellationReasonOther is required when reason is OTHER.'), { status: 400 });
  }
  if (body?.cancellationReasonOther && body.cancellationReasonOther.length > 500) {
    throw Object.assign(new Error('cancellationReasonOther must not exceed 500 characters.'), { status: 400 });
  }

  // Phase 1 — Invoice Raised Tracking: un-mark the policies this invoice covered
  // so they become eligible for re-invoicing. For statement-based invoices, use
  // the linked StatementPolicy rows (exact set). Otherwise, fall back to the same
  // insurer + billing-month match used by generateDraft().
  const linkedStatement = await prisma.insurerStatement.findUnique({
    where: { invoiceId: id },
    include: { policies: { select: { policyId: true } } },
  });

  let policyIds;
  if (linkedStatement) {
    policyIds = linkedStatement.policies.map((sp) => sp.policyId);
  } else {
    const { from, to } = monthRange(invoice.billingMonth);
    const names = matchingInsurerNames(invoice.insurerName ?? '');
    const policies = await prisma.policy.findMany({
      where: {
        insurerName: { in: names },
        issueDate:   { gte: from, lt: to },
        invoiceRaised: true,
      },
      select: { id: true },
    });
    policyIds = policies.map((p) => p.id);
  }

  return prisma.$transaction(async (tx) => {
    if (policyIds.length) {
      await tx.policy.updateMany({
        where: { id: { in: policyIds } },
        data:  { invoiceRaised: false, invoiceRaisedAt: null },
      });
    }

    // Revert any linked InsurerStatement back to FINALIZED so it can be re-invoiced.
    // The statement's invoiceId pointer is cleared so saveInvoiceFromStatement() no
    // longer treats it as already-invoiced.
    if (linkedStatement) {
      await tx.insurerStatement.update({
        where: { id: linkedStatement.id },
        data:  { status: 'FINALIZED', invoiceId: null },
      });
    }

    return tx.invoice.update({
      where: { id },
      data: {
        status:                 'CANCELLED',
        cancellationReason:     reason,
        cancellationReasonOther: reason === 'OTHER' ? body.cancellationReasonOther.trim() : null,
        cancelledAt:            new Date(),
        cancelledById:          userId,
      },
      include: {
        insurer:     { select: { id: true, name: true } },
        createdBy:   { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
      },
    });
  });
}

// ─── Save invoice from a finalized InsurerStatement ───────────────────────────
// Cross-module bridge used by the GST Module (statement.service.js). Reads
// frozen totals from the statement, snapshots the insurer's invoice profile,
// generates next BG### number, creates Invoice + links both directions.
// Transactional: invoice creation and statement.invoiceId/status updates are
// atomic.

async function saveInvoiceFromStatement({ statementId, createdById }) {
  const stmt = await prisma.insurerStatement.findUnique({
    where: { id: statementId },
    include: {
      insurer:  { include: { invoiceProfile: true } },
      policies: { include: { policy: { select: { insuranceCategory: true } } } },
    },
  });
  if (!stmt) throw Object.assign(new Error('Statement not found.'), { status: 404 });
  if (stmt.status !== 'FINALIZED')
    throw Object.assign(new Error(`Statement status is ${stmt.status}; must be FINALIZED.`), { status: 409 });
  if (stmt.invoiceId)
    throw Object.assign(new Error('Statement is already invoiced.'), { status: 409 });

  const profile = stmt.insurer.invoiceProfile;
  if (!profile || !profile.active)
    throw Object.assign(new Error('Insurer has no active invoice profile.'), { status: 400 });

  // Build description from businessMonth
  const [bmY, bmM] = stmt.businessMonth.split('-').map(Number);
  const monthLabel = new Date(bmY, bmM - 1, 1).toLocaleString('en-US', { month: 'long' }) + ' ' + bmY;
  const description = `Brokerage for the month of ${monthLabel}`;

  // Build lineItemText from category breakdown
  const byCategory = {};
  for (const sp of stmt.policies) {
    const cat = sp.policy.insuranceCategory;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  const policyCount  = stmt.policies.length;
  const lineItemText = policyCount > 0 ? formatLineItemText(byCategory, policyCount) : '';

  // Get next number OUTSIDE the transaction to keep the lock window small
  const invoiceNumber = await nextInvoiceNumber();
  const totalInWords  = inrToWords(Number(stmt.invoiceValue));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate:        new Date(),
          insurerId:          stmt.insurerId,
          insurerName:        stmt.insurer.name,
          billingMonth:       stmt.businessMonth,
          description,
          lineItemText,
          policyCount,
          taxableValue:       stmt.totalTaxableValue,
          cgstRate:           stmt.cgstRate,
          cgstAmount:         stmt.cgstAmount,
          sgstRate:           stmt.sgstRate,
          sgstAmount:         stmt.sgstAmount,
          igstRate:           stmt.igstRate,
          igstAmount:         stmt.igstAmount,
          totalAmount:        stmt.invoiceValue,
          totalInWords,
          recipientHeader:    profile.recipientHeader,
          recipientLegalName: profile.legalName,
          recipientAddress:   profile.billingAddress,
          recipientState:     profile.state,
          recipientStateCode: profile.stateCode,
          recipientGstin:     profile.gstin,
          status:             'FINALIZED',
          createdById,
        },
        include: {
          insurer:   { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await tx.insurerStatement.update({
        where: { id: statementId },
        data:  { invoiceId: invoice.id, status: 'INVOICED' },
      });

      // Phase 1 — Invoice Raised Tracking: mark the attached policies as invoiced.
      const policyIds = stmt.policies.map((sp) => sp.policyId);
      if (policyIds.length) {
        await tx.policy.updateMany({
          where: { id: { in: policyIds } },
          data:  { invoiceRaised: true, invoiceRaisedAt: new Date() },
        });
      }

      return invoice;
    });

    return result;
  } catch (e) {
    if (e.code === 'P2002') {
      throw Object.assign(
        new Error('Invoice number conflict due to concurrent save. Please try again.'),
        { status: 409 }
      );
    }
    throw e;
  }
}

// ─── Module 4 — Toggle GST-exempt flag ────────────────────────────────────────
// Admin-only classification flag for report use. Allowed in any status except
// CANCELLED. Does not modify the invoice PDF or the financial calculations.

async function setGstExempt(id, isGstExempt) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw Object.assign(new Error('Invoice not found.'), { status: 404 });
  if (inv.status === 'CANCELLED')
    throw Object.assign(new Error('Cannot modify a cancelled invoice.'), { status: 409 });

  return prisma.invoice.update({
    where: { id },
    data:  { isGstExempt: !!isGstExempt },
    include: {
      insurer:   { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Get single invoice ───────────────────────────────────────────────────────

async function getInvoice(id) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      insurer:     { select: { id: true, name: true } },
      createdBy:   { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
    },
  });
  if (!invoice) {
    throw Object.assign(new Error('Invoice not found.'), { status: 404 });
  }
  return invoice;
}

module.exports = {
  generateDraft, saveInvoice, saveInvoiceFromStatement,
  cancelInvoice, getInvoice, list,
  setGstExempt,
  nextInvoiceNumber, inrToWords,
};
