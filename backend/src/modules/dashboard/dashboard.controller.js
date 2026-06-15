const service = require('./dashboard.service');

const getStats = async (req, res, next) => {
  try {
    const stats = await service.getStats(req.query.fy);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
