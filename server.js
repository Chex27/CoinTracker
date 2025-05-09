// ✅ UPDATED server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Basic Auth
const users = [{ id: 1, username: 'user', password: 'password' }];
passport.use(new LocalStrategy((username, password, done) => {
  const user = users.find(u => u.username === username && u.password === password);
  return done(null, user || false);
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user || false);
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  successRedirect: '/dashboard'
}));

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ✅ /api/prices
app.get('/api/prices', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page,
        price_change_percentage: '1h,24h,7d',
        sparkline: true
      }
    });

    // ✅ Patch structure for frontend compatibility
    const coins = response.data.map(c => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      current_price: c.current_price,
      change_1h: c.price_change_percentage_1h_in_currency,
      change_24h: c.price_change_percentage_24h_in_currency,
      change_7d: c.price_change_percentage_7d_in_currency,
      market_cap: c.market_cap,
      total_volume: c.total_volume,
      circulating_supply: c.circulating_supply,
      sparkline_in_7d: c.sparkline_in_7d
    }));

    res.json(coins);
  } catch (err) {
    console.error("💥 CoinGecko API Error:", err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch coin data' });
  }
});

// ✅ /api/polygon
app.get('/api/polygon/:symbol/:interval', async (req, res) => {
  const { symbol, interval } = req.params;
  const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

  const resolutionMap = {
    '1s': 'second', '1min': 'minute', '5min': 'minute',
    '15min': 'minute', '1d': 'day', '7d': 'day', '30d': 'day', '1y': 'day', 'all': 'day'
  };

  const multiplierMap = {
    '1s': 1, '1min': 1, '5min': 5,
    '15min': 15, '1d': 1, '7d': 1, '30d': 1, '1y': 1, 'all': 1
  };

  const resolution = resolutionMap[interval] || 'day';
  const multiplier = multiplierMap[interval] || 1;
  const to = new Date();
  const from = new Date(Date.now() - (1000 * 60 * 60 * 24));

  const url = `https://api.polygon.io/v2/aggs/ticker/X:${symbol.toUpperCase()}USD/range/${multiplier}/${resolution}/${from.toISOString()}/${to.toISOString()}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;

  try {
    const { data } = await axios.get(url);
    if (!data?.results) return res.status(404).json({ error: 'No data found.' });

    const formatted = data.results.map(c => ({
      x: c.t,
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      v: c.v
    }));

    res.json({ prices: formatted });
  } catch (err) {
    console.error("Polygon API Error:", err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch Polygon OHLC data' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✅ HBhExchange server running on port ${PORT}`);
});

app.use((req, res) => {
  res.status(404).send('Page not found');
});
