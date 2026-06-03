const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admins only.' });
  }
  next();
};

const ownerOrAdmin = (req, res, next) => {
  if (!['ADMIN', 'OWNER'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  next();
};

module.exports = { adminOnly, ownerOrAdmin };
