// 📈 CoinTracker Upgraded Chart Script
// ✅ Candlestick simulation, chart range, fullscreen, line toggle

let currentPage = 1;
let priceChart;
let currentCoinId;
let currentCoinName;
let currentRange = '365';
let isCandlestick = true;
let currentSortKey = 'market_cap';
let sortAscending = false;

function toggleCandleChart() {
  isCandle = !isCandle;
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

      // Sort data before appending
      data.sort((a, b) => {
        if (sortAscending) return a[currentSortKey] - b[currentSortKey];
        return b[currentSortKey] - a[currentSortKey];
      });
      data.forEach(coin => {
        const row = document.createElement("tr");
      
        // 🔥 Chart click restored!
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
      
        document.querySelector("#crypto-table tbody").appendChild(row);
      });
    });
}

function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
    loadCoins(); // Refresh display
  }
}

function addSortListeners() {
  const headers = document.querySelectorAll("#crypto-table th");
  headers.forEach((header, index) => {
    header.addEventListener("click", () => {
      const keys = ['name','symbol','current_price','change_1h','change_24h','change_7d','market_cap','total_volume','circulating_supply'];
      currentSortKey = keys[index - 1] || 'market_cap'; // skip coin img
      sortAscending = !sortAscending;
      currentPage = 1;
      loadCoins();
    });
  });
}

function showChart(coinId, coinName) {
  currentCoinId = coinId;
  currentCoinName = coinName;
  currentRange = '365';
  document.getElementById("chartModal").style.display = "block";
  document.getElementById("chartTitle").innerText = `${coinName} | Price Chart`;
  loadChart(currentRange);
}

let isCandle = true;

function loadChart(range) {
  currentRange = range;
  const url = `/api/chart/${currentCoinId}?range=${range}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.prices) {
        alert("No chart data available.");
        return;
      }

      if (priceChart) priceChart.destroy();

      const ctx = document.getElementById("priceChart").getContext("2d");

      const labels = data.prices.map(p => new Date(p[0]));
      const lineData = data.prices.map(p => ({ x: new Date(p[0]), y: p[1] }));

      const candleData = data.prices.map(([t, price]) => ({
        x: new Date(t),
        o: price * 0.995,
        h: price * 1.005,
        l: price * 0.985,
        c: price
      }));

      priceChart = new Chart(ctx, {
        type: isCandle ? 'candlestick' : 'line',
        data: {
          labels: labels,
          datasets: [
            isCandle
              ? {
                  label: `${currentCoinName} OHLC`,
                  data: candleData,
                  borderColor: "#00eaff"
                }
              : {
                  label: `${currentCoinName} Price`,
                  data: lineData,
                  borderColor: "#00eaff",
                  backgroundColor: "rgba(0,234,255,0.3)",
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
              time: {
                tooltipFormat: 'MMM dd HH:mm',
                displayFormats: {
                  hour: 'HH:mm',
                  day: 'MMM dd',
                  month: 'MMM yyyy'
                }
              },
              ticks: { color: "#fff" },
              grid: { color: "#333" }
            },
            y: {
              ticks: { color: "#fff" },
              grid: { color: "#333" }
            }
          },
          plugins: {
            legend: { labels: { color: "#fff" } }
          }
        }
      });
    })
    .catch(err => {
      console.error("Error loading chart data:", err);
      alert("Failed to load chart data.");
    });
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

function loadFearGreedIndex() {
  fetch('/api/fear-greed')
    .then(response => response.json())
    .then(data => {
      const fearGreedValue = data.data[0].value;
      const fearGreedClassification = data.data[0].value_classification;
      document.getElementById('fearValue').innerText = fearGreedValue;
      document.getElementById('fearLabel').innerText = fearGreedClassification;
    })
    .catch(error => console.error('Error loading Fear & Greed Index:', error));
}

function loadAltcoinSeasonIndex() {
  fetch('/api/altcoin-season')
    .then(response => response.json())
    .then(data => {
      const altcoinSeasonScore = data.data.altcoin_season_score;
      document.getElementById('altcoinScore').innerText = altcoinSeasonScore;
      document.getElementById('bitcoinDot').style.left = `${altcoinSeasonScore}%`;
    })
    .catch(error => console.error('Error loading Altcoin Season Index:', error));
}

function loadGlobalMetrics() {
  fetch('/api/global-metrics')
    .then(res => res.json())
    .then(data => {
      const metrics = data.data;
      document.getElementById('marketCap').innerText = `$${Number(metrics.quote.USD.total_market_cap).toLocaleString()}`;
      document.getElementById('marketCapChange').innerText = `${metrics.market_cap_change_percentage_24h_usd.toFixed(2)}%`;
      document.getElementById('cmc100').innerText = `$${Number(metrics.quote.USD.cmc_dominance).toFixed(2)}`;
      document.getElementById('cmc100Change').innerText = "--%";
    })
    .catch(err => console.error('Global Metrics Error:', err));
}

function loadMore() {
  currentPage++;
  loadCoins();
}

window.onload = () => {
  loadCoins();
  loadCryptoNews();
  loadFearGreedIndex();
  loadAltcoinSeasonIndex();
  addSortListeners();
  loadGlobalMetrics();
  setInterval(() => loadCoins(), 60000); // every minute
  setInterval(() => loadGlobalMetrics(), 120000); // every 2 min
};

function loadCryptoNews() {
  // Skipped
}
