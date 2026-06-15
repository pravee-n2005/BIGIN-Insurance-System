'use strict';

const ExcelJS = require('exceljs');
const { COLUMNS } = require('./import.columns');
const {
  INSURANCE_CATEGORIES, PAYMENT_FREQUENCIES, POLICY_STATUSES,
} = require('../policy/policy.validation');

// Example row shown on the template sheet — clearly marked so the admin
// knows to delete it before filling in real data.
const EXAMPLE_ROW = {
  policyNumber: 'EXAMPLE-0001',
  customerName: 'John Doe',
  customerPhone: '9876543210',
  customerEmail: 'john.doe@example.com',
  insurerName: 'HDFC Ergo General',
  insuranceCategory: 'MOTOR',
  productName: 'Private Car Package Policy',
  issueDate: new Date(),
  paymentFrequency: 'YEARLY',
  grossPremium: 10000,
  netPremium: 9000,
  gstPercent: 18,
  commissionPercent: 15,
  tdsPercent: 10,
  leadSource: 'Direct',
  status: 'ACTIVE',
  invoiceNumber: '',
  invoiceDate: '',
  creditedDate: '',
  paymentMode: 'Online',
  remarks: 'Delete this example row before uploading.',
};

/**
 * Generates the Policy Import template workbook.
 * @param {object} input
 * @param {string[]} input.insurerNames     active Insurer.name values (for the Reference sheet)
 * @param {string[]} input.leadSourceNames  active LeadMember.name values (for the Reference sheet)
 * @returns {Promise<Buffer>}
 */
async function generateImportTemplateXlsx({ insurerNames = [], leadSourceNames = [] } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator        = 'BIGIN Insurance System';
  wb.created        = new Date();
  wb.lastModifiedBy = 'BIGIN';

  // ── Sheet 1 — Policy Import ─────────────────────────────────────────────
  const ws = wb.addWorksheet('Policy Import', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: Math.max(14, c.header.length + 2) }));

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const col = COLUMNS[colNumber - 1];
    cell.font   = { name: 'Arial', size: 10, bold: true };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    if (col.required) {
      cell.value = `${col.header} *`;
      cell.note  = 'Required field';
    }
  });
  headerRow.height = 26;

  // Example row
  const exampleRow = ws.addRow(EXAMPLE_ROW);
  exampleRow.eachCell((cell, colNumber) => {
    const col = COLUMNS[colNumber - 1];
    cell.font  = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF888888' } };
    if (col.type === 'date' && cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
    if (col.type === 'number') cell.numFmt = '#,##0.00';
  });

  // Dropdown validation for enum columns (inline lists — well under the 255-char limit)
  const ENUM_LISTS = {
    insuranceCategory: INSURANCE_CATEGORIES,
    paymentFrequency:  PAYMENT_FREQUENCIES,
    status:            POLICY_STATUSES,
  };
  COLUMNS.forEach((col, idx) => {
    if (!ENUM_LISTS[col.key]) return;
    const colLetter = ws.getColumn(idx + 1).letter;
    for (let r = 2; r <= 200; r++) {
      ws.getCell(`${colLetter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: !col.required,
        formulae: [`"${ENUM_LISTS[col.key].join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid value',
        error: `Must be one of: ${ENUM_LISTS[col.key].join(', ')}`,
      };
    }
  });

  // Date format hint for date columns
  COLUMNS.forEach((col, idx) => {
    if (col.type !== 'date') return;
    const colLetter = ws.getColumn(idx + 1).letter;
    for (let r = 2; r <= 200; r++) {
      ws.getCell(`${colLetter}${r}`).numFmt = 'dd/mm/yyyy';
    }
  });

  // ── Sheet 2 — Reference (valid values for lookups) ──────────────────────
  const ref = wb.addWorksheet('Reference');
  ref.columns = [
    { header: 'Insurance Category', key: 'a', width: 22 },
    { header: 'Payment Frequency',  key: 'b', width: 22 },
    { header: 'Policy Status',      key: 'c', width: 18 },
    { header: 'Active Insurer Names', key: 'd', width: 32 },
    { header: 'Active Lead Source Names', key: 'e', width: 32 },
  ];
  ref.getRow(1).font = { name: 'Arial', size: 10, bold: true };
  ref.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };

  const maxLen = Math.max(
    INSURANCE_CATEGORIES.length, PAYMENT_FREQUENCIES.length, POLICY_STATUSES.length,
    insurerNames.length, leadSourceNames.length,
  );
  for (let i = 0; i < maxLen; i++) {
    ref.addRow({
      a: INSURANCE_CATEGORIES[i] ?? '',
      b: PAYMENT_FREQUENCIES[i] ?? '',
      c: POLICY_STATUSES[i] ?? '',
      d: insurerNames[i] ?? '',
      e: leadSourceNames[i] ?? '',
    });
  }

  // ── Sheet 3 — Instructions ───────────────────────────────────────────────
  const instr = wb.addWorksheet('Instructions');
  instr.getColumn(1).width = 100;
  const lines = [
    'BIGIN Insurance System — Policy Import Template',
    '',
    '1. Fill in one row per policy on the "Policy Import" sheet. Delete the example row before uploading.',
    '2. Columns marked with * are required.',
    '3. Insurance Category, Payment Frequency, and Status must match one of the values listed on the "Reference" sheet (dropdowns are provided).',
    '4. Insurer Name and Lead Source must exactly match an existing Master Data record (see "Reference" sheet for currently active names). Unmatched values will be rejected during import — add new insurers/lead members in Master Data first.',
    '5. Dates should be entered in DD/MM/YYYY format.',
    '6. Policy Number must be unique. Duplicate policy numbers (within this file or already in the system) will be skipped, not overwritten.',
    '7. Do NOT fill in Renewal Date, GST Amount, Commission Amount, TDS Amount, or Final Receivable — these are calculated automatically by the system and are not part of this template.',
    '8. After uploading, use "Validate" to preview which rows are valid, duplicate, or invalid before importing.',
  ];
  lines.forEach((line, i) => {
    const cell = instr.getCell(`A${i + 1}`);
    cell.value = line;
    if (i === 0) cell.font = { name: 'Arial', size: 12, bold: true };
    else cell.font = { name: 'Arial', size: 10 };
    cell.alignment = { wrapText: true };
  });

  return wb.xlsx.writeBuffer();
}

module.exports = { generateImportTemplateXlsx };
