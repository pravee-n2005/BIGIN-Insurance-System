/**
 * seed-masters.js
 *
 * Canonical master seed for Insurer + LeadMember.
 * Idempotent — safe to re-run.
 *
 * Naming follows the official BIGIN master list provided in Module 2.
 *
 * Run:  node prisma/seed-masters.js
 */

const prisma = require('../src/config/prisma');

// ─── Insurers (14 canonical names from official master) ──────────────────────

const CANONICAL_INSURERS = [
  { name: 'ICICI Prudential Life' },
  { name: 'ICICI Lombard General' },
  { name: 'Cholamandalam General' },
  { name: 'HDFC Ergo General' },
  { name: 'Tata AIA Life' },
  { name: 'Go Digit Life' },
  { name: 'Go Digit General' },
  { name: 'Pramerica Life' },
  { name: 'LIC' },
  { name: 'United India General' },
  { name: 'New India Assurance' },
  { name: 'Star Health Insurance' },
  { name: 'Care Health' },
  { name: 'NivaBupa Health' },
];

// Pre-canonical names previously seeded (kept inactive so historical
// Policy.insurerName strings can still be looked up if needed).
const LEGACY_INSURER_NAMES = [
  'ICICI Pru Life', 'ICICI Lombard', 'Cholamandalam', 'HDFC ERGO',
  'TATA AIA', 'Digit Life', 'Digit General', 'Pramerica',
  'United India Ins', 'New India Ins', 'STAR Health', 'Care health',
  'Niva Bupa',
  // The truly never-used ones from Sheet2 master:
  'HDFC Life', 'Bajaj Life', 'SBI Life', 'Galaxy Gen', 'Aditya Birla',
  'Future Generali', 'Kotak Gen Ins', 'Bajaj Gen', 'SBI Gen', 'Digit Health',
  'Max Life',  // listed in Sheet2 master, not in canonical-14
];

// ─── Lead Members — 3-tier official hierarchy ─────────────────────────────────

const CANONICAL_LEAD_MEMBERS = [
  // LEADERSHIP (3)
  { name: 'Ranjith',           leadType: 'LEADERSHIP' },
  { name: 'Sridhar',           leadType: 'LEADERSHIP' },
  { name: 'Ramesh',            leadType: 'LEADERSHIP' },

  // LEAD_EXECUTIVE (5)
  { name: 'Aruna Devi',        leadType: 'LEAD_EXECUTIVE' },
  { name: 'Pandiyan Direct',   leadType: 'LEAD_EXECUTIVE' },
  { name: 'Shalini Dinesh',    leadType: 'LEAD_EXECUTIVE' },
  { name: 'Oviya',             leadType: 'LEAD_EXECUTIVE' },
  { name: 'Namitha',           leadType: 'LEAD_EXECUTIVE' },

  // POSP (10)
  { name: 'Sugitha',                leadType: 'POSP' },
  { name: 'Ramaraj',                leadType: 'POSP' },
  { name: 'Vinoth Madhesh',         leadType: 'POSP' },
  { name: 'Baskaran Ramasamy',      leadType: 'POSP' },
  { name: 'Manimegalai',            leadType: 'POSP' },
  { name: 'Eshwaramurthy',          leadType: 'POSP' },
  { name: 'Shivamurthy',            leadType: 'POSP' },
  { name: 'Siva Ponamaravathy',     leadType: 'POSP' },
  { name: 'Anbu Sundaram',          leadType: 'POSP' },
  { name: 'Ranganathan Jackal',     leadType: 'POSP' },
];

// Names previously seeded that aren't in the canonical list — marked inactive
const LEGACY_LEAD_MEMBER_NAMES = [
  'Bhaskar', 'Ranga', 'Madhesh', 'Eashwar', 'Siva', 'Mahalakshmi',
  'Sivamurthy', 'Manikandan', 'Manimehalai', 'Syed',
  'Pandiyan', 'Shalini D', 'Geetha', 'Leadership', 'Others',
];

// ─── Run ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding masters (canonical lists)…\n');

  // 1. Canonical insurers — upsert active
  for (const ins of CANONICAL_INSURERS) {
    await prisma.insurer.upsert({
      where:  { name: ins.name },
      create: { name: ins.name, active: true },
      update: { active: true },
    });
  }
  console.log(`✓ Insurers (canonical):  ${CANONICAL_INSURERS.length} upserted active`);

  // 2. Legacy insurer names — mark inactive (don't delete; products still reference them)
  let deactivatedIns = 0;
  for (const name of LEGACY_INSURER_NAMES) {
    const r = await prisma.insurer.updateMany({
      where: { name },
      data:  { active: false },
    });
    deactivatedIns += r.count;
  }
  console.log(`✓ Insurers (legacy):     ${deactivatedIns} marked inactive`);

  // 3. Canonical lead members — upsert active with correct type
  for (const lm of CANONICAL_LEAD_MEMBERS) {
    await prisma.leadMember.upsert({
      where:  { name: lm.name },
      create: { name: lm.name, leadType: lm.leadType, active: true },
      update: { leadType: lm.leadType, active: true },
    });
  }
  console.log(`✓ LeadMembers (canon):   ${CANONICAL_LEAD_MEMBERS.length} upserted active`);

  // 4. Legacy lead member names — mark inactive
  let deactivatedLm = 0;
  for (const name of LEGACY_LEAD_MEMBER_NAMES) {
    const r = await prisma.leadMember.updateMany({
      where: { name },
      data:  { active: false },
    });
    deactivatedLm += r.count;
  }
  console.log(`✓ LeadMembers (legacy):  ${deactivatedLm} marked inactive\n`);

  console.log('Master seed complete.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
