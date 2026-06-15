const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');

const prisma = require('../../config/prisma');
const { COLUMNS, normalizeValue, excelSerialToDate } = require('./import.columns');
const { parseWorkbook } = require('./import.parser');
const { previewImport, commitImport } = require('./import.service');

let INSURER_NAME;
let LEAD_SOURCE_NAME;
let USER_ID;

test('setup — fetch a real active insurer, lead member, and user', async () => {
  const insurer = await prisma.insurer.findFirst({ where: { active: true } });
  const lead = await prisma.leadMember.findFirst({ where: { active: true } });
  const user = await prisma.user.findFirst();
  INSURER_NAME = insurer.name;
  LEAD_SOURCE_NAME = lead.name;
  USER_ID = user.id;
  assert.ok(INSURER_NAME);
  assert.ok(LEAD_SOURCE_NAME);
  assert.ok(USER_ID);
});

// ── import.columns ──────────────────────────────────────────────────────────

test('normalizeValue — required string blank becomes empty string', () => {
  const col = COLUMNS.find((c) => c.key === 'policyNumber');
  assert.strictEqual(normalizeValue(col, null), '');
  assert.strictEqual(normalizeValue(col, '  ABC-1  '), 'ABC-1');
});

test('normalizeValue — optional string blank becomes null', () => {
  const col = COLUMNS.find((c) => c.key === 'customerPhone');
  assert.strictEqual(normalizeValue(col, null), null);
  assert.strictEqual(normalizeValue(col, ''), null);
});

test('normalizeValue — number strips currency symbols', () => {
  const col = COLUMNS.find((c) => c.key === 'grossPremium');
  assert.strictEqual(normalizeValue(col, '₹10,000.50'), 10000.50);
  assert.strictEqual(normalizeValue(col, 5000), 5000);
});

test('normalizeValue — enum uppercases and replaces separators', () => {
  const col = COLUMNS.find((c) => c.key === 'paymentFrequency');
  assert.strictEqual(normalizeValue(col, 'half yearly'), 'HALF_YEARLY');
  assert.strictEqual(normalizeValue(col, 'Half-Yearly'), 'HALF_YEARLY');
});

test('normalizeValue — date handles Excel serial numbers', () => {
  const col = COLUMNS.find((c) => c.key === 'issueDate');
  const result = normalizeValue(col, 45000);
  assert.ok(result instanceof Date);
  assert.deepStrictEqual(result, excelSerialToDate(45000));
});

// ── import.parser ───────────────────────────────────────────────────────────

async function buildWorkbook(rows, { dropColumn } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Policy Import');
  const cols = COLUMNS.filter((c) => c.key !== dropColumn);
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key }));
  rows.forEach((r) => ws.addRow(r));
  return wb.xlsx.writeBuffer();
}

function baseRow(overrides = {}) {
  return {
    policyNumber: `IMPTEST-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    customerName: 'Test Customer',
    customerPhone: '9999999999',
    customerEmail: '',
    insurerName: INSURER_NAME,
    insuranceCategory: 'MOTOR',
    productName: 'Test Product',
    issueDate: new Date('2026-01-01'),
    paymentFrequency: 'YEARLY',
    grossPremium: 10000,
    netPremium: 9000,
    gstPercent: 18,
    commissionPercent: 10,
    tdsPercent: 5,
    leadSource: LEAD_SOURCE_NAME,
    status: 'ACTIVE',
    invoiceNumber: '',
    invoiceDate: '',
    creditedDate: '',
    paymentMode: 'Online',
    remarks: '',
    ...overrides,
  };
}

test('parseWorkbook — reports missing required headers', async () => {
  const buf = await buildWorkbook([baseRow()], { dropColumn: 'policyNumber' });
  const { headerErrors, rows } = await parseWorkbook(buf);
  assert.ok(headerErrors.length > 0);
  assert.match(headerErrors[0], /Policy Number/);
  assert.strictEqual(rows.length, 0);
});

test('parseWorkbook — parses data rows with normalized values', async () => {
  const row = baseRow();
  const buf = await buildWorkbook([row]);
  const { headerErrors, rows } = await parseWorkbook(buf);
  assert.strictEqual(headerErrors.length, 0);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].normalized.policyNumber, row.policyNumber);
  assert.strictEqual(rows[0].normalized.insuranceCategory, 'MOTOR');
  assert.strictEqual(rows[0].normalized.grossPremium, 10000);
});

// ── import.service — previewImport / commitImport ────────────────────────────

test('previewImport — classifies valid, invalid, and duplicate rows', async () => {
  const validRow = baseRow();
  const invalidRow = baseRow({ insurerName: 'Totally Unknown Insurer XYZ' });
  const duplicateRow = baseRow({ policyNumber: validRow.policyNumber });

  const buf = await buildWorkbook([validRow, invalidRow, duplicateRow]);
  const result = await previewImport(buf);

  assert.strictEqual(result.totalRows, 3);
  assert.strictEqual(result.validRows, 1);
  assert.strictEqual(result.invalidRows, 1);
  assert.strictEqual(result.duplicateRows, 1);

  const statuses = result.rows.map((r) => r.status);
  assert.deepStrictEqual(statuses, ['valid', 'invalid', 'duplicate']);

  const invalid = result.rows[1];
  assert.ok(invalid.errors.some((e) => /Unknown insurer/.test(e)));

  const duplicate = result.rows[2];
  assert.ok(duplicate.errors.some((e) => /Duplicate policy number within this file/.test(e)));
});

test('previewImport — does not write to the database', async () => {
  const row = baseRow();
  const buf = await buildWorkbook([row]);
  await previewImport(buf);

  const found = await prisma.policy.findUnique({ where: { policyNumber: row.policyNumber } });
  assert.strictEqual(found, null);
});

test('commitImport — imports valid rows and skips DB duplicates', async () => {
  const row = baseRow();
  const buf = await buildWorkbook([row]);

  const result = await commitImport(buf, USER_ID);
  assert.strictEqual(result.imported, 1);
  assert.strictEqual(result.totalRows, 1);
  assert.strictEqual(result.validRows, 1);

  const created = await prisma.policy.findUnique({ where: { policyNumber: row.policyNumber } });
  assert.ok(created);

  // Re-importing the same file should now classify the row as a DB duplicate, skipped.
  const buf2 = await buildWorkbook([row]);
  const result2 = await commitImport(buf2, USER_ID);
  assert.strictEqual(result2.validRows, 0);
  assert.strictEqual(result2.duplicateRows, 1);
  assert.strictEqual(result2.imported, 0);

  // Cleanup
  await prisma.policy.delete({ where: { policyNumber: row.policyNumber } });
});
