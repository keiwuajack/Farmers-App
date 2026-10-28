# Quick Start Guide - Farmers App

## ⚡ 5-Minute Setup

### 1. Install Dependencies ✅ (Already Done!)
```powershell
npm install
```

### 2. Setup MongoDB

**Option A - Local MongoDB:**
- Download: https://www.mongodb.com/try/download/community
- Install and start MongoDB service

**Option B - MongoDB Atlas (Cloud - Recommended):**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a free cluster (M0)
4. Get connection string

### 3. Get Weather API Key (Free)
1. Sign up: https://openweathermap.org/api
2. Get your API key from: https://home.openweathermap.org/api_keys
3. Copy the key

### 4. Configure .env File

Open `.env` and update:

```env
# For MongoDB Atlas (recommended):
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/farmers_app

# OR for Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/farmers_app

# Add your Weather API key:
WEATHER_API_KEY=paste_your_api_key_here

# Keep these as is:
PORT=3000
JWT_SECRET=your_jwt_secret_key_change_this_in_production
```

### 5. Start the Server

```powershell
npm start
```

### 6. Open in Browser

```
http://localhost:3000
```

---

## 🎯 First Steps in the App

1. **Sign Up** - Create an account (choose Farmer or Veterinarian)
2. **Login** - Use your credentials
3. **Create a Post** - Share something with the community
4. **Check Weather** - Enter your location
5. **Browse Vets** - Find veterinarians (if you're a farmer)

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection error | Make sure MongoDB is running or check Atlas connection string |
| Weather not working | Add your API key to `.env` file |
| Port 3000 in use | Change PORT=3001 in `.env` |
| Can't login | Clear browser cache and try again |

---

## 📖 Full Documentation

See `SETUP_GUIDE.md` for complete documentation including:
- Detailed API documentation
- All features explanation
- Production deployment tips
- Security best practices

---

## 🚀 You're Ready!

The app includes:
- ✅ User registration & login
- ✅ Social feed with posts, likes, comments
- ✅ Weather integration
- ✅ Farmer-Veterinarian consultations
- ✅ Beautiful, responsive UI

**Enjoy building your farming community! 🌾**
