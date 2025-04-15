// ✅ HBhExchange Chart Script - Tailwind Optimized
// 🔁 Realtime Charting, Coin Alerts, Sorting, View Toggles

let currentPage = 1;
let priceChart;
let currentCoinId = "bitcoin";
let currentCoinName = "Bitcoin";
let currentRange = '1D';
let isCandlestick = false;
let currentSortKey = 'market_cap';
let sortAscending = false;

const granularityMap = {
  '1D': 'day',
  '7D': 'hour',
  '1M': 'day',
  '1Y': 'week',
  'ALL': 'month'
};

function getColorClass(value) {
  return value >= 0 ? 'text-green-500' : 'text-red-500';
}

async function loadCoins(page = 1) {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`);
  const coins = await res.json();
  const tbody = document.querySelector("#crypto-table");

  if (page === 1) tbody.innerHTML = "";

  coins.sort((a, b) => sortAscending
    ? a[currentSortKey] - b[currentSortKey]
    : b[currentSortKey] - a[currentSortKey]);

  coins.forEach(coin => {
    const row = document.createElement("tr");
    row.classList.add("hover:bg-gray-100", "cursor-pointer");
    row.onclick = () => showChart(coin.id, coin.name);
    row.innerHTML = `
      <td class="py-2 px-3"><img src="${coin.image}" width="24"></td>
      <td class="py-2 px-3">${coin.name}</td>
      <td class="py-2 px-3">${coin.symbol.toUpperCase()}</td>
      <td class="py-2 px-3 ${getColorClass(coin.price_change_percentage_1h_in_currency)}">${coin.current_price.toFixed(2)}</td>
      <td class="py-2 px-3 ${getColorClass(coin.price_change_percentage_1h_in_currency)}">${coin.price_change_percentage_1h_in_currency?.toFixed(2)}%</td>
      <td class="py-2 px-3 ${getColorClass(coin.price_change_percentage_24h_in_currency)}">${coin.price_change_percentage_24h_in_currency?.toFixed(2)}%</td>
      <td class="py-2 px-3 ${getColorClass(coin.price_change_percentage_7d_in_currency)}">${coin.price_change_percentage_7d_in_currency?.toFixed(2)}%</td>
      <td class="py-2 px-3">$${coin.market_cap.toLocaleString()}</td>
      <td class="py-2 px-3">$${coin.total_volume.toLocaleString()}</td>
      <td class="py-2 px-3"><canvas id="spark-${coin.id}" width="90" height="30"></canvas></td>
    `;
    tbody.appendChild(row);
    drawSparkline(coin.id, coin.sparkline_in_7d.price);
  });
}

function drawSparkline(id, data) {
  const ctx = document.getElementById(`spark-${id}`).getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{ data, borderColor: '#d946ef', fill: true, tension: 0.3, pointRadius: 0 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      responsive: false,
      maintainAspectRatio: false
    }
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
  const url = `/api/polygon/${currentCoinId}/${range}`;
  try {
    const response = await fetch(url);
    const { prices } = await response.json();
    const ctx = document.getElementById("priceChart").getContext("2d");
    if (priceChart) priceChart.destroy();

    priceChart = new Chart(ctx, {
      type: isCandlestick ? 'candlestick' : 'line',
      data: {
        datasets: [isCandlestick
          ? { label: 'OHLC', data: prices, borderColor: '#007bff' }
          : { label: 'Price', data: prices.map(p => ({ x: p.x, y: p.c })), borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.2)', fill: true, tension: 0.4 }]
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
  loadMetrics();
  loadTrending();
  loadFearGreed();
};

// ⬇️ Add this AFTER window.onload
document.getElementById("loadMoreBtn").addEventListener("click", () => {
  currentPage++;
  loadCoins(currentPage);
});

