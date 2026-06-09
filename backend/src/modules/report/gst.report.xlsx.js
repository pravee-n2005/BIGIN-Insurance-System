'use strict';

/**
 * gst.report.xlsx.js
 *
 * Generates the GST Sales Register (monthly output GST register) as an Excel
 * file matching the BIGIN reference format. Column structure and formulas
 * mirror the sample provided by the CA.
 *
 * Layout:
 *   Row 1   : "BIGIN INSURANCE BROKERS PRIVATE LIMITED" (title, merged)
 *   Row 2   : "TURNOVER FOR THE MONTH OF <Month YYYY>" (sub-title, merged)
 *   Row 3   : Column headers
 *   Row 4+  : Data rows — formulas, not hardcoded calculations
 *   Footer  : Total row with SUM formulas
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
 * Produce GST Sales Report buffer.
 * @param {object} input
 * @param {string} input.month        "YYYY-MM"
 * @param {Array<object>} input.rows  rows from service.gstSales()
 * @returns {Promise<Buffer>}
 */
async function generateGstSalesXlsx({ month, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator        = 'BIGIN Insurance System';
  wb.created        = new Date();
  wb.lastModifiedBy = 'BIGIN';

  const ws = wb.addWorksheet('GST Sales Register', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  // ── Column geometry ──────────────────────────────────────────────────────
  ws.columns = [
    { key: 'gstin',           width: 22 },
    { key: 'receiverName',    width: 28 },
    { key: 'invoiceNumber',   width: 14 },
    { key: 'invoiceDate',     width: 13 },
    { key: 'invoiceValue',    width: 14 },
    { key: 'hsn',             width: 10 },
    { key: 'rate',            width: 8  },
    { key: 'taxableValue',    width: 14 },
    { key: 'exempted',        width: 14 },
    { key: 'cgst',            width: 12 },
    { key: 'sgst',            width: 12 },
    { key: 'igst',            width: 12 },
    { key: 'taxableAfterTds', width: 18 },
    { key: 'creditedOn',      width: 13 },
  ];

  // ── Row 1 — Title ────────────────────────────────────────────────────────
  ws.mergeCells('A1:N1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BIGIN INSURANCE BROKERS PRIVATE LIMITED';
  titleCell.font  = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // ── Row 2 — Sub-title ────────────────────────────────────────────────────
  ws.mergeCells('A2:N2');
  const subCell = ws.getCell('A2');
  subCell.value = `TURNOVER FOR THE MONTH OF ${monthHeading(month)}`;
  subCell.font  = { name: 'Arial', size: 11, bold: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // ── Row 3 — Headers ──────────────────────────────────────────────────────
  const headers = [
    'GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date',
    'Invoice Value', 'HSN', 'Rate', 'Taxable Value', 'EXEMPTED TURNOVER',
    'CGST', 'SGST', 'IGST', 'Taxable Value 10-12%TDS', 'Credited on',
  ];
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
  headerRow.height = 32;

  // ── Data rows — Row 4 onwards ───────────────────────────────────────────
  const startRow = 4;
  rows.forEach((r, idx) => {
    const rNum = startRow + idx;
    const row  = ws.getRow(rNum);

    row.getCell(1).value = r.gstin || '';
    row.getCell(2).value = r.receiverName || '';
    row.getCell(3).value = r.invoiceNumber || '';

    // Dates as real Date objects so Excel treats them as dates
    if (r.invoiceDate) row.getCell(4).value = new Date(r.invoiceDate);

    // Column E: Invoice Value = H + J + K + L (taxable + cgst + sgst + igst)
    row.getCell(5).value = { formula: `H${rNum}+J${rNum}+K${rNum}+L${rNum}` };

    row.getCell(6).value = r.hsn || '997161';
    row.getCell(7).value = r.rate ?? 0;       // 0.18 — displayed as %

    row.getCell(8).value  = Number(r.taxableValue ?? 0);
    row.getCell(9).value  = Number(r.exemptedTurnover ?? 0);
    row.getCell(10).value = Number(r.cgst ?? 0);
    row.getCell(11).value = Number(r.sgst ?? 0);
    row.getCell(12).value = Number(r.igst ?? 0);

    // Column M: Taxable after TDS = E - (H × TDS rate per row)
    const tdsRate = Number(r.tdsRate ?? 0.10);  // default 10% if not derivable
    row.getCell(13).value = { formula: `E${rNum}-(H${rNum}*${tdsRate})` };

    if (r.creditedOn) row.getCell(14).value = new Date(r.creditedOn);
  });

  const lastDataRow = startRow + rows.length - 1;

  // ── Totals row ───────────────────────────────────────────────────────────
  if (rows.length > 0) {
    const totalRowNum = lastDataRow + 1;
    const totalRow    = ws.getRow(totalRowNum);
    totalRow.getCell(4).value = 'TOTAL';
    ['E', 'H', 'I', 'J', 'K', 'L', 'M'].forEach((col) => {
      totalRow.getCell(col).value = { formula: `SUM(${col}${startRow}:${col}${lastDataRow})` };
    });
    totalRow.eachCell((cell) => {
      cell.font   = { name: 'Arial', size: 10, bold: true };
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      cell.border = {
        top:    { style: 'double' }, bottom: { style: 'double' },
        left:   { style: 'thin' },   right:  { style: 'thin' },
      };
    });
  }

  // ── Formatting (number formats, borders for data area) ──────────────────
  for (let r = startRow; r <= lastDataRow; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = cell.font || { name: 'Arial', size: 10 };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
      // Number formats
      if ([5, 8, 9, 10, 11, 12, 13].includes(col))      cell.numFmt = '#,##0.00';
      else if (col === 7)                                cell.numFmt = '0%';
      else if (col === 4 || col === 14)                  cell.numFmt = 'dd/mm/yyyy';
    });
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { generateGstSalesXlsx };
