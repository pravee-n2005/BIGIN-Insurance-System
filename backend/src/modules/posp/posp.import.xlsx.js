'use strict';

const ExcelJS = require('exceljs');

// ─── Column header → internal key ────────────────────────────────────────────
// More-specific patterns must come before shorter overlapping ones.
const COLUMN_PATTERNS = [
  { key: 'entryDate',        patterns: ['policydate', 'issuedate', 'startdate', 'date'] },
  { key: 'policyNumber',     patterns: ['policynumber', 'policyno', 'policy#', 'policynum'] },
  { key: 'customerName',     patterns: ['customername', 'insuredname', 'customer', 'insured', 'clientname', 'client'] },
  { key: 'policyType',       patterns: ['policytype', 'insurancecategory', 'category', 'type'] },
  { key: 'premium',          patterns: ['netpremium', 'grosspremium', 'premiuminrs', 'premium'] },
  { key: 'pospShare',        patterns: ['pospsharepercent', 'pospshare', 'posppercent', 'posppercentage', 'pospshare%'] },
  { key: 'pospCommission',   patterns: ['pospcommission', 'posppayout', 'posppayable', 'pospcommissioninrs', 'pospcommissionrs'] },
  { key: 'orgCommission',    patterns: ['orgcommission', 'organizationcommission', 'bigincommission', 'netcommission', 'orgcommissioninrs', 'companycommission'] },
  { key: 'commissionRate',   patterns: ['commissionrate%', 'commissionpercent', 'commissionrate', 'comm%', 'commission%', 'commission'] },
  { key: 'brokerage',        patterns: ['totalbrokerage', 'brokerageamount', 'brokerageinrs', 'brokerage'] },
  { key: 'paymentStatus',    patterns: ['paymentstatus', 'paystatus', 'status'] },
  { key: 'invoiceReference', patterns: ['invoicereference', 'invoiceref', 'invoicenumber', 'invoiceno', 'invoice#', 'invoice'] },
  { key: 'invoiceDate',      patterns: ['invoicedate'] },
  { key: 'remarks',          patterns: ['remarks', 'notes', 'comment', 'comments'] },
];

function normalizeHeader(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[₹\s()%#,]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function matchColumnKey(headerText) {
  const n = normalizeHeader(headerText);
  if (!n) return null;
  for (const { key, patterns } of COLUMN_PATTERNS) {
    if (patterns.some((p) => n === p || n.startsWith(p) || p.startsWith(n))) return key;
  }
  return null;
}

// ─── Row classification helpers ───────────────────────────────────────────────

// Returns the cleaned name if this row is a "Lead Source :" section header, else null.
// Uses first-match logic: merged cells spanning multiple columns cause ExcelJS to return
// the same value for every cell in the merge. We stop at the first hit to avoid repeats.
function extractLeadSource(row) {
  let found = null;
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (found !== null) return; // first match wins — skip the rest (merged cell repeats)
    const t = String(cell.text || cell.value || '').trim();
    const match = t.match(/lead[\s_-]*source\s*[:\-]\s*(.*)/i);
    if (!match) return;
    let name = match[1].trim();
    // Strip trailing count annotations like "(12 policies)" or "- 5 records"
    name = name.replace(/[\-–(].*$/, '').trim();
    // Strip honorifics
    name = name.replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Sri\.?|Smt\.?|Shri\.?|Er\.?|Ar\.?)\s+/i, '').trim();
    found = name || null;
  });
  return found;
}

// Returns true if this looks like a sub-total or grand-total row.
function isAggregateRow(row) {
  const texts = [];
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    if (col <= 4) texts.push(String(cell.text || cell.value || '').trim().toLowerCase());
  });
  const joined = texts.join(' ');
  return /\b(sub[\s-]?total|grand[\s-]?total|total|sum)\b/.test(joined);
}

