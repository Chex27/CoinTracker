// 📈 CoinTracker Upgraded Chart Script
// ✅ Candlestick simulation, chart range, fullscreen, line toggle

let currentPage = 1;
let priceChart;
let currentCoinId;
let currentCoinName;
let currentRange = '365';
let isCandlestick = true;
function toggleCandleChart() {
  isCandle = !isCandle;
  loadChart(currentRange);
}

// Inside your loadCoins() function in main.js
function loadCoins() {
  fetch(`/api/prices?page=${currentPage}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#crypto-table tbody");
      tbody.innerHTML = "";
      data.forEach(coin => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><img src="${coin.image}" alt="${coin.name}" width="30" height="30"></td>
          <td onclick="showChart('${coin.id}', '${coin.name}')">${coin.name}</td>
          <td>${coin.symbol.toUpperCase()}</td>
          <td class="${coin.change_1h > 0 ? 'positive' : 'negative'}">$${coin.current_price}</td>
          <td class="${coin.change_1h > 0 ? 'positive' : 'negative'}">${coin.change_1h?.toFixed(2)}%</td>
          <td class="${coin.change_24h > 0 ? 'positive' : 'negative'}">${coin.change_24h?.toFixed(2)}%</td>
          <td class="${coin.change_7d > 0 ? 'positive' : 'negative'}">${coin.change_7d?.toFixed(2)}%</td>
          <td>$${coin.market_cap?.toLocaleString()}</td>
          <td>$${coin.total_volume?.toLocaleString()}</td>
          <td>${coin.circulating_supply?.toLocaleString()}</td>
          <td><button onclick="setAlert('${coin.id}', '${coin.name}', ${coin.current_price})">🔔</button></td>
          <td><canvas class="sparkline" id="spark-${coin.id}" width="120" height="30"></canvas></td>
        `;
        tbody.appendChild(row);

        // 🧠 Draw sparkline (7d)
        const ctx = document.getElementById(`spark-${coin.id}`);
        if (ctx && coin.sparkline_in_7d?.price) {
          Sparkline.draw(ctx, coin.sparkline_in_7d.price, {
            lineColor: "#ea3943", // 🔴 CoinGecko red
            startColor: "transparent",
            endColor: "transparent"
          });
        }
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

      // Create mock OHLC from line data (🧠 optional: replace with real OHLC if you upgrade CoinGecko tier)
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


function baseChartOptions() {
  return {
    responsive: true,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM dd',
          displayFormats: {
            day: 'MMM dd',
            month: 'MMM yyyy',
            year: 'yyyy'
          }
        },
        ticks: { color: "#fff" },
        grid: { color: "#333" }
      },
      y: {
        ticks: { color: "#fff" },
        grid: { color: "#333" }
      }
    }
  };
}

function closeChart() {
  document.getElementById("chartModal").style.display = "none";
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function toggleFullScreenChart() {
  const chartModal = document.getElementById('chartModal');
  if (!document.fullscreenElement) {
    chartModal.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleCandlestick() {
  isCandlestick = !isCandlestick;
  loadChart(currentRange);
}

function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
  }
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
      const bitcoinDot = document.getElementById('bitcoinDot');
      bitcoinDot.style.left = `${altcoinSeasonScore}%`;
    })
    .catch(error => console.error('Error loading Altcoin Season Index:', error));
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
  setInterval(loadCoins, 60000);
};


function loadCryptoNews() {
  // Skipped
}
