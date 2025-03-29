let currentPage = 1;

function loadCoins() {
  fetch(`/api/prices?page=${currentPage}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#crypto-table tbody");
      tbody.innerHTML = ""; // clear before reload
      data.forEach(coin => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td onclick="showChart('${coin.id}', '${coin.name}')">${coin.name}</td>
          <td>${coin.symbol.toUpperCase()}</td>
          <td class="${coin.change_1h > 0 ? 'text-success' : 'text-danger'}">$${coin.current_price}</td>
          <td class="${coin.change_1h > 0 ? 'text-success' : 'text-danger'}">${coin.change_1h?.toFixed(2)}%</td>
          <td class="${coin.change_24h > 0 ? 'text-success' : 'text-danger'}">${coin.change_24h?.toFixed(2)}%</td>
          <td class="${coin.change_7d > 0 ? 'text-success' : 'text-danger'}">${coin.change_7d?.toFixed(2)}%</td>
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

function loadMore() {
  currentPage++;
  loadCoins();
}
function loadChart(range) {
  currentRange = range;
  const url = `/api/chart/${currentCoinId}?range=${currentRange}&type=line`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !Array.isArray(data.prices || data)) {
        alert("No chart data available.");
        return;
      }

      if (priceChart) priceChart.destroy();  // Destroy any previous chart

      const ctx = document.getElementById("priceChart").getContext("2d");

      const config = {
        type: 'line',  // Chart type: 'line' or 'candlestick'
        data: {
          labels: data.prices.map(p => p[0]),  // X-axis timestamps
          datasets: [{
            label: `${currentCoinName} Price (USD)`,
            data: data.prices.map(p => ({ x: p[0], y: p[1] })),  // Y-axis price
            borderColor: "#00eaff",  // Line color
            backgroundColor: "rgba(0, 234, 255, 0.3)",  // Fill color
            fill: true,
            tension: 0.3  // Smooth line
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'minute' },
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

      priceChart = new Chart(ctx, config);  // Create new chart
    })
    .catch(err => alert("Failed to load chart data"));
}

function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
  }
}

// optional global handler if you're using chart modal
function showChart(id, name) {
  console.log(`Show chart for ${name} (${id})`);
  // implement chart logic/modal
}
function showChart(coinId, coinName) {
  currentCoinId = coinId;
  currentCoinName = coinName;
  currentRange = '1y'; // Default chart range
  document.getElementById("chartModal").style.display = "block";
  document.getElementById("chartTitle").innerText = `${coinName} | Price Chart`;
  loadChart(currentRange);
}

window.onload = () => {
  loadCoins();
  setInterval(loadCoins, 60000); // auto-refresh every 60s
};
let priceChart;

function loadChart(range) {
  currentRange = range;
  const url = `/api/chart/${currentCoinId}?range=${currentRange}&type=line`; // Make sure this API URL is correct

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !Array.isArray(data.prices || data)) {
        alert("No chart data available.");
        return;
      }

      if (priceChart) priceChart.destroy(); // Destroy any previous chart

      const ctx = document.getElementById("priceChart").getContext("2d");

      const config = {
        type: 'line',  // Can change to 'candlestick' if needed
        data: {
          labels: data.prices.map(p => p[0]), // X-axis timestamps
          datasets: [{
            label: `${currentCoinName} Price (USD)`,
            data: data.prices.map(p => ({ x: p[0], y: p[1] })), // Y-axis price
            borderColor: "#00eaff",  // Line color
            backgroundColor: "rgba(0, 234, 255, 0.3)",  // Fill color
            fill: true,
            tension: 0.3  // Smooth line
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'minute' },
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

      priceChart = new Chart(ctx, config); // Create new chart
    })
    .catch(err => {
      console.error("Error loading chart data:", err);
      alert("Failed to load chart data.");
    });
}
