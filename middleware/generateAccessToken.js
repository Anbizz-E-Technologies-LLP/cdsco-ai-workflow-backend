const jwt = require('jsonwebtoken');

const verifyAccessToken = (token) => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is missing");

  return jwt.verify(token, secret);
};

const generateAccessToken = (user) => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is missing");

  const payload = {
    username: user.username,
    status: user.status,
    role: user.role,
    permissions: getPermissions(user.role)
  };

  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Authorization header missing" });
    }

    // Expecting: Bearer <token>
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, message: "Invalid authorization format" });
    }

    const token = parts[1];

    if (!token || token.trim() === "" || token.includes("{") || token.includes("}")) {
      return res.status(401).json({ success: false, message: "Malformed JWT token" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  verifyToken,
};
