const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const verifyAccessToken = (token) => {
  const secret = process.env.JWT_SECRET;  

  if (!secret) throw new Error("JWT_SECRET is missing");

  return jwt.verify(token, secret);
};

const generateTempPassword = () => {
  const words   = ["Blue", "Red", "Sky", "Sun", "Moon", "Star", "Fire", "Wind", "Rock", "Gold"];
  const symbols = ["@", "#", "!", "$", "%"];
  const word    = words[Math.floor(Math.random() * words.length)];
  const symbol  = symbols[Math.floor(Math.random() * symbols.length)];
  const number  = Math.floor(1000 + Math.random() * 9000);
  return `${word}${symbol}${number}`;
};

const generateVerificationToken = () => {
  const rawToken    = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,   
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Authorization header missing" });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, message: "Invalid authorization format" });
    }

    const token = parts[1];
    if (!token || token.trim() === "" || token.includes("{") || token.includes("}")) {
      return res.status(401).json({ success: false, message: "Malformed JWT token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 

    req.user = decoded;
    next();
  } catch (err) {
    
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  verifyToken,
  generateVerificationToken,
  generateTempPassword
};