const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

mongoose.connect('mongodb://localhost:27017/farmers_app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

async function createSampleProducts() {
  try {
    // Check if products already exist
    const count = await Product.countDocuments();
    console.log(`Current products in database: ${count}`);

    if (count > 0) {
      console.log('Products already exist. Skipping creation.');
      process.exit(0);
    }

    // Find or create a sample seller
    let seller = await User.findOne({ role: 'seller' });
    if (!seller) {
      seller = await User.findOne();
      if (!seller) {
        console.log('No users found. Please create a user first.');
        process.exit(1);
      }
    }

    const sampleProducts = [
      {
        name: 'Fresh Tomatoes',
        description: 'Organic red tomatoes, freshly harvested',
        category: 'Vegetables',
        price: 150,
        unit: 'kg',
        quantity: 500,
        location: 'Nairobi',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'],
        featured: true,
        rating: 4.5,
        reviewCount: 12
      },
      {
        name: 'Sweet Corn',
        description: 'Fresh yellow corn, perfect for boiling or roasting',
        category: 'Vegetables',
        price: 80,
        unit: 'dozen',
        quantity: 200,
        location: 'Nakuru',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400'],
        featured: true,
        rating: 4.8,
        reviewCount: 8
      },
      {
        name: 'Brown Eggs',
        description: 'Free-range chicken eggs, high quality',
        category: 'Poultry',
        price: 400,
        unit: 'tray',
        quantity: 100,
        location: 'Kiambu',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400'],
        rating: 4.7,
        reviewCount: 15
      },
      {
        name: 'Fresh Milk',
        description: 'Pure cow milk, delivered daily',
        category: 'Dairy',
        price: 60,
        unit: 'liter',
        quantity: 300,
        location: 'Eldoret',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'],
        featured: true,
        rating: 4.9,
        reviewCount: 25
      },
      {
        name: 'Cabbage',
        description: 'Fresh green cabbage, locally grown',
        category: 'Vegetables',
        price: 50,
        unit: 'piece',
        quantity: 150,
        location: 'Meru',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400'],
        rating: 4.3,
        reviewCount: 6
      },
      {
        name: 'Carrots',
        description: 'Orange carrots, rich in vitamins',
        category: 'Vegetables',
        price: 120,
        unit: 'kg',
        quantity: 250,
        location: 'Nyeri',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400'],
        rating: 4.6,
        reviewCount: 10
      },
      {
        name: 'Potatoes',
        description: 'High quality potatoes for cooking',
        category: 'Vegetables',
        price: 70,
        unit: 'kg',
        quantity: 600,
        location: 'Nyandarua',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400'],
        featured: true,
        rating: 4.4,
        reviewCount: 18
      },
      {
        name: 'Mangoes',
        description: 'Sweet and juicy mangoes',
        category: 'Fruits',
        price: 200,
        unit: 'kg',
        quantity: 180,
        location: 'Machakos',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1605664515896-3a3d2f66d142?w=400'],
        rating: 4.8,
        reviewCount: 14
      },
      {
        name: 'Bananas',
        description: 'Ripe yellow bananas, ready to eat',
        category: 'Fruits',
        price: 100,
        unit: 'bunch',
        quantity: 220,
        location: 'Kisii',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400'],
        rating: 4.5,
        reviewCount: 11
      },
      {
        name: 'Avocados',
        description: 'Fresh Hass avocados, creamy texture',
        category: 'Fruits',
        price: 15,
        unit: 'piece',
        quantity: 400,
        location: 'Murang\'a',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400'],
        featured: true,
        rating: 4.9,
        reviewCount: 22
      },
      {
        name: 'Green Beans',
        description: 'Fresh green beans for export quality',
        category: 'Vegetables',
        price: 180,
        unit: 'kg',
        quantity: 120,
        location: 'Naivasha',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1607666247328-f37f33e87f1f?w=400'],
        rating: 4.6,
        reviewCount: 7
      },
      {
        name: 'Chicken',
        description: 'Free-range chicken, whole dressed',
        category: 'Poultry',
        price: 800,
        unit: 'piece',
        quantity: 50,
        location: 'Thika',
        seller: seller._id,
        images: ['https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400'],
        rating: 4.7,
        reviewCount: 9
      }
    ];

    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Created ${products.length} sample products successfully!`);
    console.log('\nProducts created:');
    products.forEach(p => {
      console.log(`- ${p.name} (${p.category}) - KES ${p.price}/${p.unit}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating sample products:', error);
    process.exit(1);
  }
}

createSampleProducts();
