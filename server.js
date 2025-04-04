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

// Use bodyParser middleware to parse request bodies (for handling POST data like login)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Set up session middleware
app.use(session({
  secret: 'your-secret-key',  // Use a strong, random key in production
  resave: false,
  saveUninitialized: false
}));
// ===== Routes =====

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard (protected)
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());  // Enable session support for passport

// Your in-memory user data (can be replaced by DB later)
const users = [{ id: 1, username: 'user', password: 'password' }];

// Local strategy (username and password)
passport.use(new LocalStrategy(
  function(username, password, done) {
    const user = users.find(u => u.username === username);
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if (user.password !== password) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  }
));

// Serialize and deserialize user for session storage
passport.serializeUser(function(user, done) {
  done(null, user.id);  // Save user ID in session
});

passport.deserializeUser(function(id, done) {
  const user = users.find(u => u.id === id);
  done(null, user);  // Retrieve user object from session
});

// Example login route
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/' }), // Use local strategy
  (req, res) => {
    res.redirect('/dashboard');  // Redirect to dashboard on successful login
  }
);

// Example route to show the dashboard (after successful login)
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');  // Redirect to login if not authenticated
  }
  res.send(`<h1>Welcome ${req.user.username}</h1>`);
});

// Example logout route
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');  // Redirect to home page after logout
  });
});

// Fetch market prices from CoinGecko API
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
      sparkline_in_7d: c.sparkline_in_7d,
      image: c.image // Added image URL to API response
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

// Fetch latest crypto news using the provided API key
app.get('/api/news', async (req, res) => {
  const apiKey = process.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/everything?q=crypto&apiKey=${apiKey}`;

  try {
    const { data } = await axios.get(url);
    res.json(data.articles);
  } catch (e) {
    res.status(500).json({ error: "failed to fetch news" });
  }
});

// Serve static files (e.g., for frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
