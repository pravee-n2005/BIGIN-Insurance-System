const service = require('./renewal.service');

const getWorklist = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const data = await service.worklist({ month, year });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getWorklist };
