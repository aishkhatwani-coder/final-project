const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. ADMIN LOGIN (Email & Password)
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ error: 'Access denied: Not an authorized admin' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secretkey123',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: { name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login error' });
  }
};

// 2. CLIENT: SEND OTP TO PHONE
exports.sendClientOTP = async (req, res) => {
  const { phone, email, name } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // 6-digit OTP generate karein
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({
        name: name || 'Valued Client',
        email: email || `${phone}@interiorstudio.temp`,
        phone,
        role: 'client'
      });
    }

    user.otp = generatedOtp;
    user.otpExpires = otpExpires;
    await user.save();

    // NOTE: Agar Fast2SMS ya Twilio use kar rahe hain toh yahan SMS bheja jayega
    // Development/Testing purpose ke liye hum OTP response / console me print karenge:
    console.log(`[SMS Gateway] OTP sent to ${phone}: ${generatedOtp}`);

    res.json({
      success: true,
      message: 'OTP sent to mobile phone successfully!',
      // Testing ke liye pass kar rahe hain; production me SMS API send karegi:
      debugOtp: generatedOtp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// 3. CLIENT: VERIFY OTP & PROCEED TO PAYMENT
exports.verifyClientOTP = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const user = await User.findOne({ phone });

    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // OTP consume hone ke baad clear kar dein
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, phone: user.phone },
      process.env.JWT_SECRET || 'secretkey123',
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      message: 'Phone verified! Proceed to payment.',
      token,
      user: { name: user.name, phone: user.phone, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'OTP verification failed' });
  }
};