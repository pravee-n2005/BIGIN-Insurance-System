'use strict';

const ExcelJS = require('exceljs');

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtPeriod({ fy, month }) {
  if (month) {
    const [y, m] = month.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (fy) return `FY ${fy}`;
  return 'All Periods';
}

const STATUS_LABELS = { PENDING: 'Pending', PAID: 'Paid', PARTIALLY_PAID: 'Partly Paid' };

async function generatePOSPReportXlsx({ member, fy, month, entries, summary }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BIGIN Insurance System';
  wb.created = new Date();

  const ws = wb.addWorksheet('POSP Payout', { views: [{ state: 'frozen', ySplit: 5 }] });

  ws.columns = [
    { key: 'no',              width: 5  },
    { key: 'entryDate',       width: 14 },
    { key: 'policyNumber',    width: 22 },
    { key: 'customerName',    width: 26 },
    { key: 'policyType',      width: 16 },
    { key: 'premium',         width: 16 },
    { key: 'commissionRate',  width: 14 },
    { key: 'brokerage',       width: 16 },
    { key: 'pospShare',       width: 13 },
    { key: 'pospCommission',  width: 18 },
    { key: 'orgCommission',   width: 18 },
    { key: 'paymentStatus',   width: 14 },
    { key: 'invoiceRef',      width: 18 },
    { key: 'invoiceDate',     width: 14 },
    { key: 'remarks',         width: 22 },
  ];

  const TOTAL_COLS = 15;
  const merge = (r, label, style) => {
    ws.mergeCells(`A${r}:O${r}`);
    const cell = ws.getCell(`A${r}`);
    cell.value = label;
    Object.assign(cell, style);
    ws.getRow(r).height = style.height || 16;
  };

  // Row 1 — Company
  merge(1, 'BIGIN INSURANCE BROKERS PRIVATE LIMITED', {
    font: { name: 'Arial', size: 14, bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
    height: 24,
  });

  // Row 2 — Title
  merge(2, 'POSP PAYOUT REGISTER', {
    font: { name: 'Arial', size: 11, bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
    height: 18,
  });

  // Row 3 — POSP name + period
  const memberLabel = member ? `POSP: ${member.name} (${member.code})` : 'All POSP Members';
  merge(3, `${memberLabel}   |   Period: ${fmtPeriod({ fy, month })}`, {
    font: { name: 'Arial', size: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
    height: 16,
  });

  // Row 4 — Summary bar
  ws.mergeCells('A4:C4'); ws.getCell('A4').value = `Total Policies: ${summary.totalPolicies}`;
  ws.mergeCells('D4:F4'); ws.getCell('D4').value = `Total Premium: ₹${Number(summary.totalPremium).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  ws.mergeCells('G4:I4'); ws.getCell('G4').value = `Total Brokerage: ₹${Number(summary.totalBrokerage).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  ws.mergeCells('J4:L4'); ws.getCell('J4').value = `POSP Commission: ₹${Number(summary.totalPospCommission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  ws.mergeCells('M4:O4'); ws.getCell('M4').value = `Org Commission: ₹${Number(summary.totalOrgCommission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  ['A4', 'D4', 'G4', 'J4', 'M4'].forEach((addr) => {
    const cell = ws.getCell(addr);
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });
  ws.getRow(4).height = 16;

  // Row 5 — Headers
  const headers = [
    '#', 'Date', 'Policy Number', 'Customer Name', 'Policy Type',
    'Premium (₹)', 'Commission %', 'Brokerage (₹)', 'POSP Share %',
    'POSP Commission (₹)', 'Org Commission (₹)',
    'Payment Status', 'Invoice Ref', 'Invoice Date', 'Remarks',
  ];
  const hRow = ws.getRow(5);
  headers.forEach((h, i) => {
    hRow.getCell(i + 1).value = h;
  });
  hRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  hRow.height = 26;

  // Data rows
  const startRow = 6;
  entries.forEach((e, idx) => {
    const rn = startRow + idx;
    const row = ws.getRow(rn);

    row.getCell(1).value  = idx + 1;
    row.getCell(2).value  = fmtDate(e.entryDate);
    row.getCell(3).value  = e.policyNumber;
    row.getCell(4).value  = e.customerName;
    row.getCell(5).value  = e.policyType || '';
    row.getCell(6).value  = Number(e.premium);
    row.getCell(7).value  = Number(e.commissionRate);
    row.getCell(8).value  = Number(e.brokerage);
    row.getCell(9).value  = Number(e.pospShare);
    row.getCell(10).value = Number(e.pospCommission);
    row.getCell(11).value = Number(e.orgCommission);
    row.getCell(12).value = STATUS_LABELS[e.paymentStatus] || e.paymentStatus;
    row.getCell(13).value = e.invoiceReference || '';
    row.getCell(14).value = fmtDate(e.invoiceDate);
    row.getCell(15).value = e.remarks || '';

    // Alternating row colors
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF2F4F8';
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
      if ([6, 8, 10, 11].includes(col)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
      if ([7, 9].includes(col)) {
        cell.numFmt = '0.00"%"';
        cell.alignment = { horizontal: 'center' };
      }
    });
    row.height = 15;
  });

  const lastDataRow = startRow + entries.length - 1;

  // Totals row
  if (entries.length > 0) {
    const tn = lastDataRow + 1;
    const row = ws.getRow(tn);
    row.getCell(1).value  = '';
    row.getCell(2).value  = 'TOTAL';
    row.getCell(3).value  = '';
    row.getCell(4).value  = '';
    row.getCell(5).value  = `${entries.length} policies`;
    row.getCell(6).value  = { formula: `SUM(F${startRow}:F${lastDataRow})` };
    row.getCell(7).value  = '';
    row.getCell(8).value  = { formula: `SUM(H${startRow}:H${lastDataRow})` };
    row.getCell(9).value  = '';
    row.getCell(10).value = { formula: `SUM(J${startRow}:J${lastDataRow})` };
    row.getCell(11).value = { formula: `SUM(K${startRow}:K${lastDataRow})` };
    row.getCell(12).value = '';
    row.getCell(13).value = '';
    row.getCell(14).value = '';
    row.getCell(15).value = '';

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      cell.border = {
        top:    { style: 'double', color: { argb: 'FF000000' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } },
        left:   { style: 'thin' },
        right:  { style: 'thin' },
      };
      if ([6, 8, 10, 11].includes(col)) cell.numFmt = '#,##0.00';
    });
    row.height = 16;
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { generatePOSPReportXlsx };
