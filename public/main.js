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
    row.classList.add("hover:bg-gray-100", "cursor-pointer");
    row.onclick = () => showChart(coin.id, coin.name);
    row.innerHTML = `
      <td class="py-2 px-3"><img src="${coin.image}" width="24"></td>
      <td class="py-2 px-3">${coin.name}</td>
      <td class="py-2 px-3">${coin.symbol.toUpperCase()}</td>
      <td class="py-2 px-3 ${getColorClass(coin.change_1h)}">${coin.current_price.toFixed(2)}</td>
      <td class="py-2 px-3 ${getColorClass(coin.change_1h)}">${coin.change_1h?.toFixed(2)}%</td>
      <td class="py-2 px-3 ${getColorClass(coin.change_24h)}">${coin.change_24h?.toFixed(2)}%</td>
      <td class="py-2 px-3 ${getColorClass(coin.change_7d)}">${coin.change_7d?.toFixed(2)}%</td>
      <td class="py-2 px-3">$${coin.market_cap.toLocaleString()}</td>
      <td class="py-2 px-3">$${coin.total_volume.toLocaleString()}</td>
      <td class="py-2 px-3">${coin.circulating_supply.toLocaleString()}</td>
      <td class="py-2 px-3"><button onclick="setAlert('${coin.id}', '${coin.name}', ${coin.current_price}); event.stopPropagation();">🔔</button></td>
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
  addSortListeners();
  setInterval(loadCoins, 60000);
};
