const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000; // 🔥 Render uses 10000

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

// Auth Routes
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  successRedirect: '/dashboard'
}));
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ✅ CoinGecko Prices Endpoint
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
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching coin data:", err.message);
    res.status(500).json({ error: 'Failed to fetch coin data' });
  }
});

// ✅ Polygon OHLC Endpoint
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

    const formatted = data.results.map(c => ({ x: c.t, o: c.o, h: c.h, l: c.l, c: c.c }));
    res.json({ prices: formatted });
  } catch (err) {
    console.error("Polygon API Error:", err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch Polygon OHLC data' });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ HeckBit server running on port ${PORT}`);
});
