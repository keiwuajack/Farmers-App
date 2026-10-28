# Farmers App - Complete Feature Documentation

## Overview
A comprehensive agricultural e-commerce platform with social networking, real-time communication, payment processing, delivery tracking, and weather alerts.

## Table of Contents
1. [Multi-language Support](#multi-language-support)
2. [Product Reviews & Ratings](#product-reviews--ratings)
3. [Image Upload System](#image-upload-system)
4. [Advanced Search & Filtering](#advanced-search--filtering)
5. [Seller Dashboard & Analytics](#seller-dashboard--analytics)
6. [Real-time Messaging](#real-time-messaging)
7. [Following System](#following-system)
8. [Payment Integration](#payment-integration)
9. [Kenya Marketplace & Farm Opportunities](#kenya-marketplace--farm-opportunities)
10. [Delivery Tracking](#delivery-tracking)
11. [Weather Alerts](#weather-alerts)

---

## Kenya Marketplace & Farm Opportunities

Product listings are publicly browsable and can be filtered by category and any of Kenya's 47 counties. Sellers should include their town and county in the product location.

The opportunities board supports land for sale or lease, farm rentals, BnB stays, farm jobs and worker profiles. Job seekers can register as farm workers; listings require a signed-in account and include county, town, optional KES price and contact phone.

```text
GET   /api/opportunities?type=job&county=Nakuru&search=dairy
POST  /api/opportunities                         (authenticated)
GET   /api/opportunities/mine                    (authenticated)
PATCH /api/opportunities/:id/close               (listing owner)
```

---

## Multi-language Support

### Languages Available
- **English (en)** - Default
- **Swahili (sw)** - Kiswahili

### How to Use

#### Frontend Integration
```javascript
// The i18n manager is automatically initialized
// Access it globally via window.i18n

// Get a translation
const title = i18n.t('products.title'); // "Products" or "Bidhaa"

// Get translation with parameters
const message = i18n.t('orders.total', { amount: '1000' });

// Change language programmatically
await i18n.changeLanguage('sw');
```

#### HTML Attributes
```html
<!-- Text content translation -->
<h1 data-i18n="common.welcome">Welcome to Farmers App</h1>

<!-- Placeholder translation -->
<input data-i18n-placeholder="auth.email" placeholder="Email">

<!-- Title translation -->
<button data-i18n-title="common.save" title="Save"></button>

<!-- Value translation -->
<button data-i18n-value="common.submit" value="Submit"></button>
```

#### API Endpoints
```javascript
// Get available languages
GET /api/translations/languages
// Returns: [{ code: 'en', name: 'English', nativeName: 'English' }, ...]

// Get all translations for a language
GET /api/translations/en
// Returns: { common: {...}, auth: {...}, ... }

// Get specific translation key
GET /api/translations/en/products.title
// Returns: { key: 'products.title', value: 'Products' }
```

### Adding New Languages
1. Create translation file in `locales/` folder (e.g., `fr.json`)
2. Follow the same JSON structure as `en.json`
3. Add language to `supportedLanguages` array in `i18n.js`
4. Restart server

---

## Product Reviews & Ratings

### Features
- ⭐ Star ratings (1-5)
- ✍️ Written reviews with comments
- ✅ Verified purchase badges
- 👍 Helpful vote system
- 📊 Automatic average rating calculation
- 🔒 One review per product per user

### API Endpoints

```javascript
// Get all reviews for a product
GET /api/reviews/product/:productId?page=1&limit=10
// Returns: { reviews: [...], currentPage, totalPages, totalReviews }

// Add a review (requires authentication and purchase)
POST /api/reviews
Body: {
  productId: "123",
  rating: 5,
  comment: "Excellent product!"
}

// Update your review
PUT /api/reviews/:reviewId
Body: {
  rating: 4,
  comment: "Updated review"
}

// Delete your review
DELETE /api/reviews/:reviewId

// Mark review as helpful
POST /api/reviews/:reviewId/helpful
```

### Frontend Example
```javascript
// Submit a review
async function submitReview(productId, rating, comment) {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ productId, rating, comment })
  });
  
  const data = await response.json();
  console.log('Review submitted:', data);
}

// Load product reviews
async function loadReviews(productId, page = 1) {
  const response = await fetch(`/api/reviews/product/${productId}?page=${page}`);
  const data = await response.json();
  
  data.reviews.forEach(review => {
    console.log(`${review.user.name}: ${review.rating}⭐ - ${review.comment}`);
    console.log(`Verified: ${review.verifiedPurchase}, Helpful: ${review.helpfulCount}`);
  });
}
```

---

## Image Upload System

### Features
- 📷 Upload up to 5 images per product
- 🖼️ Supported formats: JPEG, JPG, PNG, GIF, WebP
- 📏 Maximum file size: 5MB per image
- 🗂️ Automatic file validation
- 💾 Files stored in `public/uploads/products/`

### API Endpoints

```javascript
// Add product with images
POST /api/products
Content-Type: multipart/form-data
Fields:
  - name: Product name
  - description: Product description
  - price: Number
  - unit: String
  - quantity: Number
  - category: String
  - images: File[] (up to 5 files)

// Update product images
PUT /api/products/:id
Content-Type: multipart/form-data
Fields: (same as above)
```

### Frontend Example
```html
<!-- HTML Form -->
<form id="productForm" enctype="multipart/form-data">
  <input type="text" name="name" placeholder="Product Name" required>
  <textarea name="description" placeholder="Description"></textarea>
  <input type="number" name="price" placeholder="Price" required>
  <input type="file" name="images" multiple accept="image/*" max="5">
  <button type="submit">Add Product</button>
</form>

<script>
// JavaScript submission
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const product = await response.json();
  console.log('Product created:', product);
});
</script>
```

---

## Advanced Search & Filtering

### Features
- 🔍 Keyword search (name, description)
- 💰 Price range filtering
- 📍 Location-based search
- 🏷️ Category filtering
- 📊 Sorting options: Price, Date, Rating, Views
- 📄 Pagination support

### API Endpoints

```javascript
// Search products with filters
GET /api/products/search?
  keyword=tomatoes&
  category=vegetables&
  minPrice=100&
  maxPrice=500&
  location=Nairobi&
  sortBy=rating&
  page=1&
  limit=12

// Returns:
{
  products: [...],
  currentPage: 1,
  totalPages: 5,
  totalProducts: 58
}
```

### Sort Options
- `price` - Price: Low to High
- `-price` - Price: High to Low
- `createdAt` - Newest First
- `-createdAt` - Oldest First
- `rating` - Highest Rated
- `views` - Most Viewed

### Frontend Example
```javascript
async function searchProducts(filters) {
  const params = new URLSearchParams({
    keyword: filters.keyword || '',
    category: filters.category || '',
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    location: filters.location || '',
    sortBy: filters.sortBy || 'createdAt',
    page: filters.page || 1,
    limit: 12
  });
  
  const response = await fetch(`/api/products/search?${params}`);
  const data = await response.json();
  
  return data;
}

// Example usage
const results = await searchProducts({
  keyword: 'tomatoes',
  minPrice: 100,
  maxPrice: 500,
  sortBy: 'rating',
  page: 1
});
```

---

## Seller Dashboard & Analytics

### Features
- 📈 Revenue tracking (total & monthly)
- 📦 Order statistics
- ⭐ Average rating display
- 🏆 Top-selling products
- 👥 Top customers analysis
- ⚠️ Inventory alerts (low stock, out of stock)
- 📊 Monthly revenue charts

### API Endpoints

```javascript
// Get seller analytics
GET /api/dashboard/analytics
// Requires authentication
// Returns:
{
  totalRevenue: 45000,
  totalOrders: 123,
  pendingOrders: 5,
  completedOrders: 118,
  averageRating: 4.7,
  totalProducts: 45,
  monthlyRevenue: [
    { month: 'Jan', revenue: 3000 },
    { month: 'Feb', revenue: 4500 },
    ...
  ],
  topProducts: [
    { 
      product: { name: '...', images: [...] },
      totalSold: 50,
      revenue: 5000
    }
  ]
}

// Get buyer insights
GET /api/dashboard/buyer-insights
// Returns top customers and their spending

// Get inventory alerts
GET /api/dashboard/inventory-alerts
// Returns:
{
  lowStock: [ { product, quantity } ],
  outOfStock: [ { product } ],
  staleInventory: [ { product, daysSinceListed } ]
}
```

### Frontend Example
```javascript
async function loadDashboard() {
  const response = await fetch('/api/dashboard/analytics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  // Display metrics
  document.getElementById('totalRevenue').textContent = `KES ${data.totalRevenue}`;
  document.getElementById('totalOrders').textContent = data.totalOrders;
  document.getElementById('avgRating').textContent = `${data.averageRating}⭐`;
  
  // Render chart
  renderRevenueChart(data.monthlyRevenue);
  
  // Show alerts
  if (data.lowStock?.length > 0) {
    showLowStockAlert(data.lowStock);
  }
}
```

---

## Messaging

### Current behavior
- Farmers can start a conversation from a veterinarian profile; messages are stored in MongoDB and persist across sessions.
- The Messages area displays conversation history, previews, and unread counts.
- This version uses authenticated HTTP requests, not WebSockets. Live delivery, typing indicators, and online status are not implemented.
- Messages are limited to 2,000 characters.

### API Endpoints

```javascript
// List recent conversations and unread message counts
GET /api/messages/conversations

// Read a conversation; incoming messages are marked as read
GET /api/messages/:userId

// Send a message
POST /api/messages
Body: { "recipient": "userId", "text": "Hello!" }

// Get the authenticated user's unread message count
GET /api/messages/unread/count
```

---

## Following System

### Features
- 👥 Follow/unfollow users
- 📋 View followers list
- 📋 View following list
- ✅ Check follow status
- 🔒 Prevents duplicate follows

### API Endpoints

```javascript
// Follow a user
POST /api/follows/:userId
// Requires authentication

// Unfollow a user
DELETE /api/follows/:userId

// Get followers of a user
GET /api/follows/:userId/followers

// Get users that a user is following
GET /api/follows/:userId/following

// Check if you're following a user
GET /api/follows/:userId/status
// Returns: { isFollowing: true/false }
```

### Frontend Example
```javascript
// Follow/unfollow toggle
async function toggleFollow(userId) {
  const status = await checkFollowStatus(userId);
  
  if (status.isFollowing) {
    await unfollowUser(userId);
  } else {
    await followUser(userId);
  }
}

async function followUser(userId) {
  const response = await fetch(`/api/follows/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log(data.message); // "Successfully followed user"
}

async function loadFollowers(userId) {
  const response = await fetch(`/api/follows/${userId}/followers`);
  const data = await response.json();
  
  data.followers.forEach(follower => {
    console.log(`${follower.follower.name} follows you`);
  });
}
```

---

## Payment Integration

### Current behavior
- Multi-product checkout creates a separate order per product.
- Development offers an explicit simulated M-Pesa prompt with approve/decline actions.
- The simulator does not contact Safaricom, send an STK push, or collect money.
- Payment initialization and simulation are blocked in production.
- Refund processing is unavailable until a provider is integrated.

### API Endpoints

```javascript
// Initialize payment
POST /api/payments/initialize
Body: {
  orderId: "123",
  paymentMethod: "mpesa",
  phoneNumber: "0712345678"
}
// Returns:
{
  simulated: true,
  paymentReference: "DEMO-...",
  amount: 1000,
  instructions: "A simulated prompt; no real payment is sent."
}

// Verify payment status
GET /api/payments/verify/:orderId

// Development-only approval/decline; unavailable in production
POST /api/payments/simulate/:orderId
Body: { "outcome": "success" } // or "failed"

// Provider callback; requires PAYMENT_WEBHOOK_SECRET
POST /api/payments/webhook
Body: {
  reference: "provider-payment-reference",
  status: "success",
  transactionId: "TXN789"
}

// Refunds are unavailable until a provider is integrated
POST /api/payments/refund/:orderId
```

### Frontend Example
```javascript
async function processPayment(orderId, phone) {
  // Step 1: Initialize payment
  const response = await fetch('/api/payments/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      orderId,
      paymentMethod: 'mpesa',
      phoneNumber: phone
    })
  });
  
  const payment = await response.json();
  if (!response.ok) throw new Error(payment.message || 'Could not initialize payment.');

  // Display an explicit simulated approval or decline action to the user.
  renderDemoPrompt({
    payment,
    approve: () => simulateDemoPayment(orderId, 'success'),
    decline: () => simulateDemoPayment(orderId, 'failed')
  });
}

async function simulateDemoPayment(orderId, outcome) {
  const response = await fetch(`/api/payments/simulate/${encodeURIComponent(orderId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ outcome })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Could not update simulated payment.');
  renderPaymentResult(result);
}
```

---

## Delivery Tracking

### Features
- 🚚 Assign delivery person
- 📍 Real-time GPS tracking
- 🗺️ Location history
- ✅ Proof of delivery (signature, photo)
- 📱 Real-time Socket.IO updates
- ⏰ Estimated delivery time

### API Endpoints

```javascript
// Assign delivery person to order
POST /api/delivery/:orderId/assign
Body: {
  deliveryPersonName: "John Doe",
  deliveryPersonPhone: "0712345678",
  vehicleInfo: "Motorcycle"
}

// Update GPS location (seller)
POST /api/delivery/:orderId/location
Body: {
  latitude: -1.286389,
  longitude: 36.817223,
  address: "Kenyatta Avenue, Nairobi"
}
// Emits Socket.IO event to buyer: 'delivery-update'

// Get delivery tracking history
GET /api/delivery/:orderId/track (buyer or seller)

// Mark as delivered
POST /api/delivery/:orderId/delivered
Body: {
  signature: "data:image/png;base64,...",
  photo: "data:image/png;base64,...",
  notes: "Delivered to security guard"
}

// Buyer confirms receipt
POST /api/delivery/:orderId/confirm-receipt (buyer)
```

### Socket.IO Real-time Updates

```javascript
// Buyer receives real-time location updates
socket.on('delivery-update', (data) => {
  const { orderId, location } = data;
  
  // Update map marker
  updateMapMarker(location.latitude, location.longitude);
  
  // Show notification
  showNotification(`Your order is at ${location.address}`);
  
});
```

### Frontend Example
```javascript
// Display delivery tracking
async function showDeliveryTracking(orderId) {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/delivery/${orderId}/track`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const order = await response.json();
  
  // Show current location
  const { currentLocation, deliveryPerson } = order;
  if (currentLocation) {
    initializeMap(currentLocation.latitude, currentLocation.longitude);
  }
  
  // Show delivery person info
  document.getElementById('driverName').textContent = deliveryPerson.name;
  document.getElementById('driverPhone').textContent = deliveryPerson.phone;
  document.getElementById('vehicle').textContent = deliveryPerson.vehicle;

  // Show tracking history
  order.trackingHistory.forEach(track => {
    addTrackingPoint(track.latitude, track.longitude, track.timestamp);
  });
  
  // Listen for real-time updates
  socket.on('delivery-update', (data) => {
    if (data.orderId === orderId) {
      updateMapMarker(data.location);
    }
  });
}

// Confirm delivery receipt
async function confirmReceipt(orderId) {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/delivery/${orderId}/confirm-receipt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  alert('Thank you! Order marked as received.');
}
```

---

## Weather Alerts

### Features
- 🌡️ Temperature alerts (heat waves, frost)
- 💨 Wind speed warnings
- 🌧️ Rain forecasts
- 💧 Humidity monitoring
- 🌾 Crop-specific advice
- 📍 Location-based alerts
- 🔔 User subscriptions

### Supported Crops
- Tomatoes
- Maize (Corn)
- Beans
- Potatoes
- Cabbage

### API Endpoints

```javascript
// Get weather alerts for location
GET /api/weatherAlerts?lat=-1.286389&lon=36.817223
// Returns:
{
  location: { lat, lon },
  alerts: [
    {
      type: 'heat_wave',
      severity: 'severe',
      message: 'Extreme heat warning...',
      temperature: 38,
      recommendations: [...]
    }
  ],
  forecast: {...}
}

// Get crop-specific advice
GET /api/weatherAlerts/crop-advice?
  crop=tomatoes&
  temperature=28&
  humidity=65
// Returns:
{
  crop: 'tomatoes',
  conditions: {
    temperature: { current: 28, ideal: [20,30], status: 'optimal' },
    humidity: { current: 65, ideal: [60,70], status: 'optimal' }
  },
  advice: [...],
  warnings: [...]
}

// Subscribe to weather alerts
POST /api/weatherAlerts/subscribe
Body: {
  location: "Nairobi",
  latitude: -1.286389,
  longitude: 36.817223,
  crops: ["tomatoes", "maize"]
}

// Notify users (cron job endpoint)
POST /api/weatherAlerts/notify
```

### Alert Types
- **heat_wave**: Temperature > 35°C
- **frost_warning**: Temperature < 5°C
- **strong_winds**: Wind speed > 15 m/s
- **heavy_rain**: Rain in forecast
- **high_humidity**: Humidity > 80%

### Frontend Example
```javascript
// Get weather alerts
async function getWeatherAlerts(lat, lon) {
  const response = await fetch(
    `/api/weatherAlerts?lat=${lat}&lon=${lon}`
  );
  const data = await response.json();
  
  // Display alerts
  data.alerts.forEach(alert => {
    const severity = alert.severity; // 'moderate' or 'severe'
    const message = alert.message;
    
    showAlert(message, severity);
    
    // Show recommendations
    alert.recommendations?.forEach(rec => {
      console.log('💡', rec);
    });
  });
}

// Get crop advice
async function getCropAdvice(crop, temp, humidity) {
  const params = new URLSearchParams({
    crop,
    temperature: temp,
    humidity
  });
  
  const response = await fetch(`/api/weatherAlerts/crop-advice?${params}`);
  const data = await response.json();
  
  // Display conditions
  const tempStatus = data.conditions.temperature.status;
  if (tempStatus === 'too_hot') {
    alert('⚠️ Temperature too high for ' + crop);
  } else if (tempStatus === 'too_cold') {
    alert('❄️ Temperature too low for ' + crop);
  } else {
    alert('✅ Optimal temperature for ' + crop);
  }
  
  // Show advice
  data.advice.forEach(tip => console.log('💡', tip));
}

// Subscribe to alerts
async function subscribeToWeatherAlerts(location, crops) {
  const response = await fetch('/api/weatherAlerts/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      location: location.name,
      latitude: location.lat,
      longitude: location.lon,
      crops
    })
  });
  
  const data = await response.json();
  alert('Subscribed to weather alerts!');
}
```

---

## Complete Usage Example

```javascript
// Complete workflow example
async function completeShoppingWorkflow() {
  // 1. Search for products
  const products = await searchProducts({
    keyword: 'tomatoes',
    minPrice: 100,
    maxPrice: 500,
    sortBy: 'rating'
  });
  
  // 2. View product reviews
  await loadReviews(products[0]._id);
  
  // 3. Follow the seller
  await followUser(products[0].seller._id);
  
  // 4. Add to cart and checkout
  await addToCart(products[0]._id, 2);
  const order = await createOrder();
  
  // 5. Make payment
  await processPayment(order._id, order.total, 'mpesa', '0712345678');
  
  // 6. Track delivery
  socket.on('delivery-update', (data) => {
    console.log('Delivery location:', data.location);
  });
  
  // 7. Confirm receipt and leave review
  await confirmReceipt(order._id);
  await submitReview(products[0]._id, 5, 'Excellent tomatoes!');
  
  // 8. Check weather for planting
  await getWeatherAlerts(-1.286389, 36.817223);
  await getCropAdvice('tomatoes', 28, 65);
}
```

---

## Environment Variables

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/farmers_app

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d

# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Payment (Production)
MPESA_CONSUMER_KEY=your_mpesa_key
MPESA_CONSUMER_SECRET=your_mpesa_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey

AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_CLIENT_SECRET=your_airtel_secret
```

---

## Running the Application

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode
npm run dev

# Access the app
http://localhost:3000
```

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **File Upload**: Multer
- **Internationalization**: i18next
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

---

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint responses
3. Check browser console for errors
4. Verify server is running on port 3000
5. Ensure MongoDB is connected

---

**Created with ❤️ for Farmers**
