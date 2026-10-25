const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function () {
      // Admin ke liye password mandatory hai; OTP clients bina password ke login kar sakte hain
      return this.role === 'admin';
    }
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client'
  },
  // Real-time phone OTP support
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);