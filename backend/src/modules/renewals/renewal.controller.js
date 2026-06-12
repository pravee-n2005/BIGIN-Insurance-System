const service = require('./renewal.service');

const getWorklist = async (req, res, next) => {
  try {
    const data = await service.worklist();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getWorklist };
