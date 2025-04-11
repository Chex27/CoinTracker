// 🚀 HeckBit Upgraded Chart Script
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

  const PAIR_MAP = {
    bitcoin: "0xccb63225a7b19dcf66717e4d40c9a72b39331d61", // WBTC/USDC on Polygon
    ethereum: "0x853ee4b2a13f8a742d64c8f088be7ba2131f670d", // WETH/USDC
    tether: "0x6ff62bfb8c12109e8000935a6de54dad83a4f39f", // USDT/USDC on Polygon
    solana: "0x2646F6A937fE2c1c0b58095bF09b42Cfc0aE858F"
  };

  const pairId = PAIR_MAP[currentCoinId.toLowerCase()];
  if (!pairId) return alert(`No OHLC pair ID mapped for ${currentCoinId}.`);

  fetch(`/api/ohlc/${pairId}?range=${range}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.prices) {
        alert("No OHLC data found.");
        return;
      }

      if (priceChart) priceChart.destroy();

      const ctx = document.getElementById("priceChart").getContext("2d");

      const lineData = data.prices.map(p => ({ x: p.x, y: p.c }));
      const candleData = data.prices.map(p => ({
        x: p.x,
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
              : { label: 'Price', data: lineData, borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.2)', fill: true }
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
              ticks: { color: "#333" },
              grid: { color: "#ddd" }
            },
            y: {
              ticks: { color: "#333" },
              grid: { color: "#ddd" }
            }
          },
          plugins: {
            legend: { labels: { color: "#333" } }
          }
        }
      });
    })
    .catch(err => {
      console.error("Chart Load Error:", err);
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
  // already here in main.js
}

// ✅ 👇 Paste wallet functions AFTER everything else

async function trackWallet(address = null) {
  // the full function from your wallet script
}

async function connectWallet() {
  // the full function from your wallet script
}

function loadCryptoNews() {
  // Skipped
}
