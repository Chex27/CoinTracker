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

// 🧠 Polygon.io OHLC candles
app.get('/api/polygon/:symbol/:interval', async (req, res) => {
  const { symbol, interval } = req.params;
  const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

  // Map frontend intervals to Polygon.io resolution
  const resolutionMap = {
    '1s': 'second',
    '1min': 'minute',
    '5min': 'minute',
    '15min': 'minute',
    '1d': 'day'
  };

  const multiplierMap = {
    '1s': 1,
    '1min': 1,
    '5min': 5,
    '15min': 15,
    '1d': 1
  };

  const resolution = resolutionMap[interval] || 'minute';
  const multiplier = multiplierMap[interval] || 1;

  const to = new Date();
  const from = new Date(Date.now() - (1000 * 60 * 60 * 24)); // last 24h for now

  const url = `https://api.polygon.io/v2/aggs/ticker/X:${symbol.toUpperCase()}USD/range/${multiplier}/${resolution}/${from.toISOString()}/${to.toISOString()}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;

  try {
    const { data } = await axios.get(url);
    if (!data || !data.results) return res.status(404).json({ error: 'No candle data found.' });

    const formatted = data.results.map(candle => ({
      x: candle.t,
      o: candle.o,
      h: candle.h,
      l: candle.l,
      c: candle.c
    }));

    res.json({ prices: formatted });
  } catch (err) {
    console.error("Polygon API Error:", err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch Polygon OHLC data' });
  }
});

// Other endpoints unchanged...

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
