const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const service = require('./incentive.service');

// ─── Layout constants ─────────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 595.28;  // A4 portrait points
const PAGE_HEIGHT = 841.89;

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'bigin-logo.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);
const COL_WIDTHS = [160, 105, 115, 115]; // month | points | point value | incentive amount
const TABLE_COLS = ['Month', 'Points', 'Point Value', 'Incentive Amount'];
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 26;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateTime(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawHRule(doc, y, color = '#cccccc') {
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(color).lineWidth(0.5).stroke();
}

function drawTableHeader(doc, y) {
  doc.rect(MARGIN, y, USABLE_WIDTH, HEADER_HEIGHT).fill('#1a1a2e');

  let x = MARGIN;
  TABLE_COLS.forEach((col, i) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text(col, x + 6, y + 8, { width: COL_WIDTHS[i] - 12, align: i === 0 ? 'left' : 'right' });
    x += COL_WIDTHS[i];
  });
  return y + HEADER_HEIGHT;
}

function drawTableRow(doc, row, y, isEven) {
  if (isEven) {
    doc.rect(MARGIN, y, USABLE_WIDTH, ROW_HEIGHT).fill('#f5f7fa');
  }

  const cells = [
    monthLabel(row.month),
    String(row.points),
    Number(row.pointValue).toFixed(2),
    fmt(row.incentiveAmount),
  ];

  let x = MARGIN;
  cells.forEach((cell, i) => {
    doc.fillColor('#111111').font('Helvetica').fontSize(9)
      .text(cell, x + 6, y + 6, { width: COL_WIDTHS[i] - 12, align: i === 0 ? 'left' : 'right' });
    x += COL_WIDTHS[i];
  });

  doc.moveTo(MARGIN, y + ROW_HEIGHT)
    .lineTo(PAGE_WIDTH - MARGIN, y + ROW_HEIGHT)
    .strokeColor('#e0e0e0').lineWidth(0.3).stroke();

  return y + ROW_HEIGHT;
}

function drawTotalsRow(doc, totalPoints, totalIncentiveAmount, y) {
  doc.rect(MARGIN, y, USABLE_WIDTH, ROW_HEIGHT).fill('#e8edf9');

  let x = MARGIN;
  const cells = ['Total', String(totalPoints), '', fmt(totalIncentiveAmount)];
  cells.forEach((cell, i) => {
    doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(9)
      .text(cell, x + 6, y + 6, { width: COL_WIDTHS[i] - 12, align: i === 0 ? 'left' : 'right' });
    x += COL_WIDTHS[i];
  });

  return y + ROW_HEIGHT;
}

// ─── Main export function ─────────────────────────────────────────────────────

async function generateExecutivePDF(res, { leadMemberId, year }) {
  const [executiveRow] = await service.executiveWiseReport({ leadMemberId, year });

  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `BIGIN Incentive Report – ${executiveRow?.leadMemberName ?? 'Executive'} – ${year}`,
      Author: 'BIGIN Insurance System',
    },
  });

  const fileSafeName = (executiveRow?.leadMemberName ?? 'executive').replace(/[^a-z0-9]+/gi, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="incentive-report-${fileSafeName}-${year}.pdf"`);
  doc.pipe(res);

  // ── Header band ──────────────────────────────────────────────────────────────
  let y = MARGIN;
  const HEADER_H = HAS_LOGO ? 90 : 70;
  doc.rect(0, 0, PAGE_WIDTH, HEADER_H).fill('#1a1a2e');

  if (HAS_LOGO) {
    try {
      doc.image(LOGO_PATH, MARGIN, 14, { fit: [60, 60], align: 'left' });
    } catch (_) {
      // If file is corrupt or unreadable, silently skip
    }
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text('BIGIN INSURANCE SYSTEM', MARGIN + 75, 26);
    doc.fillColor('#a0aec0').font('Helvetica').fontSize(11)
      .text('Lead Executive Incentive Report', MARGIN + 75, 52);
  } else {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text('BIGIN INSURANCE SYSTEM', MARGIN, 18);
    doc.fillColor('#a0aec0').font('Helvetica').fontSize(11)
      .text('Lead Executive Incentive Report', MARGIN, 42);
  }

  y = HEADER_H + 20;

  // ── Executive / period summary ──────────────────────────────────────────────
  doc.fillColor('#333333').font('Helvetica-Bold').fontSize(13)
    .text(`Lead Executive: ${executiveRow?.leadMemberName ?? '—'}`, MARGIN, y);
  doc.font('Helvetica').fontSize(11).fillColor('#555555')
    .text(`Year: ${year}`, MARGIN, y + 18);
  doc.font('Helvetica').fontSize(9).fillColor('#888888')
    .text(`Generated on ${fmtDateTime(new Date())}`, MARGIN, y + 36);

  y += 60;
  drawHRule(doc, y, '#1a1a2e');
  y += 14;

  // ── Month-wise table ─────────────────────────────────────────────────────────
  doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(11)
    .text('Month-wise Incentive Details', MARGIN, y);
  y += 18;

  const months = executiveRow?.months ?? [];

  if (months.length === 0) {
    doc.fillColor('#888888').font('Helvetica').fontSize(10)
      .text('No incentive entries found for this Lead Executive and year.', MARGIN, y);
    doc.end();
    return;
  }

  y = drawTableHeader(doc, y);

  months.forEach((row, idx) => {
    if (y + ROW_HEIGHT > PAGE_HEIGHT - MARGIN) {
      doc.addPage({ size: 'A4', margin: MARGIN });

      doc.rect(0, 0, PAGE_WIDTH, 30).fill('#1a1a2e');
      doc.fillColor('#a0aec0').font('Helvetica').fontSize(8)
        .text(`BIGIN Insurance – ${executiveRow.leadMemberName} – ${year} (continued)`, MARGIN, 10);

      y = 44;
      y = drawTableHeader(doc, y);
    }

    y = drawTableRow(doc, row, y, idx % 2 === 1);
  });

  y = drawTotalsRow(doc, executiveRow.totalPoints, executiveRow.totalIncentiveAmount, y);

  // ── Footer on every page ───────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.fillColor('#aaaaaa').font('Helvetica').fontSize(7)
      .text(
        `BIGIN Insurance System  |  Confidential  |  Page ${i + 1} of ${range.count}`,
        MARGIN,
        PAGE_HEIGHT - 20,
        { align: 'center', width: USABLE_WIDTH }
      );
  }

  doc.end();
}

module.exports = { generateExecutivePDF };
