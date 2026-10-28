require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Opportunity = require('../models/Opportunity');

async function normalizeSampleListings() {
  const cow = await Product.findOneAndUpdate(
    { name: 'Cow', category: 'livestock', unit: 'kg', price: 33999.98 },
    {
      $set: {
        unit: 'piece',
        description: 'Live cattle offered by head. Confirm the animal details and final price directly with the seller.'
      }
    },
    { new: true }
  );

  const land = await Opportunity.findOneAndUpdate(
    {
      type: 'land',
      intent: 'rent',
      county: 'Narok',
      title: { $in: ['40', '40 acres of farmland for rent in Narok'] }
    },
    {
      $set: {
        title: '40 acres of farmland for rent in Narok',
        description: '40-acre farmland available for rent in Narok County at KES 10,000 per season per acre (KES 400,000 per season for all 40 acres). Contact the owner to confirm access, terms, and availability.',
        price: 10000,
        priceUnit: 'per season per acre'
      }
    },
    { new: true }
  );

  console.log(JSON.stringify({
    cow: cow ? { id: cow._id, unit: cow.unit, price: cow.price, quantity: cow.quantity } : 'No matching sample listing; unchanged.',
    land: land ? { id: land._id, title: land.title, price: land.price, priceUnit: land.priceUnit } : 'No matching Narok listing; unchanged.'
  }, null, 2));
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmers_app')
  .then(normalizeSampleListings)
  .then(() => mongoose.disconnect())
  .catch(async error => {
    console.error('Could not normalize sample listings:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
