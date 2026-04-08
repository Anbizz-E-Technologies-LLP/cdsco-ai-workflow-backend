const User = require("../models/User");
const { verifyAccessToken } = require("../middleware/generateAccessToken");
 
const protect = async (req, res, next) => {
  try {
     const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }
 
    const token = authHeader.split(" ")[1];
 
     let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired. Please login again." });
      }
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
 
     const user = await User.findById(decoded.id).select("+isActive");
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated." });
    }
 
     req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Authentication error.", error: err.message });
  }
};
