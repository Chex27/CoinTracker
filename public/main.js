console.log("Script loaded");
let currentPage     = 1;
let priceChart;
let currentCoinId   = "bitcoin";
let currentCoinName = "Bitcoin";
let currentCoinSymbol = "BTC"; // or default value
let currentRange    = '1D';
let currentMetric   = 'prices';
function setChartMetric(metric) {
  currentMetric = metric;
  isCandlestick = false; // Only show line for alt metrics
  loadChart(currentRange);
}

let isCandlestick   = false;
let currentSortKey  = 'market_cap';
let sortAscending   = false;

const RENDER_BACKEND_URL = "https://cointracker-yxmu.onrender.com"; // ✅ prices now working
const CHART_BACKEND_URL  = "https://cointracker-yxmu.onrender.com"; // ✅ charts stay working


function getColorClass(v){ return v >= 0 ? 'positive' : 'negative'; }

function loadCoins() {
  console.log(`Rendering coins page ${currentPage}`);
  fetch(`${RENDER_BACKEND_URL}/api/prices?page=${currentPage}`)
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    })
    .then(data => {
      console.log("Received coin data:", data);
      renderTable(data);
    })
    .catch(err => console.error("Error loading coins:", err));
}

function renderTable(data) {
  const tbody = document.getElementById("crypto-table");
  if (currentPage === 1) tbody.innerHTML = "";

  data.sort((a, b) =>
    sortAscending
      ? a[currentSortKey] - b[currentSortKey]
      : b[currentSortKey] - a[currentSortKey]
  ).forEach(coin => {
    const tr = document.createElement("tr");
    tr.classList.add("hover-row");
    tr.onclick = () => showChart(coin.id, coin.name, coin.symbol);

    tr.innerHTML = `
      <td><img src="${coin.image}" width="24"/></td>
      <td>${coin.name}</td>
      <td>${coin.symbol.toUpperCase()}</td>
      <td class="${getColorClass(coin.change_1h)}">${typeof coin.current_price === 'number' ? coin.current_price.toFixed(2) : 'N/A'}</td>
      <td class="${getColorClass(coin.change_24h)}">${typeof coin.change_24h === 'number' ? coin.change_24h.toFixed(2) : 'N/A'}%</td>
<td class="${getColorClass(coin.change_7d)}">${typeof coin.change_7d === 'number' ? coin.change_7d.toFixed(2) : 'N/A'}%</td>
      <td>$${coin.market_cap?.toLocaleString() || 'N/A'}</td>
      <td>$${coin.total_volume?.toLocaleString() || 'N/A'}</td>
      <td>${coin.circulating_supply?.toLocaleString() || 'N/A'}</td>
      <td><canvas id="spark-${coin.id}" width="90" height="30"></canvas></td>
      <td><button onclick="setAlert('${coin.id}','${coin.name}',${coin.current_price});event.stopPropagation();">🔔</button></td>
    `;

    tbody.appendChild(tr);
    drawSparkline(coin.id, coin.sparkline_in_7d?.price || []);
  });
}


function setAlert(id,name,price){
  const tgt = prompt(`Set alert for ${name} (current: $${price})`);
  if(!tgt) return;
  localStorage.setItem(`alert-${id}`, tgt);
  alert(`Alert set for ${name} at $${tgt}`);
}

function addSortListeners(){
  const headers = document.querySelectorAll("#crypto-table th");
  const keys    = ['name','symbol','current_price','change_1h','change_24h','change_7d','market_cap','total_volume','circulating_supply'];
  headers.forEach((h,i)=>h.addEventListener("click",()=>{
    currentSortKey = keys[i] || 'market_cap';
    sortAscending  = !sortAscending;
    loadCoins();
  }));
}

async function loadMetrics() {
  const res = await fetch("https://api.coingecko.com/api/v3/global");
  const json = await res.json();
  document.getElementById("marketCap").innerText = `$${Number(json.data.total_market_cap.usd).toLocaleString()}`;
  document.getElementById("marketCapChange").innerText = `${json.data.market_cap_change_percentage_24h_usd.toFixed(2)}%`;
}

async function loadTrending() {
  const res = await fetch("https://api.coingecko.com/api/v3/search/trending");
  const json = await res.json();
  const list = document.getElementById("trendingList");
  list.innerHTML = "";
  json.coins.forEach(c => {
    const li = document.createElement("li");
    li.innerText = `${c.item.name} (${c.item.symbol})`;
    list.appendChild(li);
  });
}

async function loadFearGreed() {
  const res = await fetch("https://api.alternative.me/fng/");
  const json = await res.json();
  document.getElementById("fearValue").innerText = json.data[0].value;
  document.getElementById("fearLabel").innerText = json.data[0].value_classification;
}

