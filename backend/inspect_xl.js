const ExcelJS = require('exceljs');
const fs = require('fs');
const xlsxPath = 'C:/Users/Praveen/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/993B131FF79FE590C9B51FDF2324B90670D9C31B/transfers/2026-22/Copy of Sales Ledger 2025-26 as on 14-May-2026.xlsx';
async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];
  console.log('rowCount', ws.rowCount);
  for (let r = ws.rowCount - 15; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const out = [];
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const v = cell.value;
      const d = (v && typeof v === 'object' && 'result' in v) ? v.result : v;
      if (d != null) out.push('C' + col + '=' + String(d).slice(0,20));
    });
    if (out.length) console.log('R' + r + ': ' + out.slice(0,8).join(' | '));
  }
}
main().catch(e => console.error(e.message));
