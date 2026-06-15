'use strict';

/**
 * monthly-gst.report.xlsx.js
 *
 * Generates the Monthly GST Report (Phase 5) — a simple ledger of credited
 * statement amounts for a given month, matching the CA's required column set:
 *   Credited Date | Bank Reference | Nature of Transaction | Debit (Deposits) | Credit (Payments)
 *
 * Layout:
 *   Row 1 : "BIGIN INSURANCE BROKERS PRIVATE LIMITED" (title, merged)
 *   Row 2 : "MONTHLY GST REPORT — <Month YYYY>" (sub-title, merged)
 *   Row 3 : Column headers
 *   Row 4+: Data rows
 *   Footer: Total row with SUM formulas
 */

const ExcelJS = require('exceljs');

const MONTH_NAMES = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER',
];

function monthHeading(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * Produce Monthly GST Report buffer.
 * @param {object} input
 * @param {string} input.month        "YYYY-MM"
 * @param {Array<object>} input.rows  rows from service.monthlyGst()
 * @returns {Promise<Buffer>}
 */
async function generateMonthlyGstXlsx({ month, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator        = 'BIGIN Insurance System';
  wb.created        = new Date();
  wb.lastModifiedBy = 'BIGIN';

  const ws = wb.addWorksheet('Monthly GST Report', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.columns = [
    { key: 'creditedDate',        width: 14 },
    { key: 'bankReference',       width: 20 },
    { key: 'natureOfTransaction', width: 30 },
    { key: 'debit',               width: 16 },
    { key: 'credit',              width: 16 },
  ];

  // ── Row 1 — Title ────────────────────────────────────────────────────────
  ws.mergeCells('A1:E1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BIGIN INSURANCE BROKERS PRIVATE LIMITED';
  titleCell.font  = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // ── Row 2 — Sub-title ────────────────────────────────────────────────────
  ws.mergeCells('A2:E2');
  const subCell = ws.getCell('A2');
  subCell.value = `MONTHLY GST REPORT — ${monthHeading(month)}`;
  subCell.font  = { name: 'Arial', size: 11, bold: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // ── Row 3 — Headers ──────────────────────────────────────────────────────
  const headers = ['Credited Date', 'Bank Reference', 'Nature of Transaction', 'Debit (Deposits)', 'Credit (Payments)'];
  const headerRow = ws.getRow(3);
  headers.forEach((h, idx) => { headerRow.getCell(idx + 1).value = h; });
  headerRow.eachCell((cell) => {
    cell.font      = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
    cell.border = {
      top:    { style: 'thin' }, bottom: { style: 'thin' },
      left:   { style: 'thin' }, right:  { style: 'thin' },
    };
  });
  headerRow.height = 28;

  // ── Data rows — Row 4 onwards ───────────────────────────────────────────
  const startRow = 4;
  rows.forEach((r, idx) => {
    const rNum = startRow + idx;
    const row  = ws.getRow(rNum);

    if (r.creditedDate) row.getCell(1).value = new Date(r.creditedDate);
    row.getCell(2).value = r.bankReference || '';
    row.getCell(3).value = r.natureOfTransaction || '';
    row.getCell(4).value = Number(r.debit ?? 0);
    row.getCell(5).value = Number(r.credit ?? 0);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = cell.font || { name: 'Arial', size: 10 };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
      if (col === 1)               cell.numFmt = 'dd/mm/yyyy';
      else if (col === 4 || col === 5) cell.numFmt = '#,##0.00';
    });
  });

  const lastDataRow = startRow + rows.length - 1;

  // ── Totals row ───────────────────────────────────────────────────────────
  if (rows.length > 0) {
    const totalRowNum = lastDataRow + 1;
    const totalRow    = ws.getRow(totalRowNum);
    totalRow.getCell(3).value = 'TOTAL';
    totalRow.getCell(4).value = { formula: `SUM(D${startRow}:D${lastDataRow})` };
    totalRow.getCell(5).value = { formula: `SUM(E${startRow}:E${lastDataRow})` };
    totalRow.eachCell((cell, col) => {
      cell.font   = { name: 'Arial', size: 10, bold: true };
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      cell.border = {
        top:    { style: 'double' }, bottom: { style: 'double' },
        left:   { style: 'thin' },   right:  { style: 'thin' },
      };
      if (col === 4 || col === 5) cell.numFmt = '#,##0.00';
    });
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { generateMonthlyGstXlsx };