function drawSparkline(id, data) {
  const canvasId = `spark-${id}`;
  const canvas = document.getElementById(canvasId);
  if (!canvas || !Array.isArray(data) || data.length === 0) return;

  if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy();

  const ctx = canvas.getContext("2d");
  const color = data[data.length - 1] - data[0] >= 0 ? '#16c784' : '#ea3943'; // green if up, red if down

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      responsive: false,
      maintainAspectRatio: false
    }
  });
}
function showSection(sectionId) {
  const sections = document.querySelectorAll('.section-content');
  sections.forEach(section => section.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active-button');
  });
  const btnId = 'btn-' + sectionId.split('-')[0]; // e.g., "btn-trending"
  document.getElementById(btnId).classList.add('active-button');
}

// Button click listeners
document.getElementById('btn-trending').addEventListener('click', () => showSection('trending-section'));
document.getElementById('btn-dexscan').addEventListener('click', () => showSection('dexscan-section'));
document.getElementById('btn-portfolio').addEventListener('click', () => showSection('portfolio-section'));




function showChart(id, name, symbol) {
  currentCoinId = id;
  currentCoinName = name;
  currentCoinSymbol = symbol.toUpperCase();
  document.getElementById("chartTitle").innerText = name;
  document.getElementById("chartModal").style.display = "block";
  loadChart(currentRange);
}


function closeChart() {
  document.getElementById("chartModal").style.display = "none";
}

async function loadPolygonChart(symbol, interval) {
  const ticker = symbol.toUpperCase();
  const url = `${CHART_BACKEND_URL}/api/polygon/${ticker}/${interval}`;
  console.log("📈 Fetching chart data from:", url); // <-- Add this
  const res = await fetch(url);
  const json = await res.json();
  return json.prices;
}


