/**
 * seed-invoice-profiles.js
 *
 * Seed the 6 InsurerInvoiceProfile rows extracted from real GST invoices
 * (United India, Go Digit General, HDFC Ergo, Star Health, Tata AIA Life,
 * ICICI Lombard General).
 *
 * Idempotent — safe to re-run.
 *
 * Run:  node prisma/seed-invoice-profiles.js
 */

const prisma = require('../src/config/prisma');

const PROFILES = [
  {
    insurerName: 'United India General',
    recipientHeader: 'United India Insurance Company Limited',
    legalName: 'The United India Insurance Company Limited',
    billingAddress: '24, Whites Road, Chennai 600 014',
    state: 'Tamil Nadu',
    stateCode: '033',
    gstin: '33AAACU5552C1ZQ',
  },
  {
    insurerName: 'Go Digit General',
    recipientHeader: 'GO DIGIT',
    legalName: 'Go Digit',
    billingAddress: 'Raj Kamal Pinnacle 3rd Floor, New No.2 Old No.145 Nungambakkam High Road, Thousand Lights West Nungambakkam, Chennai 600 034',
    state: 'Tamil Nadu',
    stateCode: '033',
    gstin: '33AACCO4128Q1Z7',
  },
  {
    insurerName: 'HDFC Ergo General',
    recipientHeader: 'HDFC Ergo',
    legalName: 'HDFC Ergo General Insurance Company Limited',
    billingAddress: 'New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018',
    state: 'Tamil Nadu',
    stateCode: '033',
    gstin: '33AABCL5045N1ZF',
  },
  {
    insurerName: 'Star Health Insurance',
    recipientHeader: 'STAR Health',
    legalName: 'Star Health Allied Insurance Co Ltd',
    billingAddress: 'New Tank Street, No.1 Valluvar Kottam High Road, Nungambakkam, Chennai 600 035',
    state: 'Tamil Nadu',
    stateCode: '033',
    gstin: '33AAJCS4517L1Z5',
  },
  {
    insurerName: 'Tata AIA Life',
    recipientHeader: 'Tata AIA Life Insurance Company Limited',
    legalName: 'Tata AIA Life Insurance Company Limited',
    billingAddress: '4th Floor Bascon Maeru Towers, No. 82,84 & 86 Kodambakkam High Road, Tirumurthi Nagar, Nungambakkam Chennai 600 034',
    state: 'Tamil Nadu',
    stateCode: '033',
    gstin: '33AABCT3784C1ZK',
  },
  {
    insurerName: 'ICICI Lombard General',
    recipientHeader: 'ICICI LOMBARD',
    legalName: 'ICICI Lombard GICL',
    billingAddress: 'Third Floor, Unit No.684-690, Seethakathi Business Centre, Anna Salai, Thousand Lights',
    state: 'Tamil Nadu',
    stateCode: '033',
    gstin: '33AAACI7904G2ZT',
  },
];

async function seed() {
  console.log('Seeding insurer invoice profiles…\n');

  let upserted = 0;
  let missing  = [];

  for (const p of PROFILES) {
    const insurer = await prisma.insurer.findUnique({ where: { name: p.insurerName } });
    if (!insurer) {
      missing.push(p.insurerName);
      continue;
    }

    const { insurerName, ...data } = p;
    await prisma.insurerInvoiceProfile.upsert({
      where:  { insurerId: insurer.id },
      create: { ...data, insurerId: insurer.id, active: true },
      update: { ...data, active: true },
    });
    upserted++;
    console.log(`  ✓ ${p.insurerName.padEnd(28)} ${p.gstin}`);
  }

  console.log(`\n✓ Profiles upserted: ${upserted}`);
  if (missing.length) {
    console.warn(`⚠  Insurers not found (skipped): ${missing.join(', ')}`);
  }
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
