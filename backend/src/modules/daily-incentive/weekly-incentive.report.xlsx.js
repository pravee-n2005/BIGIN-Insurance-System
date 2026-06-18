'use strict';

/**
 * weekly-incentive.report.xlsx.js
 *
 * Generates the Daily Incentives Weekly Report as an Excel workbook.
 *
 * Layout:
 *   Row 1 : "BIGIN INSURANCE BROKERS PRIVATE LIMITED" (title, merged)
 *   Row 2 : "DAILY INCENTIVES — WEEKLY REPORT (<weekStart> to <weekEnd>) — Generated: <date>" (sub-title, merged)
 *   Row 3 : Column headers
 *   Row 4+: Data rows (one per employee)
 *   Footer: Grand Totals row from `overall`
 */

const ExcelJS = require('exceljs');

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN');
}

/**
 * @param {object} input
 * @param {string} input.weekStart        "YYYY-MM-DD"
 * @param {string} input.weekEnd          "YYYY-MM-DD"
 * @param {Array<object>} input.employees rows from service.weeklyReport()
 * @param {object} input.overall          totals from service.weeklyReport()
 * @returns {Promise<Buffer>}
 */
async function generateWeeklyIncentiveXlsx({ weekStart, weekEnd, employees, overall }) {
  const wb = new ExcelJS.Workbook();
  wb.creator        = 'BIGIN Insurance System';
  wb.created        = new Date();
  wb.lastModifiedBy = 'BIGIN';

  const ws = wb.addWorksheet('Weekly Incentive Report', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.columns = [
    { key: 'employee',         width: 24 },
    { key: 'totalCalls',       width: 14 },
    { key: 'touchBase',        width: 14 },
    { key: 'interested',       width: 14 },
    { key: 'lifeConversions',  width: 16 },
    { key: 'healthConversions', width: 18 },
    { key: 'points',           width: 12 },
    { key: 'amount',           width: 16 },
  ];

  // ── Row 1 — Title ────────────────────────────────────────────────────────
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BIGIN INSURANCE BROKERS PRIVATE LIMITED';
  titleCell.font  = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // ── Row 2 — Sub-title ────────────────────────────────────────────────────
  ws.mergeCells('A2:H2');
  const subCell = ws.getCell('A2');
  subCell.value = `DAILY INCENTIVES — WEEKLY REPORT (${formatDate(weekStart)} to ${formatDate(weekEnd)}) — Generated: ${formatDate(new Date())}`;
  subCell.font  = { name: 'Arial', size: 11, bold: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // ── Row 3 — Headers ──────────────────────────────────────────────────────
  const headers = ['Employee', 'Total Calls', 'Touch Base', 'Interested', 'Life Conversions', 'Health Conversions', 'Points', 'Amount'];
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
  employees.forEach((e, idx) => {
    const rNum = startRow + idx;
    const row  = ws.getRow(rNum);

    row.getCell(1).value = e.employeeName;
    row.getCell(2).value = e.totalCalls;
    row.getCell(3).value = e.touchBase;
    row.getCell(4).value = e.interested;
    row.getCell(5).value = e.lifeConversions;
    row.getCell(6).value = e.healthConversions;
    row.getCell(7).value = Number(e.totalPoints);
    row.getCell(8).value = Number(e.totalIncentiveAmount);

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = cell.font || { name: 'Arial', size: 10 };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
      if (col === 7 || col === 8) cell.numFmt = '#,##0.00';
    });
  });

  const lastDataRow = startRow + employees.length - 1;

  // ── Grand Totals row ─────────────────────────────────────────────────────
  if (employees.length > 0) {
    const totalRowNum = lastDataRow + 1;
    const totalRow    = ws.getRow(totalRowNum);
    totalRow.getCell(1).value = 'Grand Total';
    totalRow.getCell(2).value = { formula: `SUM(B${startRow}:B${lastDataRow})` };
    totalRow.getCell(3).value = { formula: `SUM(C${startRow}:C${lastDataRow})` };
    totalRow.getCell(4).value = { formula: `SUM(D${startRow}:D${lastDataRow})` };
    totalRow.getCell(5).value = { formula: `SUM(E${startRow}:E${lastDataRow})` };
    totalRow.getCell(6).value = { formula: `SUM(F${startRow}:F${lastDataRow})` };
    totalRow.getCell(7).value = { formula: `SUM(G${startRow}:G${lastDataRow})` };
    totalRow.getCell(8).value = { formula: `SUM(H${startRow}:H${lastDataRow})` };
    totalRow.eachCell((cell, col) => {
      cell.font   = { name: 'Arial', size: 10, bold: true };
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      cell.border = {
        top:    { style: 'double' }, bottom: { style: 'double' },
        left:   { style: 'thin' },   right:  { style: 'thin' },
      };
      if (col === 7 || col === 8) cell.numFmt = '#,##0.00';
    });
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { generateWeeklyIncentiveXlsx };
