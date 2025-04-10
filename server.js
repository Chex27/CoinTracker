// Updated server.js using free CoinGecko API (no pro key required)
const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const users = [{ id: 1, username: 'user', password: 'password' }];

passport.use(new LocalStrategy((username, password, done) => {
  const user = users.find(u => u.username === username);
  if (!user || user.password !== password) return done(null, false);
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/dashboard');
});
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

app.use(express.static(path.join(__dirname, 'public')));

// Free CoinGecko API endpoints
app.get('/api/fear-greed', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.alternative.me/fng/');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Fear & Greed Index' });
  }
});

app.get('/api/prices', async (req, res) => {
  const page = req.query.page || 1;
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 25,
        page,
        sparkline: true,
        price_change_percentage: '1h,24h,7d'
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
      sparkline_in_7d: c.sparkline_in_7d,
      image: c.image
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: "failed to fetch prices" });
  }
});

app.get('/api/chart/:coinId', async (req, res) => {
  const { coinId } = req.params;
  const { range } = req.query;

  let days = '365';
  if (range === '1d') days = '1';
  else if (range === '7d') days = '7';
  else if (range === '30d') days = '30';
  else if (range === '90d') days = '90';
  else if (range === 'max') days = 'max';

  try {
    const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days,
        interval: range === '1d' ? 'hourly' : 'daily'
      }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "failed to fetch chart data" });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const { data } = await axios.get(`https://newsapi.org/v2/everything?q=crypto&apiKey=${process.env.NEWS_API_KEY}`);
    res.json(data.articles);
  } catch (e) {
    res.status(500).json({ error: "failed to fetch news" });
  }
});

app.get('/api/altcoin-season', async (req, res) => {
  res.json({ data: { altcoin_season_score: 50 } }); // Mocked for now
});

app.get('/api/global-metrics', async (req, res) => {
  res.json({
    data: {
      quote: {
        USD: {
          total_market_cap: 2400000000000,
          cmc_dominance: 43.2
        }
      },
      market_cap_change_percentage_24h_usd: 1.35
    }
  });
});
app.get('/api/wallet/:address', async (req, res) => {
  const wallet = req.params.address;
  const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

  try {
    const url = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${wallet}&apikey=${POLYGON_API_KEY}`;
    const { data } = await axios.get(url);

    res.json(data);
  } catch (err) {
    console.error('Polygon wallet fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet transactions' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
