const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "Token required!",
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: "Invalid token!",
    });
  }
  next();
}

module.exports = authMiddleware;
