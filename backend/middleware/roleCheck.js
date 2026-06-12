const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = (req.user && req.user.role || '').toLowerCase();
    if (allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
};

module.exports = roleCheck;
