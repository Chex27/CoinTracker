// ✅hbhexchange Pro - Fully Integrated Main.js
console.log("Script loaded");
let currentPage     = 1;
let priceChart;
let currentCoinId   = "bitcoin";
let currentCoinName = "Bitcoin";
let currentRange    = '1D';
let currentMetric   = 'prices';
let isCandlestick   = false;
let currentSortKey  = 'market_cap';
let sortAscending   = false;

const RENDER_BACKEND_URL = "https://hbhexchange.onrender.com";

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
    tr.onclick = () => showChart(coin.id, coin.name);

    tr.innerHTML = `
      <td><img src="${coin.image}" width="24"/></td>
      <td>${coin.name}</td>
      <td>${coin.symbol.toUpperCase()}</td>
      <td class="${getColorClass(coin.change_1h)}">${coin.current_price.toFixed(2)}</td>
      <td class="${getColorClass(coin.change_24h)}">${coin.change_24h.toFixed(2)}%</td>
      <td class="${getColorClass(coin.change_7d)}">${coin.change_7d.toFixed(2)}%</td>
      <td>$${coin.market_cap.toLocaleString()}</td>
      <td>$${coin.total_volume.toLocaleString()}</td>
      <td>${coin.circulating_supply.toLocaleString()}</td>
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

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error("Skipping drawSparkline for empty data:", id);
    return;
  }

  if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy();

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: '#d946ef',
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
}

function showChart(id, name) {
  currentCoinId = id;
  currentCoinName = name;
  document.getElementById("chartTitle").innerText = name;
  document.getElementById("chartModal").style.display = "block";
  loadChart(currentRange);
}

function closeChart() {
  document.getElementById("chartModal").style.display = "none";
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

function updateTweets(e) {
  if (e.key === "Enter") {
    const query = document.getElementById("tweetSearch").value.trim().toLowerCase() || "bitcoin";
    document.getElementById("tweetTopic").innerText = query.toUpperCase();

    const fallbackNitter = [
      'https://nitter.net',
      'https://nitter.privacydev.net',
      'https://nitter.snopyta.org'
    ];

    document.getElementById("tweetIframe").src = `${fallbackNitter[0]}/search?f=tweets&q=${encodeURIComponent(query)}`;
  }
}

async function loadPolygonChart(symbol, interval) {
  const url = `${RENDER_BACKEND_URL}/api/polygon/${symbol}/${interval}`;
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
  const daysMap = {
    '1D': '1',
    '7D': '7',
    '1M': '30',
    '1Y': '365',
    'ALL': 'max'
  };
  const ctx = document.getElementById("priceChart").getContext("2d");
  if (priceChart) {
    priceChart.destroy();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }  

  try {
    let chartData;

    if (isCandlestick) {
      const interval = intervalMap[range];
      const polygonData = await loadPolygonChart(currentCoinId, interval);
      chartData = polygonData.map(c => ({ x: c.x, o: c.o, h: c.h, l: c.l, c: c.c }));
    } else {
      const interval = intervalMap[range];
      const polygonData = await loadPolygonChart(currentCoinId, interval);
      chartData = polygonData.map(c => ({ x: c.x, y: c.c }));
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

document.addEventListener("DOMContentLoaded", () => {
  const { DateTime } = luxon;
  Chart._adapters._date.override({
    _id: 'luxon',
    formats: ()=>({}),
    parse:   v => DateTime.fromMillis(v),
    format:  (t,f)=>DateTime.fromMillis(t).toFormat(f),
    add:     (t,n,u)=>DateTime.fromMillis(t).plus({[u]:n}).toMillis(),
    diff:    (a,b,u)=>DateTime.fromMillis(a).diff(DateTime.fromMillis(b),u).get(u),
    startOf: (t,u)=>DateTime.fromMillis(t).startOf(u).toMillis(),
    endOf:   (t,u)=>DateTime.fromMillis(t).endOf(u).toMillis()
  });

  loadCoins();
  loadMetrics();
  loadTrending();
  loadFearGreed();
  addSortListeners();

  setInterval(loadCoins, 60_000);
  document.getElementById("loadMoreBtn").addEventListener("click", () => {
    currentPage++;
    loadCoins();
  });
});
