const prisma = require('../../config/prisma');

const PROFILE_SELECT = {
  id: true,
  insurerId: true,
  recipientHeader: true,
  legalName: true,
  billingAddress: true,
  state: true,
  stateCode: true,
  gstin: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  insurer: { select: { id: true, name: true } },
};

const list = ({ activeOnly = true } = {}) =>
  prisma.insurerInvoiceProfile.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { insurer: { name: 'asc' } },
    select: PROFILE_SELECT,
  });

const getById = (id) =>
  prisma.insurerInvoiceProfile.findUnique({
    where:  { id },
    select: PROFILE_SELECT,
  });

const getByInsurerId = (insurerId) =>
  prisma.insurerInvoiceProfile.findUnique({
    where:  { insurerId },
    select: PROFILE_SELECT,
  });

const create = (data) =>
  prisma.insurerInvoiceProfile.create({
    data: {
      insurerId:       data.insurerId,
      recipientHeader: data.recipientHeader.trim(),
      legalName:       data.legalName.trim(),
      billingAddress:  data.billingAddress.trim(),
      state:           data.state.trim(),
      stateCode:       data.stateCode.trim(),
      gstin:           data.gstin.trim().toUpperCase(),
      active:          data.active ?? true,
    },
    select: PROFILE_SELECT,
  });

const update = (id, data) =>
  prisma.insurerInvoiceProfile.update({
    where: { id },
    data: {
      ...(data.recipientHeader && { recipientHeader: data.recipientHeader.trim() }),
      ...(data.legalName       && { legalName:       data.legalName.trim() }),
      ...(data.billingAddress  && { billingAddress:  data.billingAddress.trim() }),
      ...(data.state           && { state:           data.state.trim() }),
      ...(data.stateCode       && { stateCode:       data.stateCode.trim() }),
      ...(data.gstin           && { gstin:           data.gstin.trim().toUpperCase() }),
      ...(data.active !== undefined && { active: data.active }),
    },
    select: PROFILE_SELECT,
  });

module.exports = { list, getById, getByInsurerId, create, update };
