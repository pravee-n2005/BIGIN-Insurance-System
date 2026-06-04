'use strict';

/**
 * invoice.pdf.js
 *
 * Generates a GST-compliant Tax Invoice PDF that matches the BIGIN reference
 * format exactly (two-column party block, 10-row service table with grouped
 * CGST/SGST/IGST sub-headers, totals, signature box).
 *
 * Rules enforced here:
 *  - Reads ONLY from the saved Invoice record (snapshot fields).
 *  - Never calls generateDraft() or recalculates any financial value.
 *  - All amounts are rendered directly from DB-stored Decimal fields.
 */

const PDFDocument = require('pdfkit');

// ── Supplier constants (never stored in DB — BIGIN is always the supplier) ───

const SUPPLIER = {
  name:      'Bigin Insurance Brokers Private Limited',
  address:   '26/1 Sree Building, Sarojini Street, T Nagar Chennai 600017',
  state:     'Tamil Nadu',
  stateCode: '033',
  gstin:     '33AALCB7296B1ZN',
};

const HSN_CODE = '997161';

// ── Page geometry (A4 in PDF points: 1 pt = 1/72 inch) ───────────────────────

const PW = 595.28;   // page width
const ML = 30;       // left margin
const MT = 28;       // top margin
const MR = 30;       // right margin
const W  = PW - ML - MR;  // usable width = 535.28

// ── Typefaces ─────────────────────────────────────────────────────────────────

const REG  = 'Helvetica';
const BOLD = 'Helvetica-Bold';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a Decimal/number to 2 d.p. string. */
const f2 = (n) => Number(n).toFixed(2);

/** Format a JS Date → DD/MM/YYYY string. */
function fmtDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * generateInvoicePdf(invoice)
 *
 * @param  {object} invoice  Full Invoice row from Prisma (with snapshot fields).
 * @returns {Promise<Buffer>} PDF bytes.
 */
function generateInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:          'A4',
      margin:        0,
      autoFirstPage: true,
      compress:      true,
    });

    const chunks = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      drawInvoice(doc, invoice);
    } catch (err) {
      reject(err);
      return;
    }

    doc.end();
  });
}

// ── Core drawing routine ──────────────────────────────────────────────────────

