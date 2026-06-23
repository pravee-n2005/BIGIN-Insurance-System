'use strict';
const fs   = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const round2  = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const norm    = s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
const normPN  = s => String(s || '').trim().toUpperCase().replace(/\s+/g, '');
const fmtDate = d => {
  if (!d) return null;
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  } catch { return null; }
};

// Canonical insurer name normalisation (ledger uses legacy short-forms)
const INSURER_NORM = {
  'icici lombard general': 'ICICI Lombard General',
  'icici lombard':         'ICICI Lombard General',
  'star health insurance': 'Star Health Insurance',
  'star health':           'Star Health Insurance',
  'hdfc ergo general':     'HDFC Ergo General',
  'hdfc ergo':             'HDFC Ergo General',
  'hdfc ergo gen':         'HDFC Ergo General',
  'hdfc ergo genl':        'HDFC Ergo General',
  'united india general':  'United India General',
  'united india ins':      'United India General',
  'icici prudential life': 'ICICI Prudential Life',
  'icici pru life':        'ICICI Prudential Life',
  'care health':           'Care Health',
  'care health ':          'Care Health',
  'go digit general':      'Go Digit General',
  'digit general':         'Go Digit General',
  'tata aia life':         'Tata AIA Life',
  'tata aia':              'Tata AIA Life',
  'new india assurance':   'New India Assurance',
  'new india ins':         'New India Assurance',
  'cholamandalam general': 'Cholamandalam General',
  'cholamandalam':         'Cholamandalam General',
  'go digit life':         'Go Digit Life',
  'digit life':            'Go Digit Life',
  'max life':              'Max Life',
  'lic':                   'LIC',
};
function normInsurer(s) {
  const k = String(s || '').trim().toLowerCase();
  return INSURER_NORM[k] || s?.trim() || '';
}

// Commission % normalisation: ledger may store as 0.35 (decimal) or 35 (percent)
function normCommPct(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return n > 1 ? round2(n) : round2(n * 100);   // convert 0.35 → 35
}