// Returns true if the row looks like column headers (≥ 3 cells match known keys).
function tryBuildColMap(row) {
  const colMap = {};
  let count = 0;
  row.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const key = matchColumnKey(cell.text || cell.value);
    if (key && !colMap[key]) { colMap[key] = colNum; count++; }
  });
  return count >= 3 ? colMap : null;
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    const dt = new Date(yr, Number(dmy[2]) - 1, Number(dmy[1]));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dmth = s.match(/^(\d{1,2})[\-\s]([A-Za-z]{3,9})[\-\s](\d{4})$/);
  if (dmth) {
    const dt = new Date(`${dmth[1]} ${dmth[2]} ${dmth[3]}`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

// ─── Number / status parsing ──────────────────────────────────────────────────

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  // ExcelJS formula cells: { formula: '...', result: 123.45 } or { result: ..., sharedFormula: '...' }
  if (val && typeof val === 'object' && 'result' in val) val = val.result;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const n = Number(String(val).replace(/[₹,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function parseStatus(val) {
  if (!val) return 'PENDING';
  const s = String(val).trim().toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'paid') return 'PAID';
  if (s.includes('partial') || s.includes('partly')) return 'PARTIALLY_PAID';
  return 'PENDING';
}

// ─── Parse one data row against the current colMap ───────────────────────────

function parseDataRow(row, rowNum, colMap, warnings) {
  function get(key) {
    if (!colMap[key]) return null;
    return row.getCell(colMap[key])?.value ?? null;
  }
  function getText(key) {
    if (!colMap[key]) return null;
    const c = row.getCell(colMap[key]);
    return c?.text ?? (c?.value != null ? String(c.value) : null);
  }

  const pnRaw = get('policyNumber');
  const policyNumber = String(pnRaw ?? '').trim();
  if (!policyNumber) return null;

  const customerName = String(getText('customerName') || '').trim();
  if (!customerName) {
    warnings.push(`Row ${rowNum}: missing customer name for policy "${policyNumber}" — skipped.`);
    return null;
  }

  const premium = parseNum(get('premium'));
  if (premium === null) {
    warnings.push(`Row ${rowNum}: could not parse premium for "${policyNumber}" — skipped.`);
    return null;
  }

  const entryDateRaw = get('entryDate');
  const entryDate    = parseDate(entryDateRaw);
  if (!entryDate) {
    warnings.push(`Row ${rowNum}: could not parse date "${entryDateRaw}" for "${policyNumber}" — using today.`);
  }

  const commissionRate    = parseNum(get('commissionRate')) ?? 0;
  const brokerageRaw      = parseNum(get('brokerage'));
  const pospShareRaw      = parseNum(get('pospShare'));
  const pospCommissionRaw = parseNum(get('pospCommission'));
  const orgCommissionRaw  = parseNum(get('orgCommission'));

  let derivedPospShare = pospShareRaw;
  if (derivedPospShare === null && brokerageRaw && pospCommissionRaw) {
    derivedPospShare = Math.round((pospCommissionRaw / brokerageRaw) * 100 * 100) / 100;
  }

  return {
    _rowNum:          rowNum,
    entryDate:        entryDate || new Date(),
    policyNumber,
    customerName,
    policyType:       String(getText('policyType') || '').trim() || null,
    premium,
    commissionRate,
    brokerage:        brokerageRaw,
    pospShare:        derivedPospShare,
    pospCommission:   pospCommissionRaw,
    orgCommission:    orgCommissionRaw,
    paymentStatus:    parseStatus(getText('paymentStatus')),
    invoiceReference: String(getText('invoiceReference') || '').trim() || null,
    invoiceDate:      parseDate(get('invoiceDate')),
    remarks:          String(getText('remarks') || '').trim() || null,
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────
//
// Returns:
//   mode: 'grouped' | 'single'
//   groups: Array<{ memberName: string|null, rows: Array }>
//   colsFound: string[]
//   warnings: string[]
//
// 'grouped' mode: file contains "Lead Source : <name>" section headers.
//   Each group has memberName set. Service will auto-create POSP members.
//
// 'single' mode: no section headers found. One group with memberName = null.
//   Service requires pospMemberId to be passed explicitly.

async function parseImportBuffer(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in the uploaded file.');

  const warnings = [];
  let colMap = null;          // column index → field key (updated when header row found)
  let colsFound = [];

  // Groups accumulator
  const groups = [];          // [{ memberName, rows }]
  let currentGroup = null;    // the group being built right now

  function startGroup(memberName) {
    currentGroup = { memberName, rows: [] };
    groups.push(currentGroup);
  }

  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    // ── 1. Check for Lead Source header ──────────────────────────────────────
    const leadName = extractLeadSource(row);
    if (leadName !== null) {
      startGroup(leadName);
      return;
    }

    // ── 2. Check for column header row ───────────────────────────────────────
    const newColMap = tryBuildColMap(row);
    if (newColMap) {
      // Accept first header row; also accept re-occurrences (some sheets repeat headers per section)
      if (!colMap || Object.keys(newColMap).length >= Object.keys(colMap).length) {
        colMap = newColMap;
        colsFound = Object.keys(colMap);
      }
      return;  // header rows are never data
    }

    // ── 3. Skip aggregate / total rows ───────────────────────────────────────
    if (isAggregateRow(row)) return;

    // ── 4. Skip rows before any column map is established ────────────────────
    if (!colMap) return;

    // ── 5. Parse as data row ─────────────────────────────────────────────────
    const parsed = parseDataRow(row, rowNum, colMap, warnings);
    if (!parsed) return;

    // If no group started yet, create an implicit unnamed group
    if (!currentGroup) startGroup(null);
    currentGroup.rows.push(parsed);
  });

  // Remove empty groups (e.g., a "Lead Source :" header with no valid rows below it)
  const nonemptyGroups = groups.filter((g) => g.rows.length > 0);

  if (nonemptyGroups.length === 0 && colMap) {
    throw new Error('The file was parsed but contained no valid policy rows.');
  }
  if (!colMap) {
    throw new Error(
      'Could not find column headers. Expected at least "Policy Number", "Customer Name", and "Premium" columns.'
    );
  }

  const hasLeadSourceSections = groups.some((g) => g.memberName !== null);
  const mode = hasLeadSourceSections ? 'grouped' : 'single';

  // Validate minimum columns exist
  const required = ['policyNumber', 'customerName', 'premium'];
  const missing  = required.filter((k) => !colsFound.includes(k));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}.`);
  }

  return { mode, groups: nonemptyGroups, colsFound, warnings };
}

module.exports = { parseImportBuffer };
