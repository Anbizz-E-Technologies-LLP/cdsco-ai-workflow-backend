const crypto = require("crypto");
const bcrypt  = require("bcryptjs");
const User = require("../model/addUserModel");
const { generateAccessToken } = require("../middleware/generateAccessToken");
const { sendWelcomeEmail } = require("../utils/sendEmail");


const generateTempPassword = () => crypto.randomBytes(8).toString("hex");


const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists." });
    }

    const tempPassword              = generateTempPassword();
    const { rawToken, hashedToken } = generateAccessToken();

    // ── Hash the temp password before saving ──────────────────────────────────
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword, 
      role,
      createdBy: req.user._id,
      verificationToken: hashedToken,
      isEmailVerified: false,
      isActive: true,
    });

    // Send plain tempPassword in email so user can login with it
    await sendWelcomeEmail({ name, email, role, verificationToken: rawToken, tempPassword });

    return res.status(201).json({
      success: true,
      message: `User created successfully. Welcome email sent to ${email}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to create user.", error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 10, search } = req.query;

    const filter = {};
    if (role)                  filter.role     = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
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
    const { name, role, isActive } = req.body;

    if (req.params.id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({ success: true, message: "User updated successfully.", user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update user.", error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({ success: true, message: "User deactivated successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to deactivate user.", error: err.message });
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser };