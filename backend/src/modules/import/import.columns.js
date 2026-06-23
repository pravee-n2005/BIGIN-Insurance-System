'use strict';

// Column definitions shared by the template generator, the upload parser,
// and row validation — single source of truth for the Excel import layout.
// `key` matches the field name expected by policy.validation.validateCreate /
// policy.service.buildPolicyData.

const COLUMNS = [
  { header: 'Policy Number',      key: 'policyNumber',      type: 'string', required: true },
  { header: 'Customer Name',      key: 'customerName',      type: 'string', required: true },
  { header: 'Customer Phone',     key: 'customerPhone',     type: 'string', required: false },
  { header: 'Customer Email',     key: 'customerEmail',     type: 'string', required: false },
  { header: 'Insurer Name',       key: 'insurerName',       type: 'string', required: true },
  { header: 'Insurance Category', key: 'insuranceCategory', type: 'enum',   required: true },
  { header: 'Product Name',       key: 'productName',       type: 'string', required: true },
  { header: 'Issue Date',         key: 'issueDate',         type: 'date',   required: true },
  { header: 'Payment Frequency',  key: 'paymentFrequency',  type: 'enum',   required: true },
  { header: 'Term (Years)',       key: 'term',              type: 'number', required: false },
  { header: 'Gross Premium',      key: 'grossPremium',      type: 'number', required: true },
  { header: 'Net Premium',        key: 'netPremium',        type: 'number', required: true },
  { header: 'GST Percent',        key: 'gstPercent',        type: 'number', required: true },
  { header: 'Commission Percent', key: 'commissionPercent', type: 'number', required: false },
  { header: 'TDS Percent',        key: 'tdsPercent',        type: 'number', required: false },
  { header: 'Lead Source',        key: 'leadSource',        type: 'string', required: true },
  { header: 'Status',             key: 'status',            type: 'enum',   required: false },
  { header: 'Invoice Number',     key: 'invoiceNumber',     type: 'string', required: false },
  { header: 'Invoice Date',       key: 'invoiceDate',       type: 'date',   required: false },
  { header: 'Credited Date',      key: 'creditedDate',      type: 'date',   required: false },
  { header: 'Payment Mode',       key: 'paymentMode',       type: 'string', required: false },
  { header: 'Remarks',            key: 'remarks',           type: 'string', required: false },
];

// Excel's date epoch (1899-12-30) — used to convert serial-number date cells
// from worksheets where the date column was formatted as plain text/number.
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function excelSerialToDate(serial) {
  return new Date(EXCEL_EPOCH + Math.round(serial * 86400000));
}

// Normalize a raw cell value according to the column's declared type.
// Returns '' for blank required fields and null for blank optional fields,
// so downstream validation (policy.validation) treats them consistently.
function normalizeValue(col, raw) {
  if (raw === null || raw === undefined) return col.required ? '' : null;

  if (raw && typeof raw === 'object' && 'text' in raw) raw = raw.text; // ExcelJS rich text
  if (raw && typeof raw === 'object' && 'result' in raw) raw = raw.result; // formula cell

  if (typeof raw === 'string') raw = raw.trim();
  if (raw === '') return col.required ? '' : null;

  switch (col.type) {
    case 'string':
      return String(raw).trim();

    case 'number': {
      const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.\-]/g, ''));
      return Number.isNaN(num) ? raw : num; // leave invalid input as-is so validation reports it
    }

    case 'date': {
      if (raw instanceof Date) return raw;
      if (typeof raw === 'number') return excelSerialToDate(raw);
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? raw : parsed;
    }

    case 'enum':
      return String(raw).trim().toUpperCase().replace(/[\s-]+/g, '_');

    default:
      return raw;
  }
}

module.exports = { COLUMNS, normalizeValue, excelSerialToDate };