async function run() {
  const ledger = JSON.parse(fs.readFileSync('C:/BIGIN-Insurance-System/ledger_full.json'));

  // All DB policies
  const dbPolicies = await prisma.policy.findMany({
    select: {
      id: true, policyNumber: true, customerName: true,
      insurerName: true, productName: true, issueDate: true,
      renewalDate: true, paymentFrequency: true,
      grossPremium: true, netPremium: true,
      commissionPercent: true, commissionAmount: true,
      leadSource: true, status: true,
    }
  });
  const dbByPN = new Map(dbPolicies.map(p => [normPN(p.policyNumber), p]));

  // Build unique ledger rows keyed by PN (skip blanks and memo rows)
  const SKIP_PNS = new Set([norm('REF : FEB LOGIN /YUVARANI -LOADING PREMIUM /MARCH ISSUANCE'), norm('UW PENDING'), '']);
  const ledgerRows = [];
  const seenPN = new Set();
  for (const lp of ledger) {
    const pn = lp.policyNumber?.trim();
    if (!pn) continue;
    const k = normPN(pn);
    if (SKIP_PNS.has(norm(pn))) continue;
    if (seenPN.has(k)) continue;
    seenPN.add(k);
    ledgerRows.push(lp);
  }

  const mismatches = [];
  let exactMatches = 0;
  let expectedDiffs = 0;
  let genuineIssues = 0;
  let notInDB = 0;

  for (const lp of ledgerRows) {
    const pn  = lp.policyNumber.trim();
    const lpn = normPN(pn);
    const dp  = dbByPN.get(lpn);

    if (!dp) {
      notInDB++;
      mismatches.push({
        policyNumber: pn, customer: lp.customerName, insurer: lp.insurer,
        field: 'RECORD', ledger: 'Present', db: 'NOT IN DB',
        category: 'MISSING',
        assessment: 'Not found in database',
      });
      genuineIssues++;
      continue;
    }

    const rowMismatches = [];
    let hasMismatch = false;

    function check(field, lVal, dVal, category, note) {
      const lStr = lVal === null || lVal === undefined ? '' : String(lVal).trim();
      const dStr = dVal === null || dVal === undefined ? '' : String(dVal).trim();
      const match = lStr.toLowerCase() === dStr.toLowerCase() || lStr === '' || dStr === '';
      if (!match) {
        hasMismatch = true;
        rowMismatches.push({ policyNumber: pn, customer: dp.customerName, field, ledger: lStr, db: dStr, category, assessment: note });
      }
    }

    // ── Customer name (case-insensitive, trim) ───────────────────────────────
    const lName = String(lp.customerName || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const dName = String(dp.customerName || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (lName && dName && lName !== dName) {
      const similar = lName.includes(dName) || dName.includes(lName) ||
                      lName.split(' ')[0] === dName.split(' ')[0];
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Customer Name',
        ledger: lp.customerName, db: dp.customerName,
        category: similar ? 'EXPECTED' : 'DISCREPANCY',
        assessment: similar ? 'Minor name variation (spacing/abbreviation)' : 'Name mismatch — verify correct customer'
      });
      if (!similar) hasMismatch = true;
    }

    // ── Insurer name ─────────────────────────────────────────────────────────
    const lIns = normInsurer(lp.insurer);
    const dIns = String(dp.insurerName || '').trim();
    if (lIns && dIns && lIns.toLowerCase() !== dIns.toLowerCase()) {
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Insurer',
        ledger: lp.insurer, db: dIns,
        category: 'EXPECTED',
        assessment: 'Legacy alias vs canonical name — handled by INSURER_ALIASES in invoice aggregation'
      });
    }

    // ── Issue date ───────────────────────────────────────────────────────────
    const lDate = fmtDate(lp.issueDate);
    const dDate = fmtDate(dp.issueDate);
    if (lDate && dDate && lDate !== dDate) {
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Issue Date',
        ledger: lDate, db: dDate,
        category: 'IMPORT_ISSUE',
        assessment: 'Date differs — ledger sheet month vs actual issue date (application vs issuance lag)'
      });
      hasMismatch = true;
    }

    // ── Gross premium ────────────────────────────────────────────────────────
    const lGross = round2(Number(lp.grossPremium) || 0);
    const dGross = round2(Number(dp.grossPremium) || 0);
    if (lGross > 0 && Math.abs(lGross - dGross) > 0.5) {
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Gross Premium',
        ledger: '₹' + lGross, db: '₹' + dGross,
        category: 'DISCREPANCY',
        assessment: 'Premium mismatch — verify with insurer schedule'
      });
      hasMismatch = true;
    }

    // ── Net premium ──────────────────────────────────────────────────────────
    const lNet = round2(Number(lp.netPremium) || Number(lp.grossPremium) || 0);
    const dNet = round2(Number(dp.netPremium) || 0);
    if (lNet > 0 && dNet > 0 && Math.abs(lNet - dNet) > 0.5) {
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Net Premium',
        ledger: '₹' + lNet, db: '₹' + dNet,
        category: 'IMPORT_ISSUE',
        assessment: 'Net premium differs — possible multi-year vs annual, or import column miss'
      });
      hasMismatch = true;
    }

    // ── Commission % ─────────────────────────────────────────────────────────
    const lPct = normCommPct(lp.commPct);
    const dPct = round2(Number(dp.commissionPercent) || 0);
    if (lPct !== null && lPct > 0 && Math.abs(lPct - dPct) > 0.5) {
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Commission %',
        ledger: lPct + '%', db: dPct + '%',
        category: dPct === 0 ? 'IMPORT_ISSUE' : 'DISCREPANCY',
        assessment: dPct === 0 ? 'DB has 0% — commission not captured during import' : 'Commission rate mismatch'
      });
      hasMismatch = true;
    }

    // ── Commission amount ────────────────────────────────────────────────────
    const lAmt = round2(Number(lp.commAmount) || 0);
    const dAmt = round2(Number(dp.commissionAmount) || 0);
    if (lAmt > 0 && Math.abs(lAmt - dAmt) > 1) {
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Commission Amount',
        ledger: '₹' + lAmt, db: '₹' + dAmt,
        category: dAmt === 0 ? 'IMPORT_ISSUE' : 'DISCREPANCY',
        assessment: dAmt === 0 ? 'DB has ₹0 — amount not captured during import' : 'Commission amount mismatch'
      });
      hasMismatch = true;
    }

    // ── Lead source ──────────────────────────────────────────────────────────
    const lLead = String(lp.leadSource || '').trim();
    const dLead = String(dp.leadSource || '').trim();
    if (lLead && dLead && lLead.toLowerCase() !== dLead.toLowerCase()) {
      // Might just be name formatting
      const similar = lLead.toLowerCase().split(' ')[0] === dLead.toLowerCase().split(' ')[0];
      rowMismatches.push({
        policyNumber: pn, customer: dp.customerName, field: 'Lead Source',
        ledger: lLead, db: dLead,
        category: similar ? 'EXPECTED' : 'DISCREPANCY',
        assessment: similar ? 'Minor name variant' : 'Lead source differs — verify POSP/executive assignment'
      });
    }

    if (rowMismatches.length === 0) {
      exactMatches++;
    } else {
      const cats = rowMismatches.map(m => m.category);
      const hasGenuine = cats.some(c => c === 'DISCREPANCY' || c === 'IMPORT_ISSUE' || c === 'MISSING');
      const allExpected = cats.every(c => c === 'EXPECTED');
      if (allExpected) expectedDiffs++;
      else if (hasGenuine) genuineIssues++;
      mismatches.push(...rowMismatches);
    }
  }

  // Write full results
  fs.writeFileSync('C:/BIGIN-Insurance-System/final_audit_mismatches.json', JSON.stringify(mismatches, null, 2));

  // Count by category
  const catCounts = { EXPECTED: 0, IMPORT_ISSUE: 0, DISCREPANCY: 0, MISSING: 0 };
  mismatches.forEach(m => { catCounts[m.category] = (catCounts[m.category] || 0) + 1; });

  // Print summary
  const total = ledgerRows.length;
  console.log('TOTAL_LEDGER_ROWS_WITH_PN:', total);
  console.log('NOT_IN_DB:', notInDB);
  console.log('EXACT_MATCHES:', exactMatches);
  console.log('EXPECTED_DIFFS_ONLY:', expectedDiffs);
  console.log('GENUINE_ISSUES:', genuineIssues);
  console.log('MISMATCH_ROWS:', mismatches.length);
  console.log('BY_CATEGORY:', JSON.stringify(catCounts));

  // Print all mismatches
  console.log('\n=== ALL MISMATCHES ===');
  for (const m of mismatches) {
    console.log(m.category + '|' + m.policyNumber + '|' + m.customer + '|' + m.field + '|' + m.ledger + '|' + m.db + '|' + m.assessment);
  }

  await prisma.$disconnect();
}
run().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
