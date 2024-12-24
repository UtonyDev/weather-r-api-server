require('dotenv').config();

const express = require('express');
const axios = require('axios');
const redis = require('redis');
const cors = require('cors');
const app = express();
const PORT = 3000; // You can adjust this as needed

// Middleware
app.use(cors());

// Configure Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully.');
});

redisClient.connect();

// Define your weather API endpoint
app.get('/api/weather', async (req, res) => {
  const { city, country } = req.query;

  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required' });
  }

  const cacheKey = `${city}:${country}`;
  console.log('Received request for:', cacheKey);

  try {
    console.log('Checking Redis cache for key:', cacheKey);
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log('Cache hit:', cacheKey);
      return res.json(JSON.parse(cachedData));
    }

    console.log('Fetching data from Visual Crossing API...');
    const response = await axios.get(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city},${country}?key=${apiKey}`
    );
    const weatherData = response.data;
    console.log('Weather data fetched successfully:', weatherData);

    console.log('Saving data to Redis...');
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(weatherData));
    console.log('Data saved successfully.');

    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Error fetching weather data' });
  }
});
