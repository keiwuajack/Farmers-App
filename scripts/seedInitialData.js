const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const Post = require('../models/Post');
const Opportunity = require('../models/Opportunity');

function normalizePhoneNumber(phone) {
  if (!phone) return '';

  const cleaned = String(phone).replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';

  const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `+254${digits}`;
  if (/^254\d{9,12}$/.test(digits)) return `+${digits.slice(0, 12)}`;

  return `+${digits.replace(/^0+/, '')}`;
}

async function ensureBaseUsers() {
  const snapshot = {
    farmer: await User.findOne({ email: 'demo.farmer@farmersapp.local' }) || await User.findOne({ role: 'farmer' }),
    vet: await User.findOne({ email: 'demo.vet@farmersapp.local' }) || await User.findOne({ role: 'veterinarian' })
  };

  if (!snapshot.farmer) {
    const farmer = await User.create({
      name: 'Demo Farmer',
      email: 'demo.farmer@farmersapp.local',
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      role: 'farmer',
      location: 'Nairobi',
      phone: '+254712345678',
      farmSize: '5-10 acres',
      bio: 'Experienced maize and vegetable farmer in Nairobi County.'
    });
    snapshot.farmer = farmer;
  }

  if (!snapshot.vet) {
    const vet = await User.create({
      name: 'Alex Otuni',
      email: 'demo.vet@farmersapp.local',
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      role: 'veterinarian',
      location: 'Narok County',
      phone: '+254727345808',
      specialization: 'Livestock Health',
      bio: 'Livestock veterinarian supporting pastoralist and mixed-farming communities.'
    });
    snapshot.vet = vet;
  }

  const users = await User.find();
  for (const user of users) {
    const normalized = normalizePhoneNumber(user.phone);
    if (normalized && normalized !== user.phone) {
      await User.findByIdAndUpdate(user._id, { phone: normalized });
    }
  }

  return snapshot;
}

async function ensureSeedPosts(author) {
  const postCount = await Post.countDocuments();
  if (postCount >= 3) return;

  const samplePosts = [
    {
      author: author._id,
      title: 'Rainfall outlook for the next 7 days',
      content: 'Farmers in the western and Rift Valley regions should expect intermittent showers. Prepare drainage for low-lying plots and keep in mind market access delays during heavy rain.',
      category: 'weather',
      tags: ['rain', 'planning', 'weather'],
      comments: []
    },
    {
      author: author._id,
      title: 'Need advice on maize storage',
      content: 'I am seeing mould on stored maize after 2 weeks. Which treatments or storage methods are recommended for keeping grain dry and safe?',
      category: 'question',
      tags: ['maize', 'storage', 'advice'],
      comments: []
    },
    {
      author: author._id,
      title: 'Early morning market prep tip',
      content: 'Sort and grade produce before early-morning transport to improve both pricing and buyer confidence. Clean packaging and clear labeling matter, especially for tomatoes and leafy greens.',
      category: 'marketplace',
      tags: ['market', 'logistics', 'quality'],
      comments: []
    }
  ];

  await Post.insertMany(samplePosts.slice(0, 3 - postCount));
}

async function ensureSeedProducts(users) {
  const seller = users.vet || users.farmer;
  await Product.updateMany({ seller: null }, { $set: { seller: seller._id } });

  const existingCount = await Product.countDocuments();
  if (existingCount >= 3) return;

  const sampleProducts = [
    {
      seller: seller._id,
      name: 'Fresh Tomatoes',
      description: 'Freshly harvested tomatoes grown under irrigation for local markets and food service buyers.',
      category: 'vegetables',
      price: 150,
      unit: 'kg',
      quantity: 200,
      location: 'Nairobi',
      condition: 'fresh',
      isOrganic: true,
      isNegotiable: true,
      status: 'available',
      images: [],
      views: 0,
      likes: []
    },
    {
      seller: seller._id,
      name: 'Boma Rhodes Hay',
      description: 'Nutritious livestock hay for cattle and dairy animals, baled and stored under dry conditions.',
      category: 'other',
      price: 250,
      unit: 'kg',
      quantity: 1400,
      location: 'Narok',
      condition: 'fresh',
      isOrganic: false,
      isNegotiable: false,
      status: 'available',
      images: [],
      views: 0,
      likes: []
    },
    {
      seller: seller._id,
      name: 'Organic Maize Seed',
      description: 'High-yield hybrid maize seed recommended for medium to high rainfall zones in Kenya.',
      category: 'seeds',
      price: 500,
      unit: 'bag',
      quantity: 80,
      location: 'Nakuru',
      condition: 'new',
      isOrganic: true,
      isNegotiable: true,
      status: 'available',
      images: [],
      views: 0,
      likes: []
    }
  ];

  await Product.insertMany(sampleProducts.slice(0, 3 - existingCount));
}

async function ensureSeedOpportunities(users) {
  const opportunityCount = await Opportunity.countDocuments();
  if (opportunityCount >= 2) return;

  const sampleOpportunities = [
    {
      owner: users.farmer._id,
      type: 'land',
      intent: 'sale',
      title: '5-acre irrigated plot for sale in Naivasha',
      description: 'Suitable for horticulture, with borehole access and road frontage near Naivasha town. Ideal for vegetable or flower production.',
      county: 'Nakuru',
      location: 'Naivasha',
      price: 4500000,
      priceUnit: 'total',
      contactPhone: users.farmer.phone,
      status: 'active'
    },
    {
      owner: users.vet._id,
      type: 'job',
      intent: 'hire',
      title: 'Need livestock technician for dairy farm',
      description: 'A growing dairy enterprise in Narok is looking for a reliable technician with experience in vaccination, feed management, and routine animal checks.',
      county: 'Narok',
      location: 'Narok Town',
      price: 25000,
      priceUnit: 'per month',
      contactPhone: users.vet.phone,
      status: 'active'
    }
  ];

  await Opportunity.insertMany(sampleOpportunities.slice(0, 2 - opportunityCount));
}

async function ensureSeedData() {
  const users = await ensureBaseUsers();
  await ensureSeedPosts(users.farmer);
  await ensureSeedProducts(users);
  await ensureSeedOpportunities(users);
}

module.exports = ensureSeedData;

if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmers_app';
  mongoose.connect(mongoUri)
    .then(async () => {
      await ensureSeedData();
      console.log('Seed data check complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed data failed:', error);
      process.exit(1);
    });
}
