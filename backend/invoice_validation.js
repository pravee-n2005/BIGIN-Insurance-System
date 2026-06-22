'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateDraft, inrToWords, nextInvoiceNumber } = require('./src/modules/invoice/invoice.service');
const { generateInvoicePdf } = require('./src/modules/invoice/invoice.pdf');
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ── Insurers with active invoice profiles ────────────────────────────────────
// Best billing month = the most recent month with non-zero commission
const INSURER_MONTHS = {
  'ICICI Lombard General': { id: 27, month: '2026-02' },  // 6 policies, ₹66k comm
  'Star Health Insurance':  { id: 37, month: '2026-03' },  // 6 policies, ₹29k comm
  'HDFC Ergo General':      { id: 29, month: '2026-03' },  // 14 policies, ₹37k comm
  'United India General':   { id: 35, month: '2026-03' },  // 10 policies, ₹28k comm
  'Tata AIA Life':          { id: 30, month: '2026-04' },  // 1 policy,  ₹31k comm
  'Go Digit General':       { id: 32, month: '2026-02' },  // 1 policy,  ₹8k comm
};

async function validateOneDraft(insurerName, insurerId, billingMonth) {
  const result = {
    insurer: insurerName,
    insurerId,
    billingMonth,
    profileFound: false,
    profileActive: false,
    profileState: null,
    gstMode: null,
    policiesFound: 0,
    policyIds: [],
    taxableValue: 0,
    commissionSumFromDB: 0,
    commissionMatch: false,
    cgstRate: 0, cgstAmount: 0,
    sgstRate: 0, sgstAmount: 0,
    igstRate: 0, igstAmount: 0,
    totalAmount: 0,
    gstCalcCorrect: false,
    invoiceNumber: null,
    invoiceNumberSeqCorrect: false,
    totalInWords: null,
    draftGenerated: false,
    pdfGenerated: false,
    errors: [],
    categorySummary: {},
    policySamples: [],
  };

  try {
    // ── 1. Generate draft ──────────────────────────────────────────────────
    const draft = await generateDraft({ insurerId, billingMonth });
    result.draftGenerated = true;

    // ── 2. Profile check ──────────────────────────────────────────────────
    const insurer = await prisma.insurer.findUnique({
      where: { id: insurerId },
      include: { invoiceProfile: true }
    });
    const profile = insurer?.invoiceProfile;
    result.profileFound  = !!profile;
    result.profileActive = profile?.active ?? false;
    result.profileState  = profile?.state ?? null;
    result.gstMode       = profile?.state?.trim().toLowerCase() === 'tamil nadu' ? 'CGST+SGST (Intra-state)' : 'IGST (Inter-state)';

    // ── 3. Policy grouping ────────────────────────────────────────────────
    result.policiesFound = draft.policyCount;
    result.policyIds     = draft.policyIds;
    result.policySamples = draft.policySamples ?? [];
    result.categorySummary = draft.matchedInsurerNames;

    // ── 4. Taxable value vs DB commission sum ─────────────────────────────
    const dbPolicies = await prisma.policy.findMany({
      where: { id: { in: draft.policyIds } },
      select: { id:true, policyNumber:true, customerName:true, commissionAmount:true, insuranceCategory:true }
    });
    const dbCommSum = round2(dbPolicies.reduce((s, p) => s + Number(p.commissionAmount), 0));
    result.taxableValue          = Number(draft.taxableValue);
    result.commissionSumFromDB   = dbCommSum;
    result.commissionMatch       = Math.abs(result.taxableValue - dbCommSum) < 0.02;

    // Category breakdown
    const catBreakdown = {};
    dbPolicies.forEach(p => { catBreakdown[p.insuranceCategory] = (catBreakdown[p.insuranceCategory]||0)+1; });
    result.categorySummary = catBreakdown;

    // ── 5. GST calculation verification ──────────────────────────────────
    const tv = result.taxableValue;
    const intra = profile?.state?.trim().toLowerCase() === 'tamil nadu';
    let expectedCgst=0, expectedSgst=0, expectedIgst=0;
    if (intra) { expectedCgst = round2(tv*0.09); expectedSgst = round2(tv*0.09); }
    else        { expectedIgst = round2(tv*0.18); }
    const expectedTotal = round2(tv + expectedCgst + expectedSgst + expectedIgst);

    result.cgstRate   = Number(draft.cgstRate);
    result.cgstAmount = Number(draft.cgstAmount);
    result.sgstRate   = Number(draft.sgstRate);
    result.sgstAmount = Number(draft.sgstAmount);
    result.igstRate   = Number(draft.igstRate);
    result.igstAmount = Number(draft.igstAmount);
    result.totalAmount= Number(draft.totalAmount);

    const cgstOk  = Math.abs(result.cgstAmount  - expectedCgst)  < 0.02;
    const sgstOk  = Math.abs(result.sgstAmount  - expectedSgst)  < 0.02;
    const igstOk  = Math.abs(result.igstAmount  - expectedIgst)  < 0.02;
    const totalOk = Math.abs(result.totalAmount  - expectedTotal) < 0.02;
    result.gstCalcCorrect = cgstOk && sgstOk && igstOk && totalOk;
    if (!result.gstCalcCorrect) {
      result.errors.push('GST mismatch: expected CGST='+expectedCgst+' SGST='+expectedSgst+' IGST='+expectedIgst+' total='+expectedTotal
        +' got CGST='+result.cgstAmount+' SGST='+result.sgstAmount+' IGST='+result.igstAmount+' total='+result.totalAmount);
    }

    // ── 6. Invoice number sequence ────────────────────────────────────────
    const currentNext = await nextInvoiceNumber();
    result.invoiceNumber          = draft.invoiceNumber;
    result.invoiceNumberSeqCorrect = /^BG\d{3,}$/.test(draft.invoiceNumber);
    // Verify sequential: draft should produce a number >= current highest
    const draftNum  = parseInt(draft.invoiceNumber.replace(/^BG0*/,''),10);
    const nextNum   = parseInt(currentNext.replace(/^BG0*/,''),10);
    if (draftNum < nextNum - 1 || draftNum > nextNum) {
      result.errors.push('Invoice number out of sequence: draft='+draft.invoiceNumber+' expected='+currentNext);
    }

    // ── 7. inrToWords spot check ──────────────────────────────────────────
    result.totalInWords = draft.totalInWords;
    const expectedZero = result.totalAmount === 0;
    if (expectedZero && draft.totalInWords !== 'Zero rupees only') {
      result.errors.push('inrToWords incorrect for zero: '+draft.totalInWords);
    }
    if (!expectedZero && (!draft.totalInWords || draft.totalInWords === 'Zero rupees only')) {
      result.errors.push('inrToWords returned zero for non-zero amount: '+result.totalAmount);
    }

    // ── 7b. PDF generation ────────────────────────────────────────────────
    // Build a minimal invoice object matching what invoice.pdf.js expects
    const mockInvoice = {
      invoiceNumber:      draft.invoiceNumber,
      invoiceDate:        new Date(draft.invoiceDate),
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
    };
    const pdfBuffer = await generateInvoicePdf(mockInvoice);
    result.pdfGenerated   = Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500;
    result.pdfSizeBytes   = pdfBuffer.length;
    if (!result.pdfGenerated) result.errors.push('PDF buffer empty or too small');

  } catch (err) {
    result.draftGenerated = false;
    result.errors.push(err.message);
  }

  return result;
}

