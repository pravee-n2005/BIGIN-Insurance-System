const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const reportService = require('../report/report.service');

// ─── Layout constants ─────────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 841.89;  // A4 landscape points
const PAGE_HEIGHT = 595.28;

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'bigin-logo.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);
const COL_WIDTHS = [130, 110, 130, 75, 85, 80]; // customer|insurer|policy#|premium|commission|leadSource
const TABLE_COLS = ['Customer Name', 'Insurer', 'Policy Number', 'Premium', 'Commission', 'Lead Source'];
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 26;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(str, maxLen) {
  if (!str) return '—';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawHRule(doc, y, color = '#cccccc') {
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(color).lineWidth(0.5).stroke();
}

function drawSummaryRow(doc, label, value, y) {
  doc.fontSize(10).fillColor('#444444').font('Helvetica-Bold').text(label, MARGIN, y);
  doc.font('Helvetica').fillColor('#000000').text(value, MARGIN + 170, y);
}

function drawTableHeader(doc, y) {
  // Header background
  doc.rect(MARGIN, y, USABLE_WIDTH, HEADER_HEIGHT).fill('#1a1a2e');

  let x = MARGIN;
  TABLE_COLS.forEach((col, i) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5)
      .text(col, x + 4, y + 7, { width: COL_WIDTHS[i] - 8, ellipsis: true });
    x += COL_WIDTHS[i];
  });
  return y + HEADER_HEIGHT;
}

function drawTableRow(doc, policy, y, isEven) {
  if (isEven) {
    doc.rect(MARGIN, y, USABLE_WIDTH, ROW_HEIGHT).fill('#f5f7fa');
  }

  const cells = [
    truncate(policy.customerName, 20),
    truncate(policy.insurerName, 16),
    truncate(policy.policyNumber, 20),
    fmt(policy.grossPremium),
    fmt(policy.commissionAmount),
    truncate(policy.leadSource, 12),
  ];

  let x = MARGIN;
  cells.forEach((cell, i) => {
    doc.fillColor('#111111').font('Helvetica').fontSize(8)
      .text(cell, x + 4, y + 6, { width: COL_WIDTHS[i] - 8, ellipsis: true });
    x += COL_WIDTHS[i];
  });

  // bottom border
  doc.moveTo(MARGIN, y + ROW_HEIGHT)
    .lineTo(PAGE_WIDTH - MARGIN, y + ROW_HEIGHT)
    .strokeColor('#e0e0e0').lineWidth(0.3).stroke();

  return y + ROW_HEIGHT;
}

// ─── Main export function ─────────────────────────────────────────────────────

async function generateMonthlyPDF(res, { month, from, to }) {
  const report = await reportService.monthly({ month, from, to });

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `BIGIN Monthly Report – ${report.period}`,
      Author: 'BIGIN Insurance System',
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bigin-report-${report.period}.pdf"`);
  doc.pipe(res);

  // ── Cover / Summary section ─────────────────────────────────────────────────
  let y = MARGIN;

  // Company header — taller band when logo is present
  const HEADER_H = HAS_LOGO ? 90 : 70;
  doc.rect(0, 0, PAGE_WIDTH, HEADER_H).fill('#1a1a2e');

  if (HAS_LOGO) {
    // Logo on the left, text shifted right
    try {
      doc.image(LOGO_PATH, MARGIN, 14, { fit: [60, 60], align: 'left' });
    } catch (_) {
      // If file is corrupt or unreadable, silently skip
    }
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text('BIGIN INSURANCE SYSTEM', MARGIN + 75, 26);
    doc.fillColor('#a0aec0').font('Helvetica').fontSize(11)
      .text('Monthly Business Report', MARGIN + 75, 52);
  } else {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text('BIGIN INSURANCE SYSTEM', MARGIN, 18);
    doc.fillColor('#a0aec0').font('Helvetica').fontSize(11)
      .text('Monthly Business Report', MARGIN, 42);
  }

  y = HEADER_H + 20;

  // Period + generated date
  doc.fillColor('#333333').font('Helvetica-Bold').fontSize(13)
    .text(`Period: ${report.period}`, MARGIN, y);
  doc.font('Helvetica').fontSize(9).fillColor('#888888')
    .text(`Generated on ${fmtDate(new Date())}`, MARGIN, y + 16);

  y += 42;
  drawHRule(doc, y);
  y += 14;

  // Summary boxes
  const summaryItems = [
    ['Total Policies',    String(report.totalPolicies)],
    ['Gross Premium',     fmt(report.totalGrossPremium)],
    ['Net Premium',       fmt(report.totalNetPremium)],
    ['GST Amount',        fmt(report.totalGstAmount)],
    ['Total Commission',  fmt(report.totalCommission)],
    ['Total TDS',         fmt(report.totalTds)],
    ['Net Receivable',    fmt(report.totalReceivable)],
  ];

  summaryItems.forEach(([label, value], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const boxW = (USABLE_WIDTH - 18) / 4;
    const bx = MARGIN + col * (boxW + 6);
    const by = y + row * 60;

    doc.rect(bx, by, boxW, 50).fillAndStroke('#f0f4ff', '#dbe4ff');
    doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), bx + 8, by + 8, { width: boxW - 16 });
    doc.fillColor('#0d47a1').font('Helvetica-Bold').fontSize(12).text(value, bx + 8, by + 24, { width: boxW - 16 });
  });

  y += Math.ceil(summaryItems.length / 4) * 60 + 16;

  drawHRule(doc, y, '#1a1a2e');
  y += 14;

  // ── Table section ──────────────────────────────────────────────────────────
  doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(11)
    .text('Policy Details', MARGIN, y);
  y += 18;

  if (report.policies.length === 0) {
    doc.fillColor('#888888').font('Helvetica').fontSize(10)
      .text('No policies found for this period.', MARGIN, y);
    doc.end();
    return;
  }

  y = drawTableHeader(doc, y);

  report.policies.forEach((policy, idx) => {
    // New page when close to bottom
    if (y + ROW_HEIGHT > PAGE_HEIGHT - MARGIN) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGIN });

      // Repeat header on new page
      doc.rect(0, 0, PAGE_WIDTH, 30).fill('#1a1a2e');
      doc.fillColor('#a0aec0').font('Helvetica').fontSize(8)
        .text(`BIGIN Insurance – ${report.period} (continued)`, MARGIN, 10);

      y = 44;
      y = drawTableHeader(doc, y);
    }

    y = drawTableRow(doc, policy, y, idx % 2 === 1);
  });

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

module.exports = { generateMonthlyPDF };
