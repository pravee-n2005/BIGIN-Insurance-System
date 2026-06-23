'use strict';
// Live end-to-end workflow test — save, verify, cancel, re-verify.
// Uses Tata AIA Apr 2026 (1 policy, id:152 / SIVAMURTHY).
// The invoice is CANCELLED at the end so no permanent data is added.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateDraft, saveInvoice, cancelInvoice } = require('./src/modules/invoice/invoice.service');

const INSURER_ID    = 30;   // Tata AIA Life
const BILLING_MONTH = '2026-04';
const ADMIN_USER_ID = 1;
const POLICY_ID     = 152;  // SIVAMURTHY / C295450326

const pass = (msg) => console.log('  ✓', msg);
const fail = (msg) => { console.error('  ✗ FAIL:', msg); process.exitCode = 1; };
const assert = (cond, msg) => cond ? pass(msg) : fail(msg);

async function snapshot(label) {
  const p = await prisma.policy.findUnique({
    where: { id: POLICY_ID },
    select: { id: true, policyNumber: true, invoiceRaised: true, invoiceRaisedAt: true }
  });
  console.log(`  [${label}] policy ${POLICY_ID}:`, JSON.stringify(p));
  return p;
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Invoice Status Workflow — Live End-to-End Test');
  console.log('  Insurer: Tata AIA Life  |  Month: 2026-04  |  Policy: 152');
  console.log('══════════════════════════════════════════════════════\n');

  // ─── Pre-condition: ensure policy starts with invoiceRaised=false ─────────
  console.log('PRE-CONDITION');
  const pre = await snapshot('before');
  assert(!pre.invoiceRaised, 'policy.invoiceRaised is false before any invoice');
  assert(pre.invoiceRaisedAt === null, 'policy.invoiceRaisedAt is null before any invoice');

  // ─── Step 1: Generate draft — read-only, must NOT change policy ───────────
  console.log('\nSTEP 1 — Generate draft (read-only)');
  const draft = await generateDraft({ insurerId: INSURER_ID, billingMonth: BILLING_MONTH });
  assert(draft.status === 'DRAFT', 'draft.status is DRAFT');
  assert(draft.policyCount === 1, 'draft includes exactly 1 policy');
  assert(draft.policyIds.includes(POLICY_ID), `draft.policyIds includes policy ${POLICY_ID}`);
  assert(Number(draft.taxableValue) > 0, 'draft.taxableValue is > 0 (₹' + draft.taxableValue + ')');
  assert(/^BG\d+$/.test(draft.invoiceNumber), 'draft.invoiceNumber is a valid BG### sequence (' + draft.invoiceNumber + ')');
  const afterDraft = await snapshot('after draft');
  assert(!afterDraft.invoiceRaised, 'policy.invoiceRaised is still false after draft generation (draft is read-only)');
  console.log('  Draft taxable value: ₹' + draft.taxableValue);
  console.log('  Draft invoice number: ' + draft.invoiceNumber);
  console.log('  Draft GST: CGST ₹' + draft.cgstAmount + ' + SGST ₹' + draft.sgstAmount);

  // ─── Step 2: Save invoice — marks policy as invoiceRaised=true ───────────
  console.log('\nSTEP 2 — Save (finalize) invoice');
  const saved = await saveInvoice({ insurerId: INSURER_ID, billingMonth: BILLING_MONTH, createdById: ADMIN_USER_ID });
  assert(saved.status === 'FINALIZED', 'saved invoice.status is FINALIZED');
  assert(/^BG\d+$/.test(saved.invoiceNumber), 'saved invoice has BG### number: ' + saved.invoiceNumber);
  assert(Number(saved.totalAmount) > 0, 'saved invoice.totalAmount > 0 (₹' + saved.totalAmount + ')');
  console.log('  Invoice created: ' + saved.invoiceNumber + ' (id:' + saved.id + ')');

  const afterSave = await snapshot('after save');
  assert(afterSave.invoiceRaised === true, 'policy.invoiceRaised became TRUE after invoice saved');
  assert(afterSave.invoiceRaisedAt !== null, 'policy.invoiceRaisedAt is stamped');

  // ─── Step 3: Verify policy appears as INVOICED in list query ─────────────
  console.log('\nSTEP 3 — Policies list: invoiceStatus=INVOICED filter');
  const { list: listPolicies } = require('./src/modules/policy/policy.service');
  const invoicedResult = await listPolicies({ page: 1, limit: 100, invoiceStatus: 'INVOICED' });
  const found = invoicedResult.policies.find(p => p.id === POLICY_ID);
  assert(!!found, 'policy appears in invoiceStatus=INVOICED list');

  const pendingResult = await listPolicies({ page: 1, limit: 100, invoiceStatus: 'PENDING' });
  const notInPending = !pendingResult.policies.find(p => p.id === POLICY_ID);
  assert(notInPending, 'policy does NOT appear in invoiceStatus=PENDING list');

  // ─── Step 4: Verify SAVE (not draft) is blocked for same month ───────────
  // generateDraft() is always read-only — it can run any number of times and
  // never checks for existing finalized invoices. That is intentional: the
  // draft is a preview and should always be available.
  // The duplicate guard is in saveInvoice(), which runs inside a Prisma
  // transaction. Attempting a second save for the same insurer+month must fail.
  console.log('\nSTEP 4 — Save exclusion: second save for same insurer+month must fail (409)');
  try {
    await saveInvoice({ insurerId: INSURER_ID, billingMonth: BILLING_MONTH, createdById: ADMIN_USER_ID });
    fail('Expected 409 from saveInvoice() but got none');
  } catch (err) {
    assert(err.status === 409 || err.message.toLowerCase().includes('finalized'), 'saveInvoice() correctly rejects duplicate: "' + err.message + '"');
  }
  // Also verify draft can still be generated (read-only, never blocked)
  const dupDraft = await generateDraft({ insurerId: INSURER_ID, billingMonth: BILLING_MONTH });
  assert(dupDraft.status === 'DRAFT', 'generateDraft() still returns DRAFT even when finalized invoice exists (preview is always available)');
  console.log('  Draft preview is always available regardless of finalized invoice — correct by design');

  // ─── Step 5: Draft for a different month still works ─────────────────────
  console.log('\nSTEP 5 — Draft for a different month still generates correctly');
  // Tata AIA has no other months with policies, so we test ICICI Lombard Mar 2026
  const { generateDraft: gd2 } = require('./src/modules/invoice/invoice.service');
  const altDraft = await gd2({ insurerId: 27, billingMonth: '2026-03' }); // ICICI Lombard
  assert(altDraft.status === 'DRAFT', 'different insurer+month draft succeeds');
  assert(altDraft.policyCount > 0, 'different draft has policies: ' + altDraft.policyCount);
  console.log('  ICICI Lombard Mar 2026 draft: ' + altDraft.policyCount + ' policies, ₹' + altDraft.taxableValue);

  // ─── Step 6: Cancel the invoice — policy.invoiceRaised must revert ───────
  console.log('\nSTEP 6 — Cancel invoice → policy.invoiceRaised must revert to false');
  const cancelled = await cancelInvoice(saved.id, { cancellationReason: 'TEST_DUMMY_INVOICE' }, ADMIN_USER_ID);
  assert(cancelled.status === 'CANCELLED', 'invoice.status is now CANCELLED');
  assert(cancelled.cancellationReason === 'TEST_DUMMY_INVOICE', 'cancellationReason recorded');

  const afterCancel = await snapshot('after cancel');
  assert(afterCancel.invoiceRaised === false, 'policy.invoiceRaised reverted to FALSE after invoice cancel');
  assert(afterCancel.invoiceRaisedAt === null, 'policy.invoiceRaisedAt cleared');

  // ─── Step 7: Policy reappears in PENDING list after cancel ───────────────
  console.log('\nSTEP 7 — Policy reappears in PENDING list after cancel');
  const pendingAfter = await listPolicies({ page: 1, limit: 100, invoiceStatus: 'PENDING' });
  const backInPending = !!pendingAfter.policies.find(p => p.id === POLICY_ID);
  assert(backInPending, 'policy reappears in invoiceStatus=PENDING list after invoice cancelled');

  const invoicedAfter = await listPolicies({ page: 1, limit: 100, invoiceStatus: 'INVOICED' });
  const goneFromInvoiced = !invoicedAfter.policies.find(p => p.id === POLICY_ID);
  assert(goneFromInvoiced, 'policy is no longer in invoiceStatus=INVOICED list');

  // ─── Step 8: Draft for same month now works again ─────────────────────────
  console.log('\nSTEP 8 — Draft regeneration works after cancel');
  const redraft = await generateDraft({ insurerId: INSURER_ID, billingMonth: BILLING_MONTH });
  assert(redraft.status === 'DRAFT', 'draft regenerates successfully after cancel');
  assert(redraft.policyIds.includes(POLICY_ID), 'policy ' + POLICY_ID + ' is back in draft policyIds');
  assert(Math.abs(Number(redraft.taxableValue) - Number(draft.taxableValue)) < 0.01, 'redraft taxableValue matches original draft');
  console.log('  Re-draft taxable value: ₹' + redraft.taxableValue + ' (matches original: ₹' + draft.taxableValue + ')');

  // ─── Cleanup verification ─────────────────────────────────────────────────
  console.log('\nCLEANUP VERIFICATION');
  const cancelledInv = await prisma.invoice.findUnique({ where: { id: saved.id }, select: { status: true, invoiceNumber: true } });
  assert(cancelledInv.status === 'CANCELLED', 'test invoice ' + cancelledInv.invoiceNumber + ' is CANCELLED — no permanent finalized data added');

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  All workflow steps verified.');
  console.log('  Test invoice ' + saved.invoiceNumber + ' left as CANCELLED (audit trail).');
  console.log('══════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

run().catch(e => { console.error('\nFATAL:', e.message, e.stack); process.exit(1); });
