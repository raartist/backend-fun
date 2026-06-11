const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  //   const token = bearer_token && bearer_token.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token required!",
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(decoded, "decoded token");
    req.user = decoded;
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: "Invalid token!",
    });
  }
  console.log("authorized user");
  next();
}

module.exports = authMiddleware;
