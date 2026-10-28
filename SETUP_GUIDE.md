# 🌾 Farmers App - Complete Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [API Configuration](#api-configuration)
5. [Running the Application](#running-the-application)
6. [Using the App](#using-the-app)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - Choose one:
  - Local installation: [Download MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - Cloud option: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)
- **Git** (optional) - For version control

---

## Installation

### Step 1: Navigate to Project Directory
```powershell
cd "c:\xampp\htdocs\Farmers App"
```

### Step 2: Install Dependencies
```powershell
npm install
```

This will install all required packages:
- Express.js (Web server)
- Mongoose (MongoDB ODM)
- JWT (Authentication)
- Bcrypt (Password hashing)
- Axios (HTTP requests)
- And more...

---

## Database Setup

### Option 1: MongoDB Local Installation

1. **Install MongoDB:**
   - Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Run the installer
   - MongoDB will typically run on `mongodb://localhost:27017`

2. **Start MongoDB Service:**
   ```powershell
   # Windows - MongoDB as Service (usually auto-starts)
   net start MongoDB
   
   # Or manually:
   mongod --dbpath="C:\data\db"
   ```

3. **Verify Connection:**
   ```powershell
   mongosh
   # Should connect to MongoDB shell
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create Account:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free account

2. **Create Cluster:**
   - Click "Build a Database"
   - Choose FREE tier (M0 Sandbox)
   - Select your region
   - Click "Create Cluster"

3. **Configure Access:**
   - **Database Access:** Create a database user with username/password
   - **Network Access:** Add IP address (or use 0.0.0.0/0 for testing)

4. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster.mongodb.net/farmers_app`

---

## API Configuration

### Step 1: Configure Environment Variables

Edit the `.env` file in the project root:

```env
# Server Configuration
PORT=3000

# Database Configuration
# For Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/farmers_app

# For MongoDB Atlas (replace with your connection string):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/farmers_app

# JWT Secret (Change this to a random string in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345

# Weather API Key
WEATHER_API_KEY=your_openweathermap_api_key_here
```

### Step 2: Get Weather API Key

1. **Sign up for OpenWeatherMap:**
   - Go to [OpenWeatherMap](https://openweathermap.org/api)
   - Click "Sign Up" (it's free!)
   - Verify your email

2. **Get API Key:**
   - Go to [API Keys section](https://home.openweathermap.org/api_keys)
   - Copy your default API key (or create a new one)
   - Paste it in `.env` file as `WEATHER_API_KEY`

3. **Note:** Free tier includes:
   - 60 calls/minute
   - 1,000,000 calls/month
   - Current weather data
   - 5-day forecast

---

## Running the Application

### Development Mode (with auto-reload)
```powershell
npm run dev
```

### Production Mode
```powershell
npm start
```

### Verify Server is Running
You should see:
```
MongoDB connected successfully
Server is running on port 3000
Visit http://localhost:3000
```

### Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

---

## Using the App

### 1. Register an Account

**For Farmers:**
1. Click "Sign Up" button
2. Fill in the registration form:
   - Full Name
   - Email
   - Password
   - Role: Select "Farmer"
   - Location (e.g., "Nairobi, Kenya")
   - Phone number
   - Farm Size (e.g., "10 acres")
   - Bio (optional)
3. Click "Register"

**For Veterinarians:**
1. Click "Sign Up" button
2. Fill in the registration form:
   - Full Name
   - Email
   - Password
   - Role: Select "Veterinarian"
   - Location
   - Phone number
   - Specialization (e.g., "Livestock", "Poultry", "Dairy")
   - Bio (optional)
3. Click "Register"

### 2. Login
1. Click "Login" button
2. Enter your email and password
3. Click "Login"

### 3. Create Posts
1. Once logged in, click "Create Post" button
2. Fill in post details:
   - **Title**: Short, descriptive title
   - **Category**: Choose appropriate category
     - General: Regular updates
     - Question: Ask for help/advice
     - Advice: Share knowledge
     - Disease Alert: Report animal diseases
     - Weather Update: Share local weather info
     - Marketplace: Buy/sell items
     - Emergency: Urgent matters
   - **Content**: Detailed description
   - **Tags**: Add relevant tags (comma-separated)
3. Click "Post"

### 4. Interact with Posts
- **Like Posts**: Click the ❤️ button
- **Comment**: Click 💬 to expand comments, type and submit
- **View Details**: Click on any post to see full details

### 5. Check Weather
1. Navigate to "Weather" section
2. Enter your location (e.g., "London", "New York", "Mumbai")
3. Click "Get Weather"
4. View:
   - Current temperature and conditions
   - Humidity, wind speed, pressure
   - 24-hour forecast

### 6. Find Veterinarians
1. Navigate to "Veterinarians" section
2. Browse available veterinarians
3. View their:
   - Specialization
   - Location
   - Contact information
   - Bio

### 7. Request Consultations (Farmers Only)
1. Find a veterinarian
2. Click "Request Consultation"
3. Fill in:
   - Subject (e.g., "Sick cow")
   - Detailed description of the issue
4. Click "Send Request"
5. Track consultations in "Consultations" section

---

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Farmer",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "farmer",
  "location": "Nairobi, Kenya",
  "phone": "+254712345678",
  "farmSize": "10 acres",
  "bio": "Dairy farmer with 5 years experience"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secure_password"
}
```

### Posts Endpoints

#### Get All Posts
```
GET /api/posts
```

#### Create Post (Requires Authentication)
```
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Best practices for dairy farming",
  "content": "Here are some tips...",
  "category": "advice",
  "tags": ["dairy", "cattle", "farming"]
}
```

#### Like Post
```
POST /api/posts/:id/like
Authorization: Bearer <token>
```

#### Add Comment
```
POST /api/posts/:id/comment
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Great advice, thank you!"
}
```

### Weather Endpoints

#### Get Weather
```
GET /api/weather/:location

Example: GET /api/weather/Nairobi
```

### Users Endpoints

#### Get All Veterinarians
```
GET /api/users/vets
```

#### Get User Profile
```
GET /api/users/:id
```

### Consultations Endpoints

#### Create Consultation (Farmers Only)
```
POST /api/consultations
Authorization: Bearer <token>
Content-Type: application/json

{
  "veterinarian": "<vet_user_id>",
  "subject": "Sick cow needs attention",
  "description": "My cow has been showing symptoms..."
}
```

#### Get My Consultations
```
GET /api/consultations
Authorization: Bearer <token>
```

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: MongoDB connection error
```
**Solutions:**
- Ensure MongoDB is running: `net start MongoDB`
- Check connection string in `.env` file
- For Atlas: Verify network access settings
- Check firewall settings

#### 2. Weather API Not Working
```
Error: Weather API key not configured
```
**Solutions:**
- Verify API key in `.env` file
- Ensure no extra spaces in the key
- Check if API key is activated (may take a few minutes)
- Free tier has limits - check usage at OpenWeatherMap dashboard

#### 3. Port Already in Use
```
Error: Port 3000 is already in use
```
**Solutions:**
- Change PORT in `.env` to another port (e.g., 3001)
- Or stop the process using port 3000:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

#### 4. Dependencies Installation Failed
```
Error during npm install
```
**Solutions:**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`
- Update Node.js to latest version

#### 5. Cannot Login After Registration
**Solutions:**
- Check browser console for errors (F12)
- Verify JWT_SECRET is set in `.env`
- Clear browser local storage
- Try with different browser

#### 6. Posts Not Showing
**Solutions:**
- Ensure you're logged in
- Check network tab in browser dev tools
- Verify MongoDB connection
- Check server console for errors

---

## Production Deployment Tips

### Security Considerations

1. **Change JWT Secret:**
   ```env
   JWT_SECRET=use_a_long_random_string_at_least_32_characters_long
   ```

2. **Use Environment Variables:**
   - Never commit `.env` file to version control
   - Use platform-specific environment variables (Heroku, Vercel, etc.)

3. **Enable CORS Properly:**
   - Configure specific origins instead of allowing all

4. **Add Rate Limiting:**
   - Prevent API abuse
   - Install: `npm install express-rate-limit`

5. **Use HTTPS:**
   - Required for production
   - Use SSL certificates (Let's Encrypt is free)

### Deployment Platforms

**Recommended platforms:**
- **Backend**: Heroku, Railway, Render, DigitalOcean
- **Database**: MongoDB Atlas (free tier available)
- **Frontend**: Can be served from the same Express server

---

## Development Tips

### Testing API with Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Import the API endpoints
3. Test each endpoint individually
4. Save authentication token for protected routes

### Database Management

**View Database:**
```powershell
# Using MongoDB Shell
mongosh
use farmers_app
db.users.find()
db.posts.find()
```

**GUI Tools:**
- MongoDB Compass (official GUI)
- Studio 3T
- Robo 3T

### Logging

Check server logs for errors:
- Server console shows all requests
- MongoDB connection status
- API errors and responses

---

## Next Steps & Features to Add

Consider adding these features:

1. **Image Uploads** - Allow users to upload photos
2. **Real-time Chat** - WebSocket for instant messaging
3. **Push Notifications** - Alert users of new consultations
4. **Payment Integration** - For paid consultations
5. **Mobile App** - React Native or Flutter
6. **Email Notifications** - Send email alerts
7. **Admin Dashboard** - Moderate content
8. **Analytics** - Track user engagement
9. **Multi-language Support** - Reach more farmers
10. **Offline Mode** - PWA capabilities

---

## Support

For issues or questions:
1. Check this guide first
2. Review error messages in console
3. Check MongoDB and API configurations
4. Test with Postman to isolate issues

---

## License

This project is open source and available for educational purposes.

---

**Happy Farming! 🌾🚜**
