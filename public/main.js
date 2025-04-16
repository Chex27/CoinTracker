// ✅ HeckBit Pro - Refactored Chart Script
// 🔁 Realtime Charting, Coin Alerts, Sorting, View Toggles

let currentPage = 1;
let priceChart;
let currentCoinId = "bitcoin";
let currentCoinName = "Bitcoin";
let currentRange = '1D';
let currentMetric = 'prices'; // ✅ Added for toggling metrics (price, market_cap, volume)
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
    .then(data => renderTable(data))
    .catch(err => console.error("Error loading coins:", err));
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

function setChartMetric(metric) {
  currentMetric = metric;
  loadChart(currentRange);
}
// ✅ Polygon OHLC Chart Data Loader
async function loadPolygonChart(symbol, interval) {
  const url = `/api/polygon/${symbol}/${interval}`;
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
  if (priceChart) priceChart.destroy();

  try {
    let chartData;

    if (isCandlestick) {
      // 🔥 Fetch candlestick (OHLC) data from Polygon
      const interval = intervalMap[range];
      const polygonData = await loadPolygonChart(currentCoinId, interval);
      
      chartData = polygonData.map(c => ({
        x: c.x,
        o: c.o,
        h: c.h,
        l: c.l,
        c: c.c
      }));
    } else {
      // 🔥 Fetch line chart data from CoinGecko
      const days = daysMap[range];
      const url = `https://api.coingecko.com/api/v3/coins/${currentCoinId}/market_chart?vs_currency=usd&days=${days}`;
      const res = await fetch(url);
      const json = await res.json();

      chartData = json[currentMetric].map(p => ({
        x: p[0],
        y: p[1]
      }));
    }

    priceChart = new Chart(ctx, {
      type: isCandlestick ? 'candlestick' : 'line',
      data: {
        datasets: [
          isCandlestick
            ? { 
                label: 'OHLC',
                data: chartData,
                color: {
                  up: '#26a69a',
                  down: '#ef5350'
                }
              }
            : {
                label: currentCoinName,
                data: chartData,
                borderColor: currentMetric === 'prices' ? '#2f54eb' : '#00b894',
                backgroundColor: 'rgba(47,84,235,0.1)',
                fill: true,
                tension: 0.3
              }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'MMM dd HH:mm' }
          },
          y: { beginAtZero: false }
        },
        plugins: { legend: { display: false } }
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
  document.getElementById("loadMoreBtn").addEventListener("click", () => {
    currentPage++;
    loadCoins(currentPage);
  });
};
