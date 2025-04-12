// ✅ HeckBit Pro - Refactored Chart Script
// 🔁 Realtime Charting, Coin Alerts, Sorting, View Toggles

let currentPage = 1;
let priceChart;
let currentCoinId = "bitcoin";
let currentCoinName = "Bitcoin";
let currentRange = '1D';
let isCandlestick = false;
let currentSortKey = 'market_cap';
let sortAscending = false;

const POLYGON_API_KEY = "0OIzN0KVU6TiSxRj70NzExfe0B9nveuH";

const granularityMap = {
  '1D': 'day',
  '7D': 'hour',
  '1M': 'day',
  '1Y': 'week',
  'ALL': 'month'
};

function getColorClass(value) {
  return value >= 0 ? 'positive' : 'negative';
}

function loadCoins() {
  fetch(`/api/prices?page=${currentPage}`)
    .then(res => res.json())
    .then(data => renderTable(data));
}

function renderTable(data) {
  const tbody = document.querySelector("#crypto-table tbody");
  if (currentPage === 1) tbody.innerHTML = "";

  data.sort((a, b) => sortAscending
    ? a[currentSortKey] - b[currentSortKey]
    : b[currentSortKey] - a[currentSortKey]);

  data.forEach(coin => {
    const row = document.createElement("tr");
    row.onclick = () => showChart(coin.id, coin.name);
    row.innerHTML = `
      <td><img src="${coin.image}" width="24"></td>
      <td>${coin.name}</td>
      <td>${coin.symbol.toUpperCase()}</td>
      <td class="${getColorClass(coin.change_1h)}">${coin.current_price.toFixed(2)}</td>
      <td class="${getColorClass(coin.change_1h)}">${coin.change_1h?.toFixed(2)}%</td>
      <td class="${getColorClass(coin.change_24h)}">${coin.change_24h?.toFixed(2)}%</td>
      <td class="${getColorClass(coin.change_7d)}">${coin.change_7d?.toFixed(2)}%</td>
      <td>$${coin.market_cap.toLocaleString()}</td>
      <td>$${coin.total_volume.toLocaleString()}</td>
      <td>${coin.circulating_supply.toLocaleString()}</td>
      <td><button onclick="setAlert('${coin.id}', '${coin.name}', ${coin.current_price}); event.stopPropagation();">🔔</button></td>
    `;
    tbody.appendChild(row);
  });
}

function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
  }
}

function addSortListeners() {
  const headers = document.querySelectorAll("#crypto-table th");
  headers.forEach((header, index) => {
    const keys = ['name','symbol','current_price','change_1h','change_24h','change_7d','market_cap','total_volume','circulating_supply'];
    header.addEventListener("click", () => {
      currentSortKey = keys[index - 1] || 'market_cap';
      sortAscending = !sortAscending;
      loadCoins();
    });
  });
}

function showChart(coinId, coinName) {
  currentCoinId = coinId;
  currentCoinName = coinName;
  document.getElementById("chartModal").style.display = "block";
  document.getElementById("chartTitle").innerText = `${coinName} | Price Chart`;
  loadChart(currentRange);
}

function toggleChartView(range) {
  currentRange = range;
  loadChart(range);
}

async function loadChart(range = '1D') {
  const granularity = granularityMap[range] || 'day';
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.setDate(now.getDate() - 30)).toISOString();

  const url = `https://api.polygon.io/v2/aggs/ticker/X:${currentCoinId.toUpperCase()}USD/range/1/${granularity}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);
    const { results } = await response.json();
    const ctx = document.getElementById("priceChart").getContext("2d");
    if (priceChart) priceChart.destroy();

    const candleData = results.map(p => ({ x: p.t, o: p.o, h: p.h, l: p.l, c: p.c }));

    priceChart = new Chart(ctx, {
      type: isCandlestick ? 'candlestick' : 'line',
      data: {
        datasets: [isCandlestick
          ? { label: 'OHLC', data: candleData, borderColor: '#007bff' }
          : { label: 'Price', data: candleData.map(p => ({ x: p.x, y: p.c })), borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.2)', fill: true, tension: 0.4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'time', time: { tooltipFormat: 'MMM dd' }, ticks: { color: '#333' }, grid: { color: '#eee' } },
          y: { ticks: { color: '#333' }, grid: { color: '#eee' } }
        },
        plugins: { legend: { labels: { color: '#333' } } }
      }
    });
  } catch (err) {
    console.error("Chart Load Error:", err);
    alert("Failed to load chart data.");
  }
}

function toggleFullScreenChart() {
  const chartModal = document.getElementById('chartModal');
  if (!document.fullscreenElement) chartModal.requestFullscreen();
  else document.exitFullscreen();
}

function toggleCandlestick() {
  isCandlestick = !isCandlestick;
  loadChart(currentRange);
}

function closeChart() {
  document.getElementById("chartModal").style.display = "none";
  if (document.fullscreenElement) document.exitFullscreen();
}

window.onload = () => {
  loadCoins();
  addSortListeners();
  setInterval(loadCoins, 60000);
};