async function run() {
  const allResults = [];
  for (const [name, { id, month }] of Object.entries(INSURER_MONTHS)) {
    process.stdout.write('Testing ' + name + ' (' + month + ')... ');
    const r = await validateOneDraft(name, id, month);
    allResults.push(r);
    console.log(r.draftGenerated ? (r.errors.length ? 'WARN' : 'OK') : 'FAIL');
  }

  // Also test insurers with profiles but zero-commission months (edge case)
  const ZERO_MONTHS = [
    { name:'ICICI Lombard General', id:27, month:'2026-06' },
    { name:'Star Health Insurance',  id:37, month:'2026-06' },
    { name:'HDFC Ergo General',      id:29, month:'2026-06' },
    { name:'United India General',   id:35, month:'2026-06' },
  ];
  for (const { name, id, month } of ZERO_MONTHS) {
    process.stdout.write('Edge-case (zero-comm) ' + name + ' (' + month + ')... ');
    const r = await validateOneDraft(name, id, month);
    r._isZeroTest = true;
    allResults.push(r);
    console.log(r.draftGenerated ? 'OK' : 'FAIL');
  }

  const fs = require('fs');
  fs.writeFileSync('C:/BIGIN-Insurance-System/invoice_validation_results.json', JSON.stringify(allResults, null, 2));
  console.log('\nResults saved. Total tested:', allResults.length);
  await prisma.$disconnect();
}
run().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
