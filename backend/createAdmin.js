const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User model require karein (ya direct schema define)
const User = require('./models/User');

const createAdminUser = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const plainPassword = process.env.ADMIN_PASSWORD;
    if (!mongoUri || !email || !plainPassword || plainPassword.length < 12) {
      throw new Error('Set MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters).');
    }

    await mongoose.connect(mongoUri);
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      throw new Error(`An account with ${email} already exists.`);
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await User.create({
      name: process.env.ADMIN_NAME || 'Studio Director Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      phone: process.env.ADMIN_PHONE || undefined
    });

    console.log(`Admin account created for ${email}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdminUser();