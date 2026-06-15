'use strict';

const ExcelJS = require('exceljs');
const { COLUMNS, normalizeValue } = require('./import.columns');

function cellValue(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && 'text' in v) return v.text;       // rich text
  if (typeof v === 'object' && 'result' in v) return v.result;   // formula
  return v;
}

// Parse an uploaded workbook buffer into normalized row objects.
// Returns { headerErrors, rows: [{ rowNum, normalized, rawPolicyNumber }] }.
// `rowNum` is the 1-based Excel row number (header = row 1, first data row = 2)
// so error messages map back to what the user sees in Excel.
async function parseWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) return { headerErrors: ['Workbook contains no worksheets.'], rows: [] };

  // Map header cell text -> column index (1-based)
  const headerRow = ws.getRow(1);
  const colIndexByKey = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = String(cellValue(cell) ?? '').trim();
    const col = COLUMNS.find((c) => c.header.toLowerCase() === text.toLowerCase());
    if (col) colIndexByKey[col.key] = colNumber;
  });

  const headerErrors = [];
  const missingHeaders = COLUMNS.filter((c) => c.required && !(c.key in colIndexByKey));
  if (missingHeaders.length) {
    headerErrors.push(
      `Missing required column(s): ${missingHeaders.map((c) => c.header).join(', ')}. ` +
      `Please use the provided template without renaming headers.`
    );
  }

  const rows = [];
  if (headerErrors.length) return { headerErrors, rows };

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    if (row.actualCellCount === 0) continue; // skip fully blank rows

    const raw = {};
    let allBlank = true;
    for (const col of COLUMNS) {
      const idx = colIndexByKey[col.key];
      const value = idx ? cellValue(row.getCell(idx)) : null;
      if (value !== null && value !== undefined && String(value).trim() !== '') allBlank = false;
      raw[col.key] = normalizeValue(col, value);
    }
    if (allBlank) continue; // skip trailing/blank rows

    rows.push({ rowNum, normalized: raw });
  }

  return { headerErrors, rows };
}

module.exports = { parseWorkbook };
