# 🌾 Farmers App - Complete Agricultural E-Commerce Platform

A comprehensive agricultural marketplace platform with social networking, real-time communication, checkout, delivery tracking, and weather alerts. M-Pesa payment is simulated for development only; the app does not currently collect money.

## 🚀 Features - 12 Major Features

1. **🇰🇪 Kenya-wide marketplace** - Browse and filter farm products by county
2. **🌱 Farm opportunities** - List land for sale or lease, farm rentals, BnBs, farm jobs and worker profiles
3. **⭐ Product Reviews & Ratings** - 5-star reviews with verified purchases
4. **📸 Image Upload** - Multiple product images (up to 5 per product)
5. **🔍 Advanced Search** - Price filters, sorting and pagination
6. **📊 Seller Dashboard** - Analytics, revenue tracking, inventory alerts
7. **💬 Messaging** - Persistent farmer/veterinarian conversations with unread counts
8. **👥 Following System** - Follow sellers, social features
9. **💳 Checkout** - Multi-product cart and an M-Pesa payment simulation for development only
10. **🚚 Delivery Tracking** - Order status, GPS location updates and delivery history
11. **🌦️ Weather Alerts** - Severe weather warnings & crop-specific advice
12. **🗣️ Community survey** - Anonymous public feedback form with admin review and CSV export
13. **💹 Farm finances** - Private income and expense records with estimated net balance for farmer accounts

Farm finance totals include only records entered in the finance section. Marketplace
orders are not added automatically; record outside sales manually and avoid
duplicating sales already counted elsewhere. The balance is an estimate, not a
tax, accounting, or financial statement.

## ⚡ Quick Start

### Prerequisites
- Node.js v20+
- MongoDB v4+
- Modern web browser

### Installation

```bash
# Install dependencies
npm install

# Copy .env.example to .env and set JWT_SECRET to a random value of at least 32 characters.
# Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Start MongoDB (if not running)
net start MongoDB  # Windows

# Start the server
npm start

# Visit the app
http://localhost:3000
```

### Temporary public survey link (ngrok)

For a short community survey, run the app locally, then open a second PowerShell
window and start a tunnel to the app's port (3000 by default):

```powershell
ngrok http 3000
```

Share only the HTTPS forwarding URL printed by ngrok. The link is public and
temporary: it stops working when the app or tunnel stops, and it is not a
production hosting setup. If the app uses a different `PORT`, use that port in
the ngrok command. Do not share admin links, credentials, or secrets.

## 📚 Documentation

