/**
 * seed-products.js
 *
 * Re-points all Product rows to their CANONICAL Insurer row,
 * then upserts a clean canonical product catalogue.
 *
 * Why this exists:
 * The Phase 1 product seed used legacy insurer names ("ICICI Lombard",
 * "STAR Health"). When the canonical seed renamed insurers, it created
 * new insurer rows ("ICICI Lombard General", "Star Health Insurance")
 * and left products linked to the old, now-inactive rows.
 *
 * This script:
 *  1. Maps each legacy insurer name → canonical insurer name
 *  2. For every legacy product, upserts the same product under the
 *     canonical insurer
 *  3. Deletes the legacy product rows (cascade-safe — they aren't
 *     referenced from Policy)
 *
 * Idempotent. Safe to re-run.
 *
 * Run:  node prisma/seed-products.js
 */

const prisma = require('../src/config/prisma');

// ─── Legacy → Canonical insurer name map ──────────────────────────────────────

const LEGACY_TO_CANONICAL = {
  'ICICI Lombard':     'ICICI Lombard General',
  'ICICI Pru Life':    'ICICI Prudential Life',
  'STAR Health':       'Star Health Insurance',
  'HDFC ERGO':         'HDFC Ergo General',
  'Care health':       'Care Health',
  'United India Ins':  'United India General',
  'New India Ins':     'New India Assurance',
  'Cholamandalam':     'Cholamandalam General',
  'TATA AIA':          'Tata AIA Life',
  'Digit General':     'Go Digit General',
  'Digit Life':        'Go Digit Life',
  'Max Life':          null,   // not in canonical-14 — orphans go away
};

async function migrateProducts() {
  let moved = 0;
  let dropped = 0;
  const summary = [];

  for (const [legacyName, canonicalName] of Object.entries(LEGACY_TO_CANONICAL)) {
    const legacy = await prisma.insurer.findUnique({ where: { name: legacyName } });
    if (!legacy) continue;

    const legacyProducts = await prisma.product.findMany({ where: { insurerId: legacy.id } });
    if (legacyProducts.length === 0) continue;

    if (canonicalName === null) {
      // No canonical insurer — drop these products
      const r = await prisma.product.deleteMany({ where: { insurerId: legacy.id } });
      dropped += r.count;
      summary.push(`  ${legacyName.padEnd(28)} → (dropped ${r.count})`);
      continue;
    }

    const canonical = await prisma.insurer.findUnique({ where: { name: canonicalName } });
    if (!canonical) {
      console.warn(`  ⚠  Canonical insurer "${canonicalName}" not found — skipping ${legacyName}`);
      continue;
    }

    for (const product of legacyProducts) {
      // Upsert under canonical (composite unique on insurerId + name)
      await prisma.product.upsert({
        where:  { insurerId_name: { insurerId: canonical.id, name: product.name } },
        create: { insurerId: canonical.id, name: product.name, active: true },
        update: { active: true },
      });
      // Drop the legacy row
      await prisma.product.delete({ where: { id: product.id } });
      moved++;
    }
    summary.push(`  ${legacyName.padEnd(28)} → ${canonicalName.padEnd(28)} (${legacyProducts.length} products)`);
  }

  return { moved, dropped, summary };
}

async function seed() {
  console.log('Migrating products to canonical insurers…\n');
  const { moved, dropped, summary } = await migrateProducts();
  summary.forEach((s) => console.log(s));
  console.log(`\n✓ Migrated: ${moved}`);
  if (dropped > 0) console.log(`✓ Dropped:  ${dropped}`);

  console.log('\n━━━ Final state ━━━');
  const counts = await prisma.insurer.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  counts.forEach((i) => console.log(`  ${i.name.padEnd(28)} → ${i._count.products} products`));
  console.log(`\nTotal products: ${await prisma.product.count()}`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
