const mongoose = require('mongoose');

async function createIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/farmers_app');
    console.log('Connected to MongoDB');

    // User indexes
    await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.collection('users').createIndex({ phone: 1 });
    await mongoose.connection.collection('users').createIndex({ location: 1 });
    
    // Product indexes
    await mongoose.connection.collection('products').createIndex({ name: 'text', description: 'text' });
    await mongoose.connection.collection('products').createIndex({ category: 1 });
    await mongoose.connection.collection('products').createIndex({ seller: 1 });
    await mongoose.connection.collection('products').createIndex({ status: 1 });
    await mongoose.connection.collection('products').createIndex({ price: 1 });
    
    // Order indexes
    await mongoose.connection.collection('orders').createIndex({ buyer: 1 });
    await mongoose.connection.collection('orders').createIndex({ seller: 1 });
    await mongoose.connection.collection('orders').createIndex({ status: 1 });
    await mongoose.connection.collection('orders').createIndex({ createdAt: -1 });
    
    // Post indexes
    await mongoose.connection.collection('posts').createIndex({ author: 1 });
    await mongoose.connection.collection('posts').createIndex({ createdAt: -1 });
    
    // Message indexes
    await mongoose.connection.collection('messages').createIndex({ sender: 1, recipient: 1 });
    await mongoose.connection.collection('messages').createIndex({ createdAt: -1 });
    
    console.log('✅ All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