- **Complete Feature Guide**: [FEATURES_GUIDE.md](FEATURES_GUIDE.md) - Detailed API documentation
- **Quick Start Guide**: [QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes

Visitors can submit anonymous product feedback from the public landing page.
Administrators can review responses and download the latest 1,000 as a CSV from
`/admin.html` after signing in. Do not request or include sensitive personal
information in survey responses.

## 🌐 Production hosting (Render)

The repository includes a `render.yaml` blueprint for deploying the web app with
a persistent disk for product images. The disk is required because product photos
are saved as files; without persistent storage, they can disappear during a
redeploy or restart. The blueprint uses a paid web-service plan and a 1 GB disk.

1. Push this project to a private or public GitHub repository. Do not include
   `.env`, API keys, database credentials, or other secrets in Git.
2. Create a MongoDB Atlas database in a region near the Render Frankfurt region.
   Configure a database user and network access for the Render service, then copy
   the Atlas connection string.
3. In Render, create a new Blueprint from the repository and review the
   `farmers-app` web service before deploying.
4. Enter the Atlas connection string as `MONGODB_URI` and a valid OpenWeather
   API key as `OPENWEATHER_API_KEY` when prompted. Keep the generated
   `JWT_SECRET`; never reuse the development secret in production.
5. Deploy and verify that `/health` reports `"status":"ok"` and
   `"database":"connected"`. Then test account registration, login, product
   image upload and display, Socket.IO messaging, and weather.
6. Add a custom domain in Render and verify HTTPS. Set `CLIENT_URL` to the exact
   public HTTPS origin and configure `SMTP_USER`/`SMTP_PASS` before enabling
   production password resets. Until both are set, the app safely returns a
   service-unavailable response instead of exposing reset tokens.
7. Do not accept real payments yet. Development checkout can simulate an M-Pesa
   prompt and user approval/decline; no STK push is sent and no money is collected.
   Production blocks payment initialization until a real provider and authentic
   callback-signature verification are configured. Refund processing is not enabled.

The weather panel requests browser location permission after sign-in, shows local
conditions from the device coordinates, and refreshes every 10 minutes while the
page is visible. If location permission is denied, users can search by town.
Browser geolocation requires HTTPS outside localhost. Weather routes accept
`OPENWEATHER_API_KEY`; `WEATHER_API_KEY` is retained as a legacy alias.

Private feeds, product listings, opportunities, reviews, weather details, and
user-directory API reads require a valid signed-in session. The public landing
page remains available before sign-in. If scheduled weather notifications are
enabled, configure a private `WEATHER_ALERTS_CRON_SECRET` and send it in the
`x-cron-secret` request header; never expose that value in browser code.

The production server waits for MongoDB before accepting traffic, exposes a
database-aware health check, and gracefully closes on hosting shutdown. For
other hosting providers, configure the same environment variables and mount
persistent storage at `UPLOAD_DIR`. A managed object-storage service is preferable
when scaling to multiple server instances.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Real-time**: Socket.IO for chat & delivery tracking
- **Authentication**: JWT tokens
- **File Upload**: Multer for product images
- **Internationalization**: i18next (English & Swahili)
- **Frontend**: Vanilla JavaScript, CSS3

## 📦 Key API Endpoints

```
Authentication:   POST /api/auth/register, /api/auth/login
Products:         GET/POST/PUT/DELETE /api/products
Opportunities:    GET/POST /api/opportunities, GET /api/opportunities/mine
                  PATCH /api/opportunities/:id/close
Reviews:          GET/POST/PUT/DELETE /api/reviews
Payments:         POST /api/payments/initialize
Delivery:         POST /api/delivery/:id/assign, /:id/location
                  GET /api/delivery/:id/track
Weather:          GET /api/weatherAlerts
Dashboard:        GET /api/dashboard/analytics
Following:        POST /api/follows/:userId
Translations:     GET /api/translations/:lang
```

## 🎯 Usage Examples

### For Buyers
1. Browse products in Marketplace
2. Search with price filters & sorting
3. Read product reviews
4. Add to cart & checkout
5. Test the M-Pesa prompt simulation, or choose cash on delivery
6. Track delivery in real-time
7. Confirm receipt & leave review

### For Sellers
1. Add products with images (up to 5)
2. View sales dashboard & analytics
3. Process orders
4. Share delivery location updates and follow order tracking
5. Track inventory alerts
6. Chat with buyers
7. Post land, farm stays, rentals or job opportunities

## 🌐 Multi-language Support

Switch between English and Swahili using the language selector in the navbar!

```javascript
// Programmatically change language
await i18n.changeLanguage('sw');  // Swahili
await i18n.changeLanguage('en');  // English
```

## 🔐 Environment Variables

Create a `.env` file:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/farmers_app
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
OPENWEATHER_API_KEY=your_api_key_here
```

   - MongoDB connection string
   - JWT secret key
   - Weather API key (from OpenWeatherMap)

3. Start the server:
   ```bash
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login

### Users
- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- GET /api/users/vets - Get all veterinarians

### Posts
- GET /api/posts - Get all posts
- POST /api/posts - Create new post
- GET /api/posts/:id - Get post by ID
- POST /api/posts/:id/comment - Add comment to post

### Weather
- GET /api/weather/:location - Get weather data for location

## Tech Stack

- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JWT
- Weather API: OpenWeatherMap
- Frontend: HTML, CSS, JavaScript
