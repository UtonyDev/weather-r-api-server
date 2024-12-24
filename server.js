require('dotenv').config();
const redis = require('redis');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Connect to Redis
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

console.log('Redis Config:', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect();

// Weather API Endpoint
const apiKey = process.env.WEATHER_API_KEY;

app.get('/api/weather', async (req, res) => {
  const { city, country } = req.query;

  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required' });
  }

  const cacheKey = `${city}:${country}`;

  try {
    // Check cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Cache hit');
      return res.json(JSON.parse(cachedData));
    }

    // Fetch from API
    const response = await axios.get(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city},${country}?key=${apiKey}`
    );

    const weatherData = response.data;
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(weatherData)); // Cache for 1 hour
    res.json(weatherData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching weather data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
