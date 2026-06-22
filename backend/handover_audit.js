'use strict';
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const norm = s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');

async function run() {
  const ledger = JSON.parse(fs.readFileSync('C:/BIGIN-Insurance-System/ledger_full.json'));
  const ledgerPNs = new Set();
  for (const p of ledger) { const k = norm(p.policyNumber); if (k) ledgerPNs.add(k); }

  const [allPolicies, allInvoices, allUsers, allInsurers, allIncentives, allDaily, allStatements, allLeadMembers, allProducts] = await Promise.all([
    prisma.policy.findMany({ orderBy: { id: 'asc' } }),
    prisma.invoice.findMany({ orderBy: { id: 'asc' } }),
    prisma.user.findMany(),
    prisma.insurer.findMany(),
    prisma.incentive.findMany({ include: { leadMember: { select: { id: true, name: true, leadType: true, active: true } } } }),
    prisma.incentiveEntry.findMany({ include: { employee: { select: { id: true, name: true, leadType: true, active: true } } } }),
    prisma.insurerStatement.findMany({ include: { invoice: { select: { id: true, status: true } } } }),
    prisma.leadMember.findMany(),
    prisma.product.findMany(),
  ]);

  const flags = [];
  const flag = (id, type, reason, safeToDel, extra = {}) => flags.push({ id, type, reason, safeToDel, ...extra });

  const INSTALMENT_PNS = new Set([norm('7786112600009264-Q2'), norm('7786112600009264-Q3'), norm('K6819292-H2')]);
  const systemInvoiceNums = new Set(allInvoices.map(i => i.invoiceNumber));

  // ── POLICY AUDIT ─────────────────────────────────────────────────────────────
  for (const p of allPolicies) {
    const pn = norm(p.policyNumber);
    const name = (p.customerName || '').toLowerCase();
    const phone = String(p.customerPhone || '').replace(/\D/g, '');
    const email = String(p.customerEmail || '').toLowerCase();
    const rem = (p.remarks || '').toLowerCase();
    const gross = Number(p.grossPremium);
    const isInstalment = INSTALMENT_PNS.has(pn);
    const isUnknown = /^UNKNOWN-/i.test(p.policyNumber);
    const isLedger = ledgerPNs.has(pn);
    const isSeedPN = /^(SH\d{6,}|HDMOTOR\d+)$/i.test(p.policyNumber);

    if (/^(test|demo|sample|dummy|abc|xxx|aaa)$/.test(name.trim())) {
      flag(p.id, 'POLICY', 'Customer name is a test keyword: "' + p.customerName + '"', true,
        { policyNumber: p.policyNumber, customer: p.customerName, gross });
    }
    if (/^test customer/i.test(p.customerName)) {
      flag(p.id, 'POLICY', 'Customer name starts with "Test Customer": ' + p.customerName, true,
        { policyNumber: p.policyNumber, customer: p.customerName });
    }
    if (/^(0{10}|1{10}|9{10}|1234567890|0987654321|123456789\d?)$/.test(phone)) {
      flag(p.id, 'POLICY', 'Fake/sequential phone number: ' + phone, false,
        { policyNumber: p.policyNumber, customer: p.customerName });
    }
    if (isSeedPN) {
      flag(p.id, 'POLICY', 'Seed/dev policy number pattern: ' + p.policyNumber, true,
        { customer: p.customerName, gross });
    }
    if (/^test|dummy|demo/.test(rem)) {
      flag(p.id, 'POLICY', 'Test keyword in remarks: "' + (p.remarks || '').slice(0, 80) + '"', true,
        { policyNumber: p.policyNumber, customer: p.customerName });
    }
    if (isUnknown) {
      flag(p.id, 'POLICY', 'Auto-assigned UNKNOWN- policy number (import artefact): ' + p.policyNumber, false,
        { customer: p.customerName, insurer: p.insurerName, gross });
    }
    if (!p.policyNumber || p.policyNumber.trim() === '') {
      flag(p.id, 'POLICY', 'Blank policy number — failed validation at creation', true,
        { customer: p.customerName, gross });
    }
    // Not in ledger, not an instalment, not unknown, not seed
    if (!isLedger && !isInstalment && !isUnknown && !isSeedPN && p.policyNumber) {
      const inCreatedBatch = p.createdAt < new Date('2026-06-01') && rem.includes('imported from ledger');
      if (gross === 0 && !inCreatedBatch) {
        flag(p.id, 'POLICY', 'Zero-premium, not in ledger', true,
          { policyNumber: p.policyNumber, customer: p.customerName });
      }
    }
    // Broken BG-series invoice reference
    if (p.invoiceNumber && p.invoiceNumber.startsWith('BG')) {
      const num = parseInt(p.invoiceNumber.replace(/^BG0*/, ''), 10);
      if (num >= 49 && !systemInvoiceNums.has(p.invoiceNumber)) {
        flag(p.id, 'POLICY', 'Broken system invoice ref: ' + p.invoiceNumber + ' not in Invoice table', false,
          { policyNumber: p.policyNumber, customer: p.customerName });
      }
    }
  }

  // ── INVOICE AUDIT ────────────────────────────────────────────────────────────
  for (const inv of allInvoices) {
    const amt = Number(inv.totalAmount);
    if (inv.status === 'FINALIZED' && amt === 0) {
      flag(inv.id, 'INVOICE', 'FINALIZED invoice with ₹0 total — test artefact', true,
        { invoiceNumber: inv.invoiceNumber, insurer: inv.insurerName, billingMonth: inv.billingMonth });
    }
    if (inv.cancellationReason === 'TEST_DUMMY_INVOICE') {
      flag(inv.id, 'INVOICE', 'Cancelled with reason TEST_DUMMY_INVOICE', false,
        { invoiceNumber: inv.invoiceNumber, status: inv.status, insurer: inv.insurerName });
    }
    if (inv.status === 'CANCELLED') {
      const isDev = amt === 0 || inv.cancellationReason === 'TEST_DUMMY_INVOICE';
      flag(inv.id, 'INVOICE', 'Development-era CANCELLED invoice (BG049–BG061)',
        false, // cannot delete — referenced by policy.invoiceNumber on some records
        { invoiceNumber: inv.invoiceNumber, insurer: inv.insurerName, billingMonth: inv.billingMonth, amount: amt, cancellationReason: inv.cancellationReason });
    }
  }

  // ── STATEMENT AUDIT ──────────────────────────────────────────────────────────
  for (const s of allStatements) {
    if (s.status === 'INVOICED' && s.invoice && s.invoice.status === 'CANCELLED') {
      flag(s.id, 'STATEMENT', 'Orphaned INVOICED status — linked invoice is CANCELLED', true,
        { ref: s.statementRefNo, businessMonth: s.businessMonth });
    }
    if (/test|demo|credit-test|hdfc.*test/i.test(s.statementRefNo || '')) {
      flag(s.id, 'STATEMENT', 'Dev/test statement reference number: ' + s.statementRefNo,
        s.status === 'CANCELLED',
        { status: s.status, businessMonth: s.businessMonth, remarks: s.remarks });
    }
    if ((s.remarks || '').toLowerCase().includes('testing')) {
      flag(s.id, 'STATEMENT', 'Test keyword in remarks: "' + s.remarks + '"',
        s.status === 'CANCELLED',
        { ref: s.statementRefNo, status: s.status });
    }
  }

  // ── USER AUDIT ───────────────────────────────────────────────────────────────
  for (const u of allUsers) {
    const isPlaceholderEmail = /^(admin|owner|test|demo|seed)@/i.test(u.email);
    const isGenericName = /^(admin|owner|test|demo|user)$/i.test(u.name);
    if (isPlaceholderEmail) {
      flag(u.id, 'USER', 'Placeholder/seed email must be replaced: ' + u.email, false,
        { name: u.name, role: u.role });
    }
    if (isGenericName) {
      flag(u.id, 'USER', 'Generic display name must be replaced: ' + u.name, false,
        { email: u.email, role: u.role });
    }
  }

  // ── INSURER AUDIT ────────────────────────────────────────────────────────────
  for (const ins of allInsurers) {
    if (/^test[\s\d]*$|dummy|demo/i.test(ins.name)) {
      flag(ins.id, 'INSURER', 'Test/dummy insurer: ' + ins.name, true,
        { active: ins.active });
    }
  }

  // ── INCENTIVE AUDIT ──────────────────────────────────────────────────────────
  for (const inc of allIncentives) {
    if (!inc.leadMember) {
      flag(inc.id, 'INCENTIVE', 'Orphan — leadMemberId references missing member', true,
        { month: inc.month });
    }
    if (/^(test|demo|dummy)/i.test(inc.remarks || '')) {
      flag(inc.id, 'INCENTIVE', 'Test keyword in remarks: "' + inc.remarks + '"', true,
        { month: inc.month, member: inc.leadMember?.name });
    }
    if (inc.isDeleted) {
      flag(inc.id, 'INCENTIVE', 'Soft-deleted record (isDeleted=true) still in DB', false,
        { month: inc.month, member: inc.leadMember?.name, deletedAt: inc.deletedAt });
    }
  }

  // ── DAILY INCENTIVE AUDIT ────────────────────────────────────────────────────
  for (const de of allDaily) {
    if (!de.employee) {
      flag(de.id, 'DAILY_ENTRY', 'Orphan — employeeId references missing member', true,
        { date: de.date });
    }
    if (/test|demo|dummy|testing/i.test(de.remarks || '')) {
      flag(de.id, 'DAILY_ENTRY', 'Test keyword in remarks: "' + de.remarks + '"', true,
        { date: de.date, employee: de.employee?.name });
    }
  }

  // ── PRODUCT AUDIT ────────────────────────────────────────────────────────────
  for (const prod of allProducts) {
    if (/test|dummy|demo|commission.?flow/i.test(prod.name)) {
      flag(prod.id, 'PRODUCT', 'Test/dummy product name: ' + prod.name, true,
        { insurerId: prod.insurerId, active: prod.active });
    }
  }

  // ── NOT-IN-LEDGER POLICIES ───────────────────────────────────────────────────
  const notInLedger = allPolicies.filter(p => {
    const k = norm(p.policyNumber);
    return !ledgerPNs.has(k) && k;
  }).map(p => ({
    id: p.id, policyNumber: p.policyNumber, customer: p.customerName,
    insurer: p.insurerName, gross: Number(p.grossPremium),
    remarks: p.remarks, createdAt: p.createdAt,
    isInstalment: INSTALMENT_PNS.has(norm(p.policyNumber)),
    isUnknown: /^UNKNOWN-/i.test(p.policyNumber),
    isSeed: /^(SH\d{6,}|HDMOTOR\d+)$/i.test(p.policyNumber),
  }));

  // Build summary
  const byType = {};
  for (const f of flags) byType[f.type] = (byType[f.type] || 0) + 1;

  const result = {
    summary: { totalFlags: flags.length, byType, notInLedgerCount: notInLedger.length },
    flags,
    notInLedger,
    allUsers,
    allInvoices: allInvoices.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber, insurer: i.insurerName, billingMonth: i.billingMonth, status: i.status, amount: Number(i.totalAmount), policyCount: i.policyCount, cancellationReason: i.cancellationReason })),
    allStatements: allStatements.map(s => ({ id: s.id, ref: s.statementRefNo, status: s.status, businessMonth: s.businessMonth, invoiceStatus: s.invoice?.status || null, remarks: s.remarks })),
  };

  fs.writeFileSync('C:/BIGIN-Insurance-System/handover_audit.json', JSON.stringify(result, null, 2));
  console.log('SUMMARY:', JSON.stringify(result.summary, null, 2));
  console.log('\nNOT_IN_LEDGER:', result.notInLedger.length);
  result.notInLedger.forEach(p => console.log(' id:' + p.id, p.policyNumber, '|', p.customer, '|', p.insurer, '| gross:' + p.gross, '| instalment:' + p.isInstalment + ' seed:' + p.isSeed + ' unknown:' + p.isUnknown));
  console.log('\nALL FLAGS:');
  result.flags.forEach(f => console.log(' [' + f.type + '] id:' + f.id + ' | safe:' + f.safeToDel + ' | ' + f.reason));

  await prisma.$disconnect();
}
run().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
