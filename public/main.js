// 🚀 HeckBit Upgraded Chart Script
// ✅ Candlestick simulation, chart range, fullscreen, line toggle using Polygon.io for real-time charts

let currentPage = 1;
let priceChart;
let currentCoinId;
let currentCoinName;
let currentRange = '1D';
let isCandlestick = true;
let currentSortKey = 'market_cap';
let sortAscending = false;

function toggleCandleChart() {
  isCandlestick = !isCandlestick;
  loadChart(currentRange);
}

function getColorClass(value) {
  if (value === null || isNaN(value)) return '';
  return value >= 0 ? 'positive' : 'negative';
}

function loadCoins() {
  fetch(`/api/prices?page=${currentPage}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#crypto-table tbody");
      if (currentPage === 1) tbody.innerHTML = "";

      data.sort((a, b) => {
        if (sortAscending) return a[currentSortKey] - b[currentSortKey];
        return b[currentSortKey] - a[currentSortKey];
      });

      data.forEach(coin => {
        const row = document.createElement("tr");
        row.onclick = () => showChart(coin.id, coin.name);
        row.innerHTML = `
          <td><img src="${coin.image}" width="30"></td>
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
    });
}

function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
    loadCoins();
  }
}

function addSortListeners() {
  const headers = document.querySelectorAll("#crypto-table th");
  headers.forEach((header, index) => {
    header.addEventListener("click", () => {
      const keys = ['name','symbol','current_price','change_1h','change_24h','change_7d','market_cap','total_volume','circulating_supply'];
      currentSortKey = keys[index - 1] || 'market_cap';
      sortAscending = !sortAscending;
      currentPage = 1;
      loadCoins();
    });
  });
}

function showChart(coinId, coinName) {
  currentCoinId = coinId;
  currentCoinName = coinName;
  currentRange = '1D';
  document.getElementById("chartModal").style.display = "block";
  document.getElementById("chartTitle").innerText = `${coinName} | Price Chart`;
  loadChart(currentRange);
}

async function loadChart(interval = '1D') {
  const POLYGON_API_KEY = "YOUR_POLYGON_API_KEY";
  const symbol = `${currentCoinId.toUpperCase()}-USD`; // Ex: BTC-USD

  const granularity = {
    '1s': 'second',
    '1min': 'minute',
    '5min': '5minute',
    '15min': '15minute',
    '1D': 'day'
  }[interval] || 'day';

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const to = now.toISOString();

    const url = `https://api.polygon.io/v2/aggs/ticker/X:${symbol}/range/1/${granularity}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const results = data.results || [];

    if (priceChart) priceChart.destroy();

    const ctx = document.getElementById("priceChart").getContext("2d");

    const candleData = results.map(p => ({
      x: p.t,
      o: p.o,
      h: p.h,
      l: p.l,
      c: p.c
    }));

    priceChart = new Chart(ctx, {
      type: isCandlestick ? 'candlestick' : 'line',
      data: {
        datasets: [
          isCandlestick
            ? { label: 'OHLC', data: candleData, borderColor: '#007bff' }
            : { label: 'Price', data: candleData.map(p => ({ x: p.x, y: p.c })), borderColor: '#007bff', fill: true, backgroundColor: 'rgba(0,123,255,0.2)', tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'minute' },
            ticks: { color: '#333' },
            grid: { color: '#ddd' }
          },
          y: {
            ticks: { color: '#333' },
            grid: { color: '#ddd' }
          }
        },
        plugins: {
          legend: { labels: { color: '#333' } }
        }
      }
    });
  } catch (err) {
    console.error("Polygon Chart Error:", err);
    alert("Failed to load chart data.");
  }
}

function closeChart() {
  document.getElementById("chartModal").style.display = "none";
  if (document.fullscreenElement) document.exitFullscreen();
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

window.onload = () => {
  loadCoins();
  addSortListeners();
  setInterval(() => loadCoins(), 60000);
};
