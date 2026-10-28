const express = require('express');
const router = express.Router();
const axios = require('axios');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get weather alerts for a location
router.get('/alerts/:location', auth, async (req, res) => {
  try {
    const { location } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'Weather service is not configured.' });
    
    // Get current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
    const weatherResponse = await axios.get(weatherUrl);
    const weather = weatherResponse.data;

    // Get forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`;
    const forecastResponse = await axios.get(forecastUrl);
    const forecast = forecastResponse.data;

    // Analyze for severe weather
    const alerts = [];
    
    // Temperature alerts
    if (weather.main.temp > 35) {
      alerts.push({
        type: 'heat-wave',
        severity: 'high',
        title: 'Extreme Heat Warning',
        message: `Temperature ${weather.main.temp}°C. Ensure livestock have shade and water. Avoid outdoor work during peak hours.`,
        recommendations: [
          'Provide extra water for livestock',
          'Create shade for animals',
          'Irrigate crops in early morning',
          'Avoid planting sensitive crops'
        ]
      });
    }

    if (weather.main.temp < 5) {
      alerts.push({
        type: 'frost',
        severity: 'high',
        title: 'Frost Warning',
        message: `Low temperature ${weather.main.temp}°C. Protect sensitive crops from frost damage.`,
        recommendations: [
          'Cover young plants overnight',
          'Move potted plants indoors',
          'Delay planting frost-sensitive crops',
          'Protect water pipes and irrigation'
        ]
      });
    }

    // Wind alerts
    if (weather.wind.speed > 15) {
      alerts.push({
        type: 'strong-wind',
        severity: 'medium',
        title: 'Strong Wind Advisory',
        message: `Wind speed ${weather.wind.speed} m/s. Secure loose items and protect tall crops.`,
        recommendations: [
          'Secure greenhouse covers',
          'Stake tall plants',
          'Postpone spraying pesticides',
          'Check animal shelters'
        ]
      });
    }

    // Rain alerts
    const upcomingRain = forecast.list.slice(0, 8).some(f => 
      f.weather.some(w => w.main === 'Rain' || w.main === 'Thunderstorm')
    );

    if (upcomingRain) {
      alerts.push({
        type: 'rain',
        severity: 'low',
        title: 'Rain Expected',
        message: 'Rain forecasted in the next 24 hours.',
        recommendations: [
          'Postpone irrigation',
          'Harvest ripe crops',
          'Ensure proper drainage',
          'Shelter animals if heavy rain expected'
        ]
      });
    }

    // Humidity alerts
    if (weather.main.humidity > 80) {
      alerts.push({
        type: 'high-humidity',
        severity: 'medium',
        title: 'High Humidity Alert',
        message: `Humidity ${weather.main.humidity}%. Risk of fungal diseases.`,
        recommendations: [
          'Monitor for fungal diseases',
          'Improve air circulation',
          'Reduce irrigation',
          'Apply preventive treatments'
        ]
      });
    }

    res.json({
      location: weather.name,
      current: {
        temp: weather.main.temp,
        humidity: weather.main.humidity,
        windSpeed: weather.wind.speed,
        conditions: weather.weather[0].main,
        description: weather.weather[0].description
      },
      alerts,
      forecast: forecast.list.slice(0, 8).map(f => ({
        time: f.dt_txt,
        temp: f.main.temp,
        conditions: f.weather[0].main,
        rain: f.rain?.['3h'] || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch weather alerts', error: error.message });
  }
});

// Get crop-specific advice
router.get('/advice/:crop', auth, async (req, res) => {
  try {
    const { crop } = req.params;
    const { location } = req.query;

    // Get weather data
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'Weather service is not configured.' });
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
    const weatherResponse = await axios.get(weatherUrl);
    const weather = weatherResponse.data;

    // Crop-specific recommendations
    const advice = getCropAdvice(crop, weather);

    res.json(advice);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get crop advice', error: error.message });
  }
});

// Subscribe to weather alerts
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { location, crops } = req.body;

    // Store user preferences (could use a WeatherSubscription model)
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.weatherPreferences = {
      location,
      crops,
      alertsEnabled: true
    };
    await user.save();

    res.json({ message: 'Successfully subscribed to weather alerts' });
  } catch (error) {
    res.status(500).json({ message: 'Subscription failed', error: error.message });
  }
});

// Send weather alert notifications (called by cron job)
router.post('/notify-users', async (req, res) => {
  try {
    const cronSecret = process.env.WEATHER_ALERTS_CRON_SECRET;
    if (!cronSecret) {
      return res.status(503).json({ message: 'Weather alert scheduling is not configured' });
    }
    if (req.get('x-cron-secret') !== cronSecret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const users = await User.find({ 'weatherPreferences.alertsEnabled': true });

    for (const user of users) {
      const location = user.weatherPreferences?.location || user.location;
      
      // Get weather alerts for user's location
      const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
      if (!apiKey) continue;
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
      
      try {
        const weatherResponse = await axios.get(weatherUrl);
        const weather = weatherResponse.data;

        // Check for severe conditions
        if (weather.main.temp > 35 || weather.main.temp < 5 || weather.wind.speed > 15) {
          await Notification.createNotification({
            user: user._id,
            type: 'weather',
            message: `Weather Alert for ${location}: Extreme conditions detected. Check weather dashboard for details.`
          });
        }
      } catch (error) {
        console.error(`Failed to send alert to user ${user._id}:`, error.message);
      }
    }

    res.json({ message: `Sent alerts to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notifications', error: error.message });
  }
});

// Helper function for crop-specific advice
function getCropAdvice(crop, weather) {
  const temp = weather.main.temp;
  const humidity = weather.main.humidity;
  
  const advice = {
    crop: crop.toLowerCase(),
    currentConditions: {
      temperature: temp,
      humidity: humidity,
      suitable: true
    },
    recommendations: []
  };

  // Crop-specific logic
  const cropData = {
    tomatoes: { minTemp: 15, maxTemp: 30, minHumidity: 50, maxHumidity: 70 },
    maize: { minTemp: 18, maxTemp: 35, minHumidity: 40, maxHumidity: 80 },
    beans: { minTemp: 15, maxTemp: 28, minHumidity: 40, maxHumidity: 70 },
    potatoes: { minTemp: 10, maxTemp: 24, minHumidity: 60, maxHumidity: 80 },
    cabbage: { minTemp: 15, maxTemp: 25, minHumidity: 60, maxHumidity: 75 }
  };

  const data = cropData[crop.toLowerCase()] || cropData.maize;

  if (temp < data.minTemp) {
    advice.currentConditions.suitable = false;
    advice.recommendations.push('Temperature too low for planting');
    advice.recommendations.push('Consider greenhouse cultivation');
    advice.recommendations.push('Wait for warmer weather');
  } else if (temp > data.maxTemp) {
    advice.currentConditions.suitable = false;
    advice.recommendations.push('Temperature too high - risk of heat stress');
    advice.recommendations.push('Increase irrigation frequency');
    advice.recommendations.push('Provide shade if possible');
  } else {
    advice.recommendations.push('Temperature ideal for growth');
    advice.recommendations.push('Good time for planting');
  }

  if (humidity < data.minHumidity) {
    advice.recommendations.push('Low humidity - increase irrigation');
  } else if (humidity > data.maxHumidity) {
    advice.recommendations.push('High humidity - monitor for fungal diseases');
  }

  return advice;
}

module.exports = router;
