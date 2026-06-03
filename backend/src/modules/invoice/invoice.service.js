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
  const names = matchingInsurerNames(insurer.name);
  const policies = await prisma.policy.findMany({
    where: {
      insurerName: { in: names },
      issueDate:   { gte: from, lt: to },
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
    status: 'DRAFT',
    invoiceNumber,
    invoiceDate: new Date().toISOString(),
    insurerId:   insurer.id,
    insurerName: insurer.name,
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
      include: { insurer: { select: { id: true, name: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

module.exports = { generateDraft, list, nextInvoiceNumber, inrToWords };
