/**
 * import-ledger.js
 * Reads ledger-import.csv and POSTs it to POST /api/import/policies
 *
 * Usage:
 *   node scripts/import-ledger.js <TOKEN>
 *
 * Get the token by logging in first:
 *   POST http://localhost:5000/api/auth/login
 */

const fs = require('fs');
const path = require('path');
const https = require('http'); // change to https if needed

const CSV_PATH = path.join(__dirname, '..', 'ledger-import.csv');
const API_URL  = 'http://localhost:5000/api/import/policies';
const TOKEN    = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node scripts/import-ledger.js <JWT_TOKEN>');
  process.exit(1);
}

// ── Minimal CSV parser (no external dep) ─────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').map((l) => l.replace(/\r$/, ''));
  const headers = lines[0].split(',');

  return lines.slice(1).map((line, idx) => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i] !== undefined ? values[i].trim() : '';
    });
    return obj;
  });
}

// ── Type coercion: CSV is all strings; policy service expects numbers ─────────
function coerce(row) {
  const NUM = ['grossPremium', 'netPremium', 'gstPercent', 'commissionPercent', 'tdsPercent'];
  const out = { ...row };
  NUM.forEach((k) => {
    if (out[k] !== '' && out[k] !== undefined) out[k] = Number(out[k]);
  });
  // Remove blank optional fields so the service gets clean input
  Object.keys(out).forEach((k) => {
    if (out[k] === '') delete out[k];
  });
  return out;
}

async function run() {
  const csv  = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csv).map(coerce);

  console.log(`Read ${rows.length} rows from ledger-import.csv`);
  console.log('Posting to', API_URL, '...\n');

  // ── Chunk into batches of 50 ──────────────────────────────────────────────
  const BATCH = 50;
  let totalImported = 0, totalSkipped = 0, totalFailed = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;

    const body = JSON.stringify(batch);

    try {
      const result = await post(body);
      totalImported += result.imported;
      totalSkipped  += result.skipped;
      totalFailed   += result.failed;

      console.log(`Batch ${batchNum}: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`);

      if (result.errors?.length) {
        result.errors.forEach((e) =>
          console.log(`  ⚠  Row ${e.row} [${e.policyNumber}]: ${Array.isArray(e.reason) ? e.reason.join(' | ') : e.reason}`)
        );
      }
    } catch (err) {
      console.error(`Batch ${batchNum} request failed:`, err.message);
    }
  }

  console.log('\n── Import Summary ──────────────────────────────────────');
  console.log(`  Imported : ${totalImported}`);
  console.log(`  Skipped  : ${totalSkipped}  (duplicate policy numbers)`);
  console.log(`  Failed   : ${totalFailed}`);
  console.log('────────────────────────────────────────────────────────');
}

function post(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${TOKEN}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

run().catch(console.error);
