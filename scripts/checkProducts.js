const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User'); // Required for populate

mongoose.connect('mongodb://localhost:27017/farmers_app')
    .then(async () => {
        console.log('=== CHECKING DATABASE ===\n');
        
        const products = await Product.find().populate('seller', 'name phone');
        console.log(`Total products: ${products.length}\n`);
        
        if (products.length === 0) {
            console.log('❌ NO PRODUCTS FOUND IN DATABASE!');
            console.log('Run: node scripts/createSampleProducts.js');
        } else {
            console.log('Products:');
            products.forEach((p, i) => {
                console.log(`\n${i + 1}. ${p.name}`);
                console.log(`   Category: ${p.category}`);
                console.log(`   Price: KSH ${p.price}/${p.unit}`);
                console.log(`   Quantity: ${p.quantity}`);
                console.log(`   Status: ${p.status}`);
                console.log(`   Seller: ${p.seller?.name || 'Unknown'}`);
                console.log(`   Location: ${p.location}`);
            });
        }
        
        await mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
