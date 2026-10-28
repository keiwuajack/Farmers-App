# 🌾 Farmers App - Complete Agricultural Platform

A comprehensive social and marketplace platform for farmers and veterinarians, featuring real-time chat, weather alerts, product marketplace, and veterinary consultations.

## ✨ Features

### Core Features
- 🛒 **Product Marketplace** - Buy and sell agricultural products
- 💬 **Real-time Chat** - Socket.IO powered messaging
- 📰 **Social Feed** - Share updates and knowledge
- 🩺 **Veterinary Services** - Book consultations with vets
- ☁️ **Weather Alerts** - Location-based weather updates
- 📦 **Order Management** - Track purchases and sales
- 💳 **Multiple Payment Methods** - M-Pesa, Cash, Bank Transfer
- 🌍 **Multi-language Support** - English & Swahili (i18next)
- 📱 **Responsive Design** - Works on all devices

### Advanced Features
- ⭐ Product reviews and ratings
- 💝 Wishlist functionality
- 🚚 Delivery tracking
- 📊 Analytics dashboard
- 🔔 Real-time notifications
- 🔐 Secure authentication (JWT)
- 📸 Image uploads
- 🔍 Advanced product search and filtering

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd farmers-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

5. **Create database indexes** (optional but recommended)
```bash
npm run indexes
```

6. **Seed sample data** (optional)
```bash
npm run seed
```

7. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

8. **Access the app**
```
http://localhost:3000
```

### Default Test Account
```
Email: test@test.com
Password: test123
```

## 📁 Project Structure

```
farmers-app/
├── config/              # Configuration files
│   └── config.js        # App configuration
├── middleware/          # Express middleware
│   ├── auth.js         # JWT authentication
│   └── upload.js       # File upload handling
├── models/             # Mongoose models
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Post.js
│   ├── Message.js
│   └── ...
├── routes/             # API routes
│   ├── auth.js
│   ├── products.js
│   ├── orders.js
│   └── ...
├── public/             # Static files
│   ├── css/
│   ├── js/
│   ├── uploads/
│   ├── index.html
│   └── shop.html
├── scripts/            # Utility scripts
│   ├── createTestUser.js
│   ├── createSampleProducts.js
│   └── createIndexes.js
├── locales/            # i18n translations
│   ├── en.json
│   └── sw.json
├── server.js          # Main application file
├── package.json
├── .env.example       # Environment variables template
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/farmers_app

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=*

# Upload
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=5242880
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (auth required)
- `PUT /api/products/:id` - Update product (auth required)
- `DELETE /api/products/:id` - Delete product (auth required)

### Orders
- `GET /api/orders` - Get user orders (auth required)
- `POST /api/orders` - Create order (auth required)
- `PUT /api/orders/:id/status` - Update order status (auth required)

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create post (auth required)
- `POST /api/posts/:id/like` - Like post (auth required)
- `POST /api/posts/:id/comment` - Comment on post (auth required)

### Messages
- `GET /api/messages/:userId` - Get messages with user (auth required)
- `POST /api/messages` - Send message (auth required)

[Full API documentation in API.md]

## 🌐 Deployment

### Heroku
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
git push heroku main
```

### VPS/Cloud Server
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Multer** - File uploads
- **i18next** - Internationalization

### Frontend
- **Vanilla JavaScript** - No framework dependency
- **Socket.IO Client** - Real-time updates
- **CSS3** - Modern styling
- **Responsive Design** - Mobile-first approach

## 📊 Database Schema

### User
- name, email, phone, password
- role (farmer, veterinarian, buyer)
- location, bio, avatar
- farmSize (for farmers)
- specialization (for vets)

### Product
- name, description, category
- price, quantity, unit
- seller (User reference)
- images, location
- isOrganic, isNegotiable
- status, views, likes

### Order
- buyer, seller, product
- quantity, totalAmount
- deliveryAddress, deliveryMethod
- paymentMethod, status
- tracking, statusHistory

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Check products in database
node scripts/checkProducts.js
```

## 📝 Scripts

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm run seed     # Seed sample products
npm run indexes  # Create database indexes
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Support

For support, email support@farmersapp.com or join our Slack channel.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Payment gateway integration (M-Pesa API)
- [ ] Advanced analytics dashboard
- [ ] AI-powered crop recommendations
- [ ] Blockchain for supply chain tracking
- [ ] SMS notifications
- [ ] Email notifications
- [ ] Progressive Web App (PWA)
- [ ] Admin panel

## 📸 Screenshots

[Add screenshots here]

## 🙏 Acknowledgments

- Weather data from OpenWeatherMap API
- Icons from various open-source projects
- Community contributors

---

**Built with ❤️ for the farming community**
