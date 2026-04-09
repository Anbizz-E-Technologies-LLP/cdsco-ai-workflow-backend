const crypto = require("crypto");
const bcrypt  = require("bcryptjs");
const User = require("../model/addUserModel");
const { generateTempPassword, generateVerificationToken, generateAccessToken } = require("../middleware/generateAccessToken");
const { sendWelcomeEmail } = require("../utils/sendEmail");


const createUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body; // ← add password

    // ── 1. Validation ──────────────────────────────────────────────────────
    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, message: "Name, email, role and password are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const allowedRoles = ["admin", "reviewer", "analyst"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be one of: admin, reviewer, analyst." });
    }

    // ── 2. Duplicate check ─────────────────────────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists." });
    }

    // ── 3. Hash the admin-provided password ────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12); // ← use password from body

    // ── 4. Persist user ────────────────────────────────────────────────────
    const user = await User.create({
      name:            name.trim(),
      email:           email.toLowerCase().trim(),
      password:        hashedPassword,
      role,
      status:        true,
    });

    // ── 5. Access token ────────────────────────────────────────────────────
    const accessToken = generateAccessToken(user);

    // ── 6. Send email with the plain password admin typed ──────────────────
    try {
      await sendWelcomeEmail({ name, email, role, tempPassword: password }); // ← plain password
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message);
    }

    // ── 7. Respond ─────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: `User created successfully. Welcome email sent to ${email}.`,
      accessToken,
      user: {
        id:              user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        status:        user.status,
        createdAt:       user.createdAt,
      },
    });

  } catch (err) {
    console.error("createUser error:", err);
    return res.status(500).json({ success: false, message: "Failed to create user.", error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── 1. Validation ──────────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    // ── 2. Find user (include password field since select:false) ───────────
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // ── 3. Check active status ─────────────────────────────────────────────
    if (!user.status) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated. Contact your administrator." });
    }

    // ── 4. Compare password ────────────────────────────────────────────────
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // ── 5. Update last login ───────────────────────────────────────────────
    user.lastLogin = new Date();
    await user.save();

    // ── 6. Generate token ──────────────────────────────────────────────────
    const accessToken = generateAccessToken(user);

    // ── 7. Respond ─────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        status:  user.status,
        lastLogin: user.lastLogin,
      },
    });

  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ success: false, message: "Login failed.", error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10, search } = req.query;

    const filter = {};
    if (role)                  filter.role     = role;
    if (status !== undefined) filter.status = status === "true";
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      users,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch users.", error: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("createdBy", "name email");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch user.", error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, status } = req.body;

     if (role) {
      const allowedRoles = ["admin", "reviewer", "analyst"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: "Role must be one of: admin, reviewer, analyst." });
      }
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
      }
       const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email is already in use by another user." });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        ...(name                && { name:  name.trim() }),
        ...(email               && { email: email.toLowerCase().trim() }),
        ...(role                && { role }),
        ...(status !== undefined && { status }),
      },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        status: user.status,
      },
    });

  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ success: false, message: "Failed to update user.", error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // ❌ If ACTIVE → do not delete
    if (user.status === true) {
      return res.status(400).json({
        success: false,
        message: "Active user cannot be deleted"
      });
    }

    // ✅ If INACTIVE → delete permanently
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Inactive user deleted permanently",
      data: {
        userId: id
      }
    });

  } catch (err) {
    console.error("deleteUser error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser, login };