const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('../models/Admin');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const email = process.env.ADMIN_EMAIL || 'admin@farmersapp.com';
        const password = process.env.ADMIN_PASSWORD;
        const name = 'Admin User';
        if (!password || password.length < 10) {
            console.error('Set ADMIN_PASSWORD (min 10 chars) in the environment first.');
            process.exit(1);
        }
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists!');
            console.log('Email:', email);
            process.exit(0);
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create admin
        const admin = new Admin({
            email,
            password: hashedPassword,
            name,
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
        
        await admin.save();
        
        console.log('Admin created successfully!');
        console.log('Email:', email);
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