function drawInvoice(doc, invoice) {

  // ── Drawing primitives ───────────────────────────────────────────────────

  doc.lineWidth(0.5).strokeColor('#000000').fillColor('#000000');

  /** Bordered rectangle (no fill). */
  function box(x, y, w, h) {
    doc.rect(x, y, w, h).stroke('#000000');
  }

  /**
   * Draw text inside a bordered cell with padding + vertical centering.
   * cx/cy = top-left of cell; cw/ch = cell dimensions.
   */
  function ct(txt, cx, cy, cw, ch, opts = {}) {
    const {
      bold   = false,
      size   = 7.5,
      align  = 'left',
      pad    = 3,
      vAlign = 'middle',  // 'middle' | 'top'
    } = opts;

    if (txt === null || txt === undefined || txt === '') return;
    const s = String(txt);

    doc.font(bold ? BOLD : REG).fontSize(size);
    const textH = doc.heightOfString(s, { width: cw - 2 * pad });
    const ty    = vAlign === 'top'
      ? cy + pad
      : cy + Math.max(pad, (ch - textH) / 2);

    doc.fillColor('#000000')
       .text(s, cx + pad, ty, {
         width:     cw - 2 * pad,
         align,
         lineBreak: true,
       });
  }

  // ── Layout state ─────────────────────────────────────────────────────────

  let y = MT;

  // ── 1. Title bar ─────────────────────────────────────────────────────────

  const TITLE_H = 28;
  box(ML, y, W, TITLE_H);
  doc.font(BOLD).fontSize(14).fillColor('#000000')
     .text('TAX INVOICE', ML, y + (TITLE_H - 14) / 2 - 1, {
       width:     W,
       align:     'center',
       lineBreak: false,
     });
  y += TITLE_H;

  // ── 2. Invoice number / date row ──────────────────────────────────────────

  const INF_H = 20;
  const HW    = W / 2;       // half width = 267.64

  box(ML,      y, HW, INF_H);
  box(ML + HW, y, HW, INF_H);
  ct(`Invoice Number- ${invoice.invoiceNumber}`, ML,      y, HW, INF_H, { size: 8 });
  ct(`Invoice Date - ${fmtDate(invoice.invoiceDate)}`,  ML + HW, y, HW, INF_H, { size: 8 });
  y += INF_H;

  // ── 3. Supplier / Recipient details block ─────────────────────────────────

  const CW = W / 2;   // each column = 267.64

  // Header row
  const DH_HDR = 15;
  box(ML,      y, CW, DH_HDR);
  ct('Details of Supplier - broker',           ML,      y, CW, DH_HDR, { bold: true, size: 8 });
  box(ML + CW, y, CW, DH_HDR);
  ct(`Details of Recipient - ${invoice.recipientHeader}`, ML + CW, y, CW, DH_HDR, { bold: true, size: 8 });
  y += DH_HDR;

  // Five data row-pairs — heights auto-sized to the taller of both sides
  const detailPairs = [
    [
      `Name ${SUPPLIER.name}`,
      `Name of the Customer : ${invoice.recipientLegalName}`,
    ],
    [
      `Address of the Issuing Branch ${SUPPLIER.address}`,
      `Address of the Customer : ${invoice.recipientAddress.replace(/\r?\n/g, ', ')}`,
    ],
    [
      `State ${SUPPLIER.state}`,
      `State ${invoice.recipientState}`,
    ],
    [
      `State Code ${SUPPLIER.stateCode}`,
      `State Code ${invoice.recipientStateCode}`,
    ],
    [
      `GSTIN of the state where branch is located : ${SUPPLIER.gstin}`,
      `GSTIN of Customer w.r.t. the address mentioned above ${invoice.recipientGstin}`,
    ],
  ];

  for (const [leftTxt, rightTxt] of detailPairs) {
    doc.font(REG).fontSize(7.5);
    const lh  = doc.heightOfString(leftTxt,  { width: CW - 8 }) + 7;
    const rh  = doc.heightOfString(rightTxt, { width: CW - 8 }) + 7;
    const rh2 = Math.max(lh, rh);

    box(ML,      y, CW, rh2);
    ct(leftTxt,  ML,      y, CW, rh2, { size: 7.5, vAlign: 'top' });
    box(ML + CW, y, CW, rh2);
    ct(rightTxt, ML + CW, y, CW, rh2, { size: 7.5, vAlign: 'top' });
    y += rh2;
  }

  // ── GST Compliance row (mandatory under CGST Rule 46) ────────────────────
  // Place of Supply  = recipient's registered state (location of the insurer)
  // Reverse Charge   = No  (insurance brokerage is forward charge; BIGIN collects
  //                         and remits GST — the insurer does not pay on RCM basis)
  const COMP_H = 14;
  const compHW = W / 2;

  box(ML,          y, compHW, COMP_H);
  ct(
    `Place of Supply : ${invoice.recipientState} (${invoice.recipientStateCode})`,
    ML, y, compHW, COMP_H,
    { size: 7.5 }
  );

  box(ML + compHW, y, compHW, COMP_H);
  ct(
    'Whether tax is payable on reverse charge basis : No',
    ML + compHW, y, compHW, COMP_H,
    { size: 7.5 }
  );

  y += COMP_H + 4;  // small gap before service table

  // ── 4. Service table ──────────────────────────────────────────────────────

  // Column widths (must sum to W = 535.28)
  //   sr  = Sr. No.
  //   ds  = Description of Services
  //   hs  = HSN Code
  //   tv  = Taxable Value
  //   cgR = CGST Rate   cgA = CGST Amount
  //   sgR = SGST Rate   sgA = SGST Amount
  //   igR = IGST Rate   igA = IGST Amount
  const C = {
    sr:  27,
    ds:  183,
    hs:  43,
    tv:  68,
    cgR: 22,
    cgA: 48,
    sgR: 22,
    sgA: 48,
    igR: 22,
    igA: 0,   // computed below
  };
  C.igA = W - C.sr - C.ds - C.hs - C.tv - C.cgR - C.cgA - C.sgR - C.sgA - C.igR;
  // = 535.28 - 483 = 52.28

  // Column left-edge x positions
  const X = {};
  X.sr  = ML;
  X.ds  = X.sr  + C.sr;
  X.hs  = X.ds  + C.ds;
  X.tv  = X.hs  + C.hs;
  X.cgR = X.tv  + C.tv;
  X.cgA = X.cgR + C.cgR;
  X.sgR = X.cgA + C.cgA;
  X.sgA = X.sgR + C.sgR;
  X.igR = X.sgA + C.sgA;
  X.igA = X.igR + C.igR;

  // ── 4a. Table header (2-row) ─────────────────────────────────────────────

  const TH1 = 13;    // top header row height (CGST/SGST/IGST group labels)
  const TH2 = 11;    // bottom sub-header row height (Rate / Amount labels)
  const THH = TH1 + TH2;

  // Columns that span both header rows (no sub-division)
  box(X.sr, y, C.sr, THH); ct('Sr.\nNo.', X.sr, y, C.sr, THH, { bold: true, size: 6, align: 'center' });
  box(X.ds, y, C.ds, THH); ct('Description of Services', X.ds, y, C.ds, THH, { bold: true, size: 6.5, align: 'center' });
  box(X.hs, y, C.hs, THH); ct('HSN\nCode', X.hs, y, C.hs, THH, { bold: true, size: 6, align: 'center' });
  box(X.tv, y, C.tv, THH); ct('Taxable Value', X.tv, y, C.tv, THH, { bold: true, size: 6.5, align: 'center' });

  // CGST group header (spans Rate+Amount in row 1)
  box(X.cgR, y, C.cgR + C.cgA, TH1); ct('CGST', X.cgR, y, C.cgR + C.cgA, TH1, { bold: true, size: 6.5, align: 'center' });
  // SGST group header
  box(X.sgR, y, C.sgR + C.sgA, TH1); ct('SGST', X.sgR, y, C.sgR + C.sgA, TH1, { bold: true, size: 6.5, align: 'center' });
  // IGST group header
  box(X.igR, y, C.igR + C.igA, TH1); ct('IGST', X.igR, y, C.igR + C.igA, TH1, { bold: true, size: 6.5, align: 'center' });

  // Sub-header row (Rate / Amount)
  const y2 = y + TH1;
  box(X.cgR, y2, C.cgR, TH2); ct('Rate',   X.cgR, y2, C.cgR, TH2, { bold: true, size: 6, align: 'center' });
  box(X.cgA, y2, C.cgA, TH2); ct('Amount', X.cgA, y2, C.cgA, TH2, { bold: true, size: 6, align: 'center' });
  box(X.sgR, y2, C.sgR, TH2); ct('Rate',   X.sgR, y2, C.sgR, TH2, { bold: true, size: 6, align: 'center' });
  box(X.sgA, y2, C.sgA, TH2); ct('Amount', X.sgA, y2, C.sgA, TH2, { bold: true, size: 6, align: 'center' });
  box(X.igR, y2, C.igR, TH2); ct('Rate',   X.igR, y2, C.igR, TH2, { bold: true, size: 6, align: 'center' });
  box(X.igA, y2, C.igA, TH2); ct('Amount', X.igA, y2, C.igA, TH2, { bold: true, size: 6, align: 'center' });

  y += THH;

  // ── 4b. Ten data rows ────────────────────────────────────────────────────

  const DR_H = 14;   // data row height

  const cgstR = Number(invoice.cgstRate);
  const cgstA = Number(invoice.cgstAmount);
  const sgstR = Number(invoice.sgstRate);
  const sgstA = Number(invoice.sgstAmount);
  const igstR = Number(invoice.igstRate);
  const igstA = Number(invoice.igstAmount);
  const txVal = Number(invoice.taxableValue);
  const isIntraState = cgstR > 0;

  // Build 10 row descriptors — only rows 0, 1, 2 carry data
  const rows = Array.from({ length: 10 }, (_, i) => ({ sr: i + 1 }));

  // Row 1 (index 0): service description + HSN code
  rows[0].desc = invoice.description;
  rows[0].hsn  = HSN_CODE;

  // Row 2 (index 1): "Actual Commission" label in Taxable Value column
  rows[1].tvLabel = 'Actual Commission';

  // Row 3 (index 2): line-item category + financial values
  rows[2].desc = invoice.lineItemText || '';
  rows[2].tv   = f2(txVal);
  if (isIntraState) {
    rows[2].cgR = String(cgstR);
    rows[2].cgA = f2(cgstA);
    rows[2].sgR = String(sgstR);
    rows[2].sgA = f2(sgstA);
  } else {
    rows[2].igR = String(igstR);
    rows[2].igA = f2(igstA);
  }

  for (const r of rows) {
    // Sr. No.
    box(X.sr,  y, C.sr,  DR_H);
    ct(r.sr,   X.sr,  y, C.sr,  DR_H, { size: 7, align: 'left' });

    // Description
    box(X.ds,  y, C.ds,  DR_H);
    ct(r.desc, X.ds,  y, C.ds,  DR_H, { size: 7, align: 'left' });

    // HSN Code
    box(X.hs,  y, C.hs,  DR_H);
    ct(r.hsn,  X.hs,  y, C.hs,  DR_H, { size: 7, align: 'center' });

    // Taxable Value column — either a label ('Actual Commission') or a right-aligned bold number
    box(X.tv,  y, C.tv,  DR_H);
    if (r.tvLabel) {
      ct(r.tvLabel, X.tv, y, C.tv, DR_H, { size: 7, align: 'left' });
    } else if (r.tv) {
      ct(r.tv, X.tv, y, C.tv, DR_H, { size: 7, align: 'right', bold: true });
    }

    // CGST Rate / Amount
    box(X.cgR, y, C.cgR, DR_H); ct(r.cgR, X.cgR, y, C.cgR, DR_H, { size: 7, align: 'center' });
    box(X.cgA, y, C.cgA, DR_H); ct(r.cgA, X.cgA, y, C.cgA, DR_H, { size: 7, align: 'right', bold: !!r.cgA });

    // SGST Rate / Amount
    box(X.sgR, y, C.sgR, DR_H); ct(r.sgR, X.sgR, y, C.sgR, DR_H, { size: 7, align: 'center' });
    box(X.sgA, y, C.sgA, DR_H); ct(r.sgA, X.sgA, y, C.sgA, DR_H, { size: 7, align: 'right', bold: !!r.sgA });

    // IGST Rate / Amount
    box(X.igR, y, C.igR, DR_H); ct(r.igR, X.igR, y, C.igR, DR_H, { size: 7, align: 'center' });
    box(X.igA, y, C.igA, DR_H); ct(r.igA, X.igA, y, C.igA, DR_H, { size: 7, align: 'right', bold: !!r.igA });

    y += DR_H;
  }

  // ── 4c. Total row ────────────────────────────────────────────────────────

  const TOT_H = 15;
  const spanW = C.sr + C.ds + C.hs;   // "Total" spans first 3 columns

  box(X.sr,  y, spanW, TOT_H);
  ct('Total', X.sr, y, spanW, TOT_H, { bold: true, size: 8, align: 'left' });

  box(X.tv,  y, C.tv,  TOT_H);
  ct(f2(txVal), X.tv, y, C.tv, TOT_H, { bold: true, size: 8, align: 'right' });

  box(X.cgR, y, C.cgR, TOT_H);                              // Rate — empty
  box(X.cgA, y, C.cgA, TOT_H);
  ct(f2(cgstA), X.cgA, y, C.cgA, TOT_H, { bold: true, size: 8, align: 'right' });

  box(X.sgR, y, C.sgR, TOT_H);                              // Rate — empty
  box(X.sgA, y, C.sgA, TOT_H);
  ct(f2(sgstA), X.sgA, y, C.sgA, TOT_H, { bold: true, size: 8, align: 'right' });

  box(X.igR, y, C.igR, TOT_H);                              // Rate — empty
  box(X.igA, y, C.igA, TOT_H);
  ct(f2(igstA), X.igA, y, C.igA, TOT_H, { bold: true, size: 8, align: 'center' });

  y += TOT_H;

  // ── 4d. Total Invoice Value (In Figures) ─────────────────────────────────

  const FIG_H     = 15;
  const figLabelW = W - C.igA;

  box(ML,     y, figLabelW, FIG_H);
  ct('Total Invoice Value (In Figures)', ML, y, figLabelW, FIG_H, { size: 7.5 });

  box(X.igA,  y, C.igA, FIG_H);
  ct(f2(Number(invoice.totalAmount)), X.igA, y, C.igA, FIG_H, { size: 7.5, align: 'right' });

  y += FIG_H;

  // ── 4e. Total Invoice Value (In Words) ───────────────────────────────────

  const WORDS_H = 15;
  box(ML, y, W, WORDS_H);
  ct(
    `Total Invoice Value (In Words) : ${invoice.totalInWords}`,
    ML, y, W, WORDS_H,
    { size: 7.5 }
  );
  y += WORDS_H;

  // ── 5. Signature box ─────────────────────────────────────────────────────

  const SIG_H  = 52;
  const SIG_W  = W / 2;     // right half of the page

  // Left half — blank (could hold notes/bank details in the future)
  box(ML, y, SIG_W, SIG_H);

  // Right half — authorised signatory block
  box(ML + SIG_W, y, SIG_W, SIG_H);

  // Signature line (drawn 20 pts above the bottom of the box)
  const sigLineY = y + SIG_H - 22;
  doc.moveTo(ML + SIG_W + 20, sigLineY)
     .lineTo(ML + W - 20, sigLineY)
     .stroke('#000000');

  // Label
  ct(
    'Authorised Signatory',
    ML + SIG_W, sigLineY + 4, SIG_W, 14,
    { size: 7.5, align: 'center' }
  );
}

module.exports = { generateInvoicePdf };
