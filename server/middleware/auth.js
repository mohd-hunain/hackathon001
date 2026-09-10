const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'farmgrid_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    // Attach user to request
    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        req.user = await User.findById(decoded.id).select('-password');
      } catch (dbErr) {
        req.user = null;
      }
    }

    if (!req.user) {
      req.user = { _id: decoded.id, id: decoded.id, role: decoded.role, email: decoded.email };
    }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, invalid token',
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'UNKNOWN'}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
