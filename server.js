require('dotenv').config();

const express = require('express');
const axios = require('axios');
const redis = require('redis');
const cors = require('cors');

const app = express();
const PORT = 3002;  // You can change this PORT if needed

// Middleware
app.use(cors());

// Create Redis client
const redisClient = redis.createClient();

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect();

const apiKey = process.env.WEATHER_API_KEY;
// Define the weather API endpoint
app.get('/api/weather', async (req, res) => {
  const { city, country } = req.query;

  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required' });
  }
    const cacheKey = `${city}:${country}`;

  try {

    // Check if data exists in Redis
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Cache hit');
      return res.json(JSON.parse(cachedData)); // Return cached response
    }

    // Fetch data from Visual Crossing API
    const response = await axios.get(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city},${country}?key=${apiKey}`
    );
    const weatherData = response.data;

    // Store the response in Redis with a TTL (e.g., 3600 seconds = 1 hour)
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(weatherData));
    console.log('Data saved successfully.');

    // Return the API response
    res.json(weatherData);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching weather data' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
