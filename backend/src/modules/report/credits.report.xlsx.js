'use strict';

/**
 * credits.report.xlsx.js
 *
 * Generates the Bank Credits Report — inbound brokerage payments matched to
 * invoices, grouped by bank account, with running balance formulas.
 *
 * Layout:
 *   Row 1 : "BIGIN INSURANCE BROKERS PRIVATE LIMITED" (title, merged)
 *   Row 2 : "CREDITS FROM <from> TO <to>" (sub-title, merged)
 *   Then : per bankAccount section
 *           section header row
 *           column header row
 *           data rows (running BALANCE formula in column F)
 *           section subtotal row
 *   Bottom : grand-total row
 */

const ExcelJS = require('exceljs');

function fmtDateLabel(d) {
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

/**
 * Group rows by bankAccount label. Rows without a bankAccount go to "Unassigned".
 */
function groupByBank(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = r.bankAccount?.trim() || 'Unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  // Sort each group by date ascending (running balance is meaningful only when ordered)
  for (const arr of groups.values()) {
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  return groups;
}

/**
 * Produce Credits Report buffer.
 * @param {object} input
 * @param {string} input.from         "YYYY-MM-DD"
 * @param {string} input.to           "YYYY-MM-DD"
 * @param {Array<object>} input.rows  rows from service.credits()
 * @returns {Promise<Buffer>}
 */
async function generateCreditsXlsx({ from, to, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator        = 'BIGIN Insurance System';
  wb.created        = new Date();
  wb.lastModifiedBy = 'BIGIN';

  const ws = wb.addWorksheet('Credits', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.columns = [
    { key: 'date',          width: 13 },
    { key: 'receivedFrom',  width: 32 },
    { key: 'nature',        width: 22 },
    { key: 'deposit',       width: 14 },
    { key: 'payment',       width: 14 },
    { key: 'balance',       width: 14 },
    { key: 'notes',         width: 30 },
    { key: 'remarks',       width: 14 },
  ];

  // ── Row 1 — Title ────────────────────────────────────────────────────────
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BIGIN INSURANCE BROKERS PRIVATE LIMITED';
  titleCell.font  = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // ── Row 2 — Sub-title (period) ───────────────────────────────────────────
  ws.mergeCells('A2:H2');
  const subCell = ws.getCell('A2');
  subCell.value = `CREDITS FROM ${fmtDateLabel(from)} TO ${fmtDateLabel(to)}`;
  subCell.font  = { name: 'Arial', size: 11, bold: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Row 3 — blank gap
  ws.getRow(3).height = 6;

  let r = 4;
  const groups = groupByBank(rows);
  const grandTotalRefs = [];   // cell refs of each section subtotal — for grand total

  for (const [bankAccount, sectionRows] of groups) {

    // ── Section header ────────────────────────────────────────────────────
    ws.mergeCells(`A${r}:H${r}`);
    const sec = ws.getCell(`A${r}`);
    sec.value = bankAccount;
    sec.font  = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    sec.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(r).height = 20;
    r++;

    // ── Column header row ─────────────────────────────────────────────────
    const headerLabels = [
      'DATE', 'RECEIVED FROM / PAID TO', 'NATURE OF TRANSACTION',
      'Debit DEPOSITS', 'Credit PAYMENTS', 'BALANCE',
      'Additional notes', 'Remarks',
    ];
    const hdrRow = ws.getRow(r);
    headerLabels.forEach((label, i) => { hdrRow.getCell(i + 1).value = label; });
    hdrRow.eachCell((cell) => {
      cell.font      = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
      cell.border = {
        top:    { style: 'thin' }, bottom: { style: 'thin' },
        left:   { style: 'thin' }, right:  { style: 'thin' },
      };
    });
    hdrRow.height = 28;
    r++;

    // ── Data rows with running balance formula ───────────────────────────
    const firstDataRow = r;
    sectionRows.forEach((row) => {
      const dataRow = ws.getRow(r);
      if (row.date) dataRow.getCell(1).value = new Date(row.date);
      dataRow.getCell(2).value = row.receivedFrom || '';
      dataRow.getCell(3).value = row.nature || '';
      dataRow.getCell(4).value = Number(row.deposit ?? 0);
      dataRow.getCell(5).value = Number(row.payment ?? 0);

      // Balance formula:
      //   first row: = D + 0 - E   (treats opening balance as 0)
      //   later rows: = previousBalance + D - E
      if (r === firstDataRow) {
        dataRow.getCell(6).value = { formula: `D${r}-E${r}` };
      } else {
        dataRow.getCell(6).value = { formula: `F${r - 1}+D${r}-E${r}` };
      }

      dataRow.getCell(7).value = row.notes || '';
      dataRow.getCell(8).value = row.remarks || '';

      // Borders + number formats
      dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = cell.font || { name: 'Arial', size: 10 };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
        if (col === 1)                       cell.numFmt = 'dd/mm/yyyy';
        else if ([4, 5, 6].includes(col))    cell.numFmt = '#,##0.00';
      });
      r++;
    });

    // ── Section subtotal ─────────────────────────────────────────────────
    const lastDataRow = r - 1;
    if (sectionRows.length > 0) {
      const totalRow = ws.getRow(r);
      totalRow.getCell(3).value = 'SECTION SUBTOTAL';
      totalRow.getCell(4).value = { formula: `SUM(D${firstDataRow}:D${lastDataRow})` };
      totalRow.getCell(5).value = { formula: `SUM(E${firstDataRow}:E${lastDataRow})` };
      // Closing balance = last balance cell
      totalRow.getCell(6).value = { formula: `F${lastDataRow}` };
      totalRow.eachCell((cell, col) => {
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        cell.border = {
          top:    { style: 'double' }, bottom: { style: 'thin' },
          left:   { style: 'thin' },   right:  { style: 'thin' },
        };
        if ([4, 5, 6].includes(col)) cell.numFmt = '#,##0.00';
      });
      grandTotalRefs.push(r);
      r++;
    }

    // Gap between sections
    ws.getRow(r).height = 8;
    r++;
  }

  // ── Grand total row ──────────────────────────────────────────────────────
  if (grandTotalRefs.length > 0) {
    const grand = ws.getRow(r);
    grand.getCell(3).value = 'GRAND TOTAL';
    grand.getCell(4).value = { formula: grandTotalRefs.map((rr) => `D${rr}`).join('+') };
    grand.getCell(5).value = { formula: grandTotalRefs.map((rr) => `E${rr}`).join('+') };
    grand.eachCell((cell, col) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      cell.border = {
        top:    { style: 'double' }, bottom: { style: 'double' },
        left:   { style: 'thin' },   right:  { style: 'thin' },
      };
      if ([4, 5, 6].includes(col)) cell.numFmt = '#,##0.00';
    });
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { generateCreditsXlsx };
