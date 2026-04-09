const mongoose = require("mongoose");

const ROLES = ["admin", "reviewer", "analyst"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: [2,   "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    password: {
      type:     String,
      required: true,
      select:   false,
    },
    role: {
      type:    String,
      enum:    { values: ROLES, message: "Role must be one of: admin, reviewer, analyst" },
      default: "reviewer",
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    createdBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },
    verificationToken: {
      type:   String,
      select: false,
    },
    lastLogin: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);