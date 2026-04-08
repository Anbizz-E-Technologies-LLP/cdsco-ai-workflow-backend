// const User = require("../model/userModel");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// // 🔐 Generate Token
// const generateToken = (user) => {
//   return jwt.sign(
//     { id: user._id, email: user.email },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// };



// // ✅ LOGIN
// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check user
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid email" });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Wrong password" });
//     }

//     const token = generateToken(user);

//     res.json({
//       user,
//       token,
//     });

//   } catch (error) {
//     console.error("Login Error:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// // ✅ Export
// module.exports = {  login };