async function loadChart(range = '1D') {
  const intervalMap = {
    '1D': '1min',
    '7D': '15min',
    '1M': '1d',
    '1Y': '7d',
    'ALL': '30d'
  };
  const ctx = document.getElementById("priceChart").getContext("2d");
  if (priceChart) {
    priceChart.destroy();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  try {
    let chartData;
    const interval = intervalMap[range];

    const polygonData = await loadPolygonChart(currentCoinSymbol, interval);

    if (isCandlestick) {
      chartData = polygonData.map(c => ({ x: c.x, o: c.o, h: c.h, l: c.l, c: c.c }));
    } else {
      if (currentMetric === 'prices') {
        chartData = polygonData.map(c => ({ x: c.x, y: c.c }));
      } else if (currentMetric === 'market_caps') {
        chartData = polygonData.map(c => ({ x: c.x, y: c.h })); // High as proxy
      } else if (currentMetric === 'total_volumes') {
        chartData = polygonData.map(c => ({ x: c.x, y: c.v || c.c * 1000 })); // Estimate volume if missing
      }
    }    

    priceChart = new Chart(ctx, {
      type: isCandlestick ? 'candlestick' : 'line',
      data: {
        datasets: [
          isCandlestick
            ? { label: 'OHLC', data: chartData, color: { up: '#26a69a', down: '#ef5350' } }
            : { label: currentCoinName, data: chartData, borderColor: '#2f54eb', backgroundColor: 'rgba(47,84,235,0.1)', fill: true, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { type: 'time', time: { tooltipFormat: 'MMM dd HH:mm' } },
          y: { beginAtZero: false }
        }
      }
    });
  } catch (err) {
    console.error("Chart Load Error:", err);
    alert("Failed to load chart data.");
  }
}

function toggleCandlestick() {
  isCandlestick = !isCandlestick;
  loadChart(currentRange);
}

function updateTweets(e) {
  if (e.key === "Enter") {
    const query = document.getElementById("tweetSearch").value.trim().toLowerCase() || "bitcoin";
    document.getElementById("tweetTopic").innerText = query.toUpperCase();

    const fallbackNitter = [
      'https://nitter.privacydev.net',
      'https://nitter.poast.org',
      'https://nitter.1d4.us',
    ];

    const iframe = document.getElementById("tweetIframe");

    // Try loading from the first available mirror
    (function tryNext(index = 0) {
      if (index >= fallbackNitter.length) {
        console.error("❌ All Nitter mirrors failed.");
        iframe.src = ""; // Clear iframe
        return;
      }

      const url = `${fallbackNitter[index]}/search?f=tweets&q=${encodeURIComponent(query)}`;
      iframe.src = url;
      iframe.onload = () => console.log(`✅ Loaded tweets from: ${url}`);
      iframe.onerror = () => {
        console.warn(`❌ Failed to load: ${url}, trying next...`);
        tryNext(index + 1);
      };
    })();
  }
}



const portfolio = [];

async function addHolding() {
  const coin = document.getElementById("coinInput").value.toLowerCase();
  const buyPrice = parseFloat(document.getElementById("buyPriceInput").value);
  const quantity = parseFloat(document.getElementById("quantityInput").value);

  if (!coin || isNaN(buyPrice) || isNaN(quantity)) {
    alert("Please enter valid coin, price, and quantity.");
    return;
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
    const data = await res.json();
    const currentPrice = data[coin]?.usd;

    if (!currentPrice) throw new Error("Coin not found");

    portfolio.push({ coin, buyPrice, quantity, currentPrice });
    renderPortfolio();
  } catch (err) {
    alert("Failed to fetch coin price. Please check the coin ID.");
    console.error(err);
  }
}

function renderPortfolio() {
  const tbody = document.querySelector("#portfolioTable tbody");
  tbody.innerHTML = "";
  portfolio.forEach(p => {
    const value = p.quantity * p.currentPrice;
    const profitLoss = (p.currentPrice - p.buyPrice) * p.quantity;
    const percentChange = ((p.currentPrice - p.buyPrice) / p.buyPrice) * 100;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.coin}</td>
      <td>$${p.buyPrice.toFixed(2)}</td>
      <td>$${p.currentPrice.toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>$${value.toFixed(2)}</td>
      <td class="${getColorClass(profitLoss)}">$${profitLoss.toFixed(2)}</td>
      <td class="${getColorClass(percentChange)}">${percentChange.toFixed(2)}%</td>
    `;
    tbody.appendChild(row);
  });
}


// === Dashboard UI Enhancements ===

// 1. Update marketCapMini and sparkline
async function updateMarketCapMini() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global');
    const data = await res.json();
    const cap = data.data.total_market_cap.usd;
    document.getElementById("marketCapMini").innerText = `$${cap.toLocaleString()}`;

    // Mini sparkline (mocked for now)
    const ctx = document.getElementById("marketCapSpark").getContext("2d");
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 20}, (_, i) => i),
        datasets: [{
          data: Array.from({length: 20}, () => cap * (0.98 + Math.random() * 0.04)),
          borderColor: '#2f54eb',
          backgroundColor: 'rgba(47,84,235,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        responsive: false,
        maintainAspectRatio: false
      }
    });
  } catch (err) {
    console.error("Failed to load market cap mini:", err);
  }
}
document.getElementById('btn-trending').addEventListener('click', () => {
  showSection('trending-coins-section');
});

document.getElementById('btn-dexscan').addEventListener('click', () => {
  showSection('dexscan-section');
});

document.getElementById('btn-portfolio').addEventListener('click', () => {
  showSection('portfolio-section');
});

function showSection(sectionId) {
  const sections = document.querySelectorAll('.section-content');
  sections.forEach(section => section.classList.add('hidden'));

  document.getElementById(sectionId).classList.remove('hidden');

  // Optional: highlight active button
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active-button'); // style this class in CSS
  });
  document.querySelector(`[id="btn-${sectionId.split('-')[0]}"]`).classList.add('active-button');
}

// 2. Altcoin Season (static or mock)
function setAltcoinSeason(score = 33) {
  document.getElementById("altcoinScore").innerText = score;
  document.getElementById("altcoinBar").style.width = `${score}%`;
}

// 3. Fear & Greed dial using canvas
function drawFearDial(score = 70) {
  const canvas = document.getElementById("fearDial");
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height;
  const radius = 60;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Base arc
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 15;
  ctx.stroke();

  // Colored arc based on score
  const angle = Math.PI + (score / 100) * Math.PI;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, angle);
  ctx.strokeStyle = score > 60 ? "#2ecc71" : score > 30 ? "#f1c40f" : "#e74c3c";
  ctx.lineWidth = 15;
  ctx.stroke();

  // Text
  ctx.fillStyle = "#000";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(score, centerX, centerY - 10);
  ctx.fillText(score > 60 ? "Greed" : score > 30 ? "Neutral" : "Fear", centerX, centerY + 12);
}

// 4. Trending Coins Grid
async function populateTrendingCoinsGrid() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending");
    const data = await res.json();
    const container = document.getElementById("trendingCoinsGrid");
    container.innerHTML = "";
    data.coins.forEach(c => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "8px";
      div.style.padding = "10px";
      div.style.background = "#fff";
      div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
      div.style.display = "flex";
      div.style.flexDirection = "column";
      div.style.alignItems = "center";

      div.innerHTML = `
        <img src="${c.item.small}" width="32" height="32" />
        <strong>${c.item.name}</strong>
        <small>${c.item.symbol}</small>
        <span style="color:#2f54eb;">Rank #${c.item.market_cap_rank}</span>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load trending coins:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const { DateTime } = luxon;
  Chart._adapters._date.override({
    _id: 'luxon',
    formats: () => ({}),
    parse: v => DateTime.fromMillis(v),
    format: (t, f) => DateTime.fromMillis(t).toFormat(f),
    add: (t, n, u) => DateTime.fromMillis(t).plus({ [u]: n }).toMillis(),
    diff: (a, b, u) => DateTime.fromMillis(a).diff(DateTime.fromMillis(b), u).get(u),
    startOf: (t, u) => DateTime.fromMillis(t).startOf(u).toMillis(),
    endOf: (t, u) => DateTime.fromMillis(t).endOf(u).toMillis()
  });

  // Initial Load
  loadCoins();
  loadMetrics();
  loadTrending();
  loadFearGreed();
  addSortListeners();
  updateMarketCapMini();
  setAltcoinSeason(33);
  drawFearDial(70);
  populateTrendingCoinsGrid();

  setInterval(loadCoins, 60_000);

  document.getElementById("loadMoreBtn").addEventListener("click", () => {
    currentPage++;
    loadCoins();
  });
});

