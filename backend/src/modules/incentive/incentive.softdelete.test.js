const test = require('node:test');
const assert = require('node:assert');

const prisma = require('../../config/prisma');
const service = require('./incentive.service');

const TEST_MONTH = '2099-01';
const TEST_LEAD_MEMBER_NAME = '__TEST_SOFT_DELETE_INCENTIVE_EXECUTIVE__';

let leadMemberId;
let userId;
let incentiveId;

test('soft delete workflow — setup', async () => {
  const user = await prisma.user.findFirst();
  assert.ok(user, 'expected at least one user to exist in the database');
  userId = user.id;

  const leadMember = await prisma.leadMember.create({
    data: { name: TEST_LEAD_MEMBER_NAME, leadType: 'LEAD_EXECUTIVE', active: true },
  });
  leadMemberId = leadMember.id;
});

test('create() produces a non-deleted incentive visible in list()', async () => {
  const incentive = await service.create({ leadMemberId, month: TEST_MONTH, points: 100 }, userId);
  incentiveId = incentive.id;

  assert.strictEqual(incentive.isDeleted, false);
  assert.strictEqual(incentive.deletedAt, null);
  assert.strictEqual(incentive.deletedById, null);

  const { incentives } = await service.list({ leadMemberId });
  assert.ok(incentives.some((i) => i.id === incentiveId));
});

test('remove() soft-deletes the entry and stamps deletedAt/deletedBy', async () => {
  const deleted = await service.remove(incentiveId, userId);

  assert.ok(deleted);
  assert.strictEqual(deleted.isDeleted, true);
  assert.ok(deleted.deletedAt instanceof Date);
  assert.strictEqual(deleted.deletedById, userId);
});

test('remove() on an already-deleted entry returns null (idempotent)', async () => {
  const result = await service.remove(incentiveId, userId);
  assert.strictEqual(result, null);
});

test('soft-deleted entries are excluded from list(), getById(), and reports', async () => {
  const { incentives } = await service.list({ leadMemberId });
  assert.ok(!incentives.some((i) => i.id === incentiveId));

  const byId = await service.getById(incentiveId);
  assert.strictEqual(byId, null);

  const execReport = await service.executiveWiseReport({ leadMemberId });
  assert.ok(!execReport.some((row) => row.leadMemberId === leadMemberId));

  const monthReport = await service.monthWiseReport({ leadMemberId });
  assert.ok(!monthReport.some((row) => row.month === TEST_MONTH));
});

test('soft-deleted entries appear in listDeleted()', async () => {
  const { incentives } = await service.listDeleted({ leadMemberId });
  const found = incentives.find((i) => i.id === incentiveId);
  assert.ok(found, 'expected deleted incentive to appear in listDeleted()');
  assert.strictEqual(found.isDeleted, true);
  assert.strictEqual(found.deletedBy.id, userId);
});

test('restore() un-deletes the entry and clears deletion metadata', async () => {
  const restored = await service.restore(incentiveId);

  assert.ok(restored);
  assert.strictEqual(restored.isDeleted, false);
  assert.strictEqual(restored.deletedAt, null);
  assert.strictEqual(restored.deletedById, null);

  const { incentives } = await service.list({ leadMemberId });
  assert.ok(incentives.some((i) => i.id === incentiveId));

  const { incentives: deletedAfterRestore } = await service.listDeleted({ leadMemberId });
  assert.ok(!deletedAfterRestore.some((i) => i.id === incentiveId));
});

test('restore() on a non-deleted entry returns null', async () => {
  const result = await service.restore(incentiveId);
  assert.strictEqual(result, null);
});

test('soft delete workflow — cleanup', async () => {
  await prisma.incentive.deleteMany({ where: { leadMemberId } });
  await prisma.leadMember.delete({ where: { id: leadMemberId } });
  await prisma.$disconnect();
});
