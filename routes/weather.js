const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

function normalizeLocation(location) {
  const place = String(location)
    .trim()
    .replace(/\s+county\b/ig, '')
    .replace(/,\s*kenya$/i, '')
    .replace(/,\s*ke$/i, '')
    .trim();

  return `${place},KE`;
}

async function requestWeather(url, params) {
  try {
    return await axios.get(url, { params, timeout: 10000, family: 6 });
  } catch (error) {
    if (error.response) throw error;
    return axios.get(url, { params, timeout: 10000, family: 4 });
  }
}

// Get current conditions and a short forecast by browser coordinates or place name.
async function getWeather(req, res) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({ message: 'Weather service is not configured.' });
    }
    
    const { lat, lon } = req.query;
    const hasCoordinates = lat !== undefined || lon !== undefined;
    let params;
    if (hasCoordinates) {
      const latitude = Number(lat);
      const longitude = Number(lon);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
      }
      params = { lat: latitude, lon: longitude, appid: apiKey, units: 'metric' };
    } else {
      const place = String(req.params.location || req.query.location || '').trim();
      if (!place || place.length > 100) {
        return res.status(400).json({ message: 'Enter a location or allow access to your current location.' });
      }
      params = { q: normalizeLocation(place), appid: apiKey, units: 'metric' };
    }
    const [weatherResponse, forecastResponse] = await Promise.all([
      requestWeather('https://api.openweathermap.org/data/2.5/weather', params),
      requestWeather('https://api.openweathermap.org/data/2.5/forecast', params)
    ]);
    
    const weatherData = {
      current: {
        temperature: weatherResponse.data.main.temp,
        feelsLike: weatherResponse.data.main.feels_like,
        humidity: weatherResponse.data.main.humidity,
        pressure: weatherResponse.data.main.pressure,
        description: weatherResponse.data.weather[0].description,
        icon: weatherResponse.data.weather[0].icon,
        windSpeed: weatherResponse.data.wind.speed,
        clouds: weatherResponse.data.clouds.all,
        sunrise: new Date(weatherResponse.data.sys.sunrise * 1000),
        sunset: new Date(weatherResponse.data.sys.sunset * 1000)
      },
      forecast: forecastResponse.data.list.slice(0, 8).map(item => ({
        date: new Date(item.dt * 1000),
        temperature: item.main.temp,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed
      })),
      location: {
        name: weatherResponse.data.name,
        country: weatherResponse.data.sys.country,
        coordinates: {
          lat: weatherResponse.data.coord.lat,
          lon: weatherResponse.data.coord.lon
        }
      }
    };
    
    res.json(weatherData);
  } catch (error) {
    const upstreamStatus = error.response && error.response.status;
    console.error('Weather API error:', error.message);
    if (upstreamStatus === 404) {
      return res.status(404).json({ message: 'Location not found. Try the nearest town name, for example Narok.' });
    }
    if (upstreamStatus === 401) {
      return res.status(503).json({ message: 'Weather service API key is invalid or not active.' });
    }
    if (upstreamStatus === 429) {
      return res.status(503).json({ message: 'Weather service is temporarily busy. Please try again shortly.' });
    }
    res.status(502).json({ message: 'Weather service is unavailable. Please try again shortly.' });
  }
}

router.get('/', auth, getWeather);
// Keep the original URL shape available for existing clients.
router.get('/:location', auth, getWeather);

module.exports = router;
