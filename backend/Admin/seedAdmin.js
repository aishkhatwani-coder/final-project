const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const rawPassword = process.env.ADMIN_PASSWORD;
    if (!mongoUri || !adminEmail || !rawPassword || rawPassword.length < 12) {
      throw new Error('Set MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters).');
    }
    await mongoose.connect(mongoUri);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await User.create({
      name: process.env.ADMIN_NAME || 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      phone: process.env.ADMIN_PHONE || undefined,
      role: 'admin'
    });

    console.log(`Admin account created for ${adminEmail}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

seedAdmin();