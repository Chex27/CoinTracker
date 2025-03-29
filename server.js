const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Fetch market prices
app.get('/api/prices', async (req, res) => {
  const page = req.query.page || 1;
  try {
    const { data } = await axios.get('https://pro-api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 25,
        page,
        sparkline: false,
        price_change_percentage: '1h,24h,7d',
        x_cg_pro_api_key: process.env.COINGECKO_KEY
      }
    });
    const formatted = data.map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      current_price: c.current_price,
      market_cap: c.market_cap,
      total_volume: c.total_volume,
      circulating_supply: c.circulating_supply,
      change_1h: c.price_change_percentage_1h_in_currency,
      change_24h: c.price_change_percentage_24h_in_currency,
      change_7d: c.price_change_percentage_7d_in_currency,
      sparkline_in_7d: c.sparkline_in_7d
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: "failed to fetch prices" });
  }
});

// Fetch historical chart data for a coin
app.get('/api/chart/:coinId', async (req, res) => {
  const { coinId } = req.params;
  const range = req.query.range || '1y'; // Default to 1 year if no range is provided

  // Determine the timeframe (adjust based on API capabilities)
  let days = 365; // Default is 1 year
  if (range === '7d') days = 7;
  else if (range === '30d') days = 30;

  try {
    const { data } = await axios.get(`https://pro-api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        x_cg_pro_api_key: process.env.COINGECKO_KEY
      }
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "failed to fetch chart data" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
