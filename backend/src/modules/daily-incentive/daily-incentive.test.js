const test = require('node:test');
const assert = require('node:assert');

const prisma = require('../../config/prisma');
const service = require('./daily-incentive.service');

let employeeId;
let adminUserId;
let createdEntryId;

test('setup — find a lead member and admin user', async () => {
  const employee = await prisma.leadMember.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  assert.ok(employee, 'expected at least one lead member to exist');
  assert.ok(admin, 'expected at least one admin user to exist');

  employeeId = employee.id;
  adminUserId = admin.id;
});

test('getSettings() returns a singleton row with required fields', async () => {
  const settings = await service.getSettings();

  assert.strictEqual(settings.id, 1);
  assert.ok('touchBasePoints' in settings);
  assert.ok('interestedPoints' in settings);
  assert.ok('lifeConversionPoints' in settings);
  assert.ok('healthConversionPoints' in settings);
  assert.ok('amountPerPoint' in settings);
});

test('updateSettings() persists life/health conversion point values', async () => {
  const settings = await service.updateSettings({
    touchBasePoints:        1,
    interestedPoints:       2,
    lifeConversionPoints:   5,
    healthConversionPoints: 3,
    amountPerPoint:         10,
  });

  assert.strictEqual(Number(settings.touchBasePoints), 1);
  assert.strictEqual(Number(settings.interestedPoints), 2);
  assert.strictEqual(Number(settings.lifeConversionPoints), 5);
  assert.strictEqual(Number(settings.healthConversionPoints), 3);
  assert.strictEqual(Number(settings.amountPerPoint), 10);
});

test('calcPointsAndAmount() — LIFE conversion uses lifeConversionPoints', async () => {
  const settings = await service.getSettings();

  const { points, amount } = service.calcPointsAndAmount(
    { touchBase: 2, interested: 1, conversionType: 'LIFE' },
    settings
  );

  // points = (2*1) + (1*2) + 5 = 9
  assert.strictEqual(points, 9);
  // amount = 9 * 10 = 90
  assert.strictEqual(amount, 90);
});

test('calcPointsAndAmount() — HEALTH conversion uses healthConversionPoints', async () => {
  const settings = await service.getSettings();

  const { points, amount } = service.calcPointsAndAmount(
    { touchBase: 2, interested: 1, conversionType: 'HEALTH' },
    settings
  );

  // points = (2*1) + (1*2) + 3 = 7
  assert.strictEqual(points, 7);
  // amount = 7 * 10 = 70
  assert.strictEqual(amount, 70);
});

test('create() stores frozen calculatedPoints/calculatedAmount for LIFE conversion', async () => {
  const entry = await service.create({
    employeeId,
    date: '2026-06-01',
    totalCalls: 50,
    touchBase: 2,
    interested: 1,
    conversionType: 'LIFE',
    remarks: 'test entry',
  }, adminUserId);

  createdEntryId = entry.id;

  // points = (2*1) + (1*2) + 5 = 9
  assert.strictEqual(Number(entry.calculatedPoints), 9);
  assert.strictEqual(Number(entry.calculatedAmount), 90);
  assert.strictEqual(entry.conversionType, 'LIFE');
  assert.strictEqual(entry.employee.id, employeeId);
});

test('changing settings after create does not retroactively alter the stored entry', async () => {
  await service.updateSettings({ amountPerPoint: 100 });

  const entry = await service.getById(createdEntryId);
  assert.strictEqual(Number(entry.calculatedAmount), 90);

  // restore for subsequent tests
  await service.updateSettings({ amountPerPoint: 10 });
});

test('list() returns the created entry', async () => {
  const { entries, total } = await service.list({ employeeId, page: 1, limit: 20 });

  assert.ok(total >= 1);
  assert.ok(entries.some((e) => e.id === createdEntryId));
});

test('update() recomputes calculated fields using current settings', async () => {
  const updated = await service.update(createdEntryId, { touchBase: 3 }, adminUserId);

  // points = (3*1) + (1*2) + 5 = 10
  assert.strictEqual(Number(updated.calculatedPoints), 10);
  assert.strictEqual(Number(updated.calculatedAmount), 100);
});

test('weeklyReport() aggregates totals for the date range', async () => {
  const report = await service.weeklyReport({
    weekStart: '2026-06-01',
    weekEnd: '2026-06-07',
    employeeId,
  });

  assert.ok(report.employees.length >= 1);
  const row = report.employees.find((r) => r.employeeId === employeeId);
  assert.ok(row);
  assert.ok(row.totalPoints >= 10);
  assert.ok(row.totalIncentiveAmount >= 100);
  assert.ok('lifeConversions' in row);
  assert.ok('healthConversions' in row);
});

test('weeklyReport() without employeeId aggregates across all employees', async () => {
  const report = await service.weeklyReport({
    weekStart: '2026-06-01',
    weekEnd: '2026-06-07',
  });

  const row = report.employees.find((r) => r.employeeId === employeeId);
  assert.ok(row, 'expected the test employee to appear in the unfiltered report');
  assert.ok(row.totalPoints >= 10);
  assert.ok(report.overall.totalPoints >= row.totalPoints);
});

test('cleanup — remove created entry and reset settings', async () => {
  await service.remove(createdEntryId);
  await service.updateSettings({
    touchBasePoints:        0,
    interestedPoints:       0,
    lifeConversionPoints:   0,
    healthConversionPoints: 0,
    amountPerPoint:         0,
  });

  const entry = await service.getById(createdEntryId);
  assert.strictEqual(entry, null);
});

test('daily incentive — cleanup', async () => {
  await prisma.$disconnect();
});
