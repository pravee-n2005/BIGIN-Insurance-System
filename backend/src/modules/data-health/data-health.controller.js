const service = require('./data-health.service');

const getOverview = async (req, res, next) => {
  try {
    const data = await service.overview();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview };
