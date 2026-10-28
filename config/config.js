const dotenv = require('dotenv');
dotenv.config();
const path = require('path');

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/farmers_app'),
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Upload Configuration
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'public', 'uploads', 'products')),
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  
  // Email Configuration (for future use)
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  // SMS Configuration (for future use)
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_API_SECRET: process.env.SMS_API_SECRET,
  
  // Client URL
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
};
