const ExcelJS = require('exceljs');
const fs = require('fs');
async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/Praveen/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/993B131FF79FE590C9B51FDF2324B90670D9C31B/transfers/2026-22/Copy of Sales Ledger 2025-26 as on 14-May-2026.xlsx');
  const ws = wb.worksheets[0];
  // Find the actual last row with data
  let lastDataRow = 0;
  ws.eachRow({ includeEmpty: false }, (row, r) => { lastDataRow = r; });
  console.log('lastDataRow', lastDataRow, 'wsRowCount', ws.rowCount);
  // Print last 25 non-empty rows
  const captured = [];
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    const out = [];
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const v = cell.value;
      const d = (v && typeof v === 'object' && 'result' in v) ? v.result : v;
      if (d != null) out.push('C' + col + '=' + String(d).slice(0,20));
    });
    if (out.length) captured.push({ r, line: 'R' + r + ': ' + out.slice(0, 8).join(' | ') });
  });
  captured.slice(-25).forEach(x => console.log(x.line));
}
main().catch(e => console.error('ERR:', e.message));
