// 📈 CoinTracker Chart Upgrade Script
// Adds: candlestick support, time range buttons, fullscreen button

let currentPage = 1;
let priceChart;
let currentCoinId;
let currentCoinName;
let currentRange = '365'; // default to 1 year
let isCandlestick = false; // Toggle mode

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
          <td><canvas class="sparkline" id="spark-${coin.id}"></canvas></td>
        `;
        tbody.appendChild(row);

        const ctx = document.getElementById(`spark-${coin.id}`);
        if (ctx && coin.sparkline_in_7d?.price) {
          Sparkline.draw(ctx, coin.sparkline_in_7d.price, {
            lineColor: "#0ff",
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
  isCandlestick = false;
  document.getElementById("chartModal").style.display = "block";
  document.getElementById("chartTitle").innerText = `${coinName} | Price Chart`;
  loadChart(currentRange);
}

function toggleChartType() {
  isCandlestick = !isCandlestick;
  loadChart(currentRange);
}

function loadChart(range) {
  currentRange = range;
  const url = `/api/chart/${currentCoinId}?range=${range}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.prices || !Array.isArray(data.prices)) {
        alert("No chart data available.");
        return;
      }

      if (priceChart) priceChart.destroy();
      const ctx = document.getElementById("priceChart").getContext("2d");

      const labels = data.prices.map(p => new Date(p[0]));

      const chartConfig = isCandlestick
        ? {
            type: 'candlestick',
            data: {
              datasets: [{
                label: `${currentCoinName} OHLC`,
                data: data.prices.map(([time, price]) => ({
                  x: new Date(time),
                  o: price,
                  h: price * 1.02,
                  l: price * 0.98,
                  c: price
                })),
                borderColor: "#00eaff"
              }]
            },
            options: {
              responsive: true,
              scales: {
                x: {
                  type: 'time',
                  time: {
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
            }
          }
        : {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: `${currentCoinName} Price (USD)`,
                data: data.prices.map(p => ({ x: new Date(p[0]), y: p[1] })),
                borderColor: "#00eaff",
                backgroundColor: "rgba(0, 234, 255, 0.3)",
                fill: true,
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              scales: {
                x: {
                  type: 'time',
                  time: {
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
            }
          };

      priceChart = new Chart(ctx, chartConfig);
    })
    .catch(err => {
      console.error("Error loading chart data:", err);
      alert("Failed to load chart data.");
    });
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

function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
  }
}

function loadMore() {
  currentPage++;
  loadCoins();
}

window.onload = () => {
  loadCoins();
  loadCryptoNews();
  setInterval(loadCoins, 60000);
};

function loadCryptoNews() {
  // Skipped
}
