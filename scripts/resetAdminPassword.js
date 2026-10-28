const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('../models/Admin');

async function resetAdminPassword() {
  const mongoUri = process.env.MONGODB_URI;
  const email = (process.env.ADMIN_EMAIL || 'admin@farmersapp.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Set it in .env or the environment first.');
  }
  if (!password || password.length < 10) {
    throw new Error('Set ADMIN_PASSWORD to a password with at least 10 characters.');
  }

  await mongoose.connect(mongoUri);
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error(`No admin account found for ${email}. Check ADMIN_EMAIL or create the account first.`);
  }

  admin.password = await bcrypt.hash(password, 12);
  await admin.save();
  console.log(`Admin password reset successfully for ${email}.`);
}

resetAdminPassword()
  .catch(error => {
    console.error(`Could not reset admin password: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
