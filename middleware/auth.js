const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Authorization denied.' });
  }

  const token = authHeader.split(' ')[1]; // after "Bearer"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user data to request object
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to allow only admins
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
};
