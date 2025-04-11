// server.js (Full version with OHLC integration)
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

// ------------------ OHLC Endpoint ------------------
const createOHLCBuckets = (trades, intervalMs) => {
  const buckets = {};
  trades.forEach((trade) => {
    const time = trade.blockTimestamp;
    const price = parseFloat(trade.priceUSD);
    const bucketTime = Math.floor(new Date(time).getTime() / intervalMs) * intervalMs;
    if (!buckets[bucketTime]) {
      buckets[bucketTime] = { o: price, h: price, l: price, c: price };
    } else {
      const b = buckets[bucketTime];
      b.h = Math.max(b.h, price);
      b.l = Math.min(b.l, price);
      b.c = price;
    }
  });
  return Object.entries(buckets).map(([timestamp, ohlc]) => ({ x: Number(timestamp), ...ohlc }));
};

app.get('/api/ohlc/:pairId', async (req, res) => {
  const { pairId } = req.params;
  const { range } = req.query || {};
  const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 365;
  const intervalMs = range === '1d' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

  try {
    const { data } = await axios.post('https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06', {
      query: `{
        swaps(first: 1000, orderBy: timestamp, orderDirection: desc,
          where: { pair: "${pairId}", timestamp_gt: ${Math.floor((Date.now() - days * 86400000) / 1000)} }) {
          priceUSD
          blockTimestamp
        }
      }`
    });

    const trades = data.data.swaps || [];
    const ohlcData = createOHLCBuckets(trades, intervalMs);
    res.json({ prices: ohlcData });
  } catch (err) {
    console.error('OHLC fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch OHLC data' });
  }
});

// ------------------ Existing Endpoints ------------------

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
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const { data } = await axios.get(`https://newsapi.org/v2/everything?q=crypto&apiKey=${process.env.NEWS_API_KEY}`);
    res.json(data.articles);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
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
app.get('/api/ohlc/:pairId', async (req, res) => {
  const { pairId } = req.params;
  const { range } = req.query;

  const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const intervalMs = range === '1d' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

  try {
    const query = {
      query: `{
        swaps(first: 1000, orderBy: timestamp, orderDirection: desc,
          where: { pair: "${pairId}", timestamp_gt: ${Math.floor((Date.now() - days * 86400000) / 1000)} }) {
          priceUSD
          timestamp
        }
      }`
    };

    const { data } = await axios.post("https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06", query);
    const trades = data.data.swaps;

    const ohlcMap = {};
    trades.forEach(trade => {
      const t = new Date(Number(trade.timestamp) * 1000);
      const bucket = Math.floor(t.getTime() / intervalMs) * intervalMs;
      const price = parseFloat(trade.priceUSD);
      if (!ohlcMap[bucket]) {
        ohlcMap[bucket] = { o: price, h: price, l: price, c: price };
      } else {
        ohlcMap[bucket].h = Math.max(ohlcMap[bucket].h, price);
        ohlcMap[bucket].l = Math.min(ohlcMap[bucket].l, price);
        ohlcMap[bucket].c = price;
      }
    });

    const result = Object.entries(ohlcMap).map(([x, ohlc]) => ({
      x: Number(x),
      ...ohlc
    }));

    res.json({ prices: result });
  } catch (err) {
    console.error("OHLC fetch error:", err.message);
    res.status(500).json({ error: 'Failed to fetch OHLC data' });
  }
});

app.get('/api/altcoin-season', async (req, res) => {
  res.json({ data: { altcoin_season_score: 50 } });
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
  console.log(`\u2705 Server running on port ${PORT}`);
});
