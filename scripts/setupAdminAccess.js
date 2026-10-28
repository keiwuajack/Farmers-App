const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('../models/Admin');

async function setupAdminAccess() {
  const mongoUri = process.env.MONGODB_URI;
  const email = (process.env.ADMIN_EMAIL || 'admin@farmersapp.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(24).toString('base64url');

  if (!mongoUri) throw new Error('MONGODB_URI is missing.');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must contain at least 10 characters.');

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  let admin = await Admin.findOne({ email });
  const isNewAdmin = !admin;

  if (!admin) {
    admin = new Admin({
      email,
      name: 'Admin User',
      role: 'admin',
      permissions: [
        'view_users',
        'manage_users',
        'view_products',
        'manage_products',
        'view_orders',
        'manage_orders',
        'view_analytics'
      ]
    });
  }

  admin.password = await bcrypt.hash(password, 12);
  await admin.save();

  console.log(`Admin account ${isNewAdmin ? 'created' : 'password reset'} successfully.`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

setupAdminAccess()
  .catch(error => {
    console.error(`Could not set up admin access: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
