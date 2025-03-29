let currentPage = 1;
let priceChart;
let currentCoinId;
let currentCoinName;
let currentRange = '1y'; // Default range

// Load Coins into Table
function loadCoins() {
  fetch(`/api/prices?page=${currentPage}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#crypto-table tbody");
      tbody.innerHTML = ""; // Clear before reload
      data.forEach(coin => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><img src="${coin.image}" alt="${coin.name}" width="30" height="30"></td> <!-- Coin Image -->
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

// Search Functionality for coins
document.getElementById('search-box').addEventListener('input', function(e) {
  const query = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#crypto-table tbody tr');
  rows.forEach(row => {
    const coinName = row.querySelector('td:nth-child(2)').innerText.toLowerCase(); // Search in the name column
    if (coinName.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});

// Load More Coins (Pagination)
function loadMore() {
  currentPage++;
  loadCoins();
}

// Show the Chart Modal
function showChart(coinId, coinName) {
  currentCoinId = coinId;
  currentCoinName = coinName;
  currentRange = '1y'; // Default chart range
  document.getElementById("chartModal").style.display = "block";
  document.getElementById("chartTitle").innerText = `${coinName} | Price Chart`;
  loadChart(currentRange);
}

// Close the Chart Modal
function closeChart() {
  document.getElementById("chartModal").style.display = "none";
}

// Load Chart Data
function loadChart(range) {
  currentRange = range;
  const url = `/api/chart/${currentCoinId}?range=${currentRange}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !Array.isArray(data.prices || data)) {
        alert("No chart data available.");
        return;
      }

      if (priceChart) priceChart.destroy(); // Destroy previous chart if exists

      const ctx = document.getElementById("priceChart").getContext("2d");
      const config = {
        type: 'line',  // You can change this to 'candlestick' if desired
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

      priceChart = new Chart(ctx, config); // Create a new chart
    })
    .catch(err => {
      console.error("Error loading chart data:", err);
      alert("Failed to load chart data.");
    });
}

// Fetch latest crypto news using the provided API key
function loadCryptoNews() {
  const apiKey = '6ce572114c4b4bcd975d66e5913e67ac'; // Your API key here
  const url = `https://newsapi.org/v2/everything?q=crypto&apiKey=${apiKey}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const newsList = document.getElementById('news-list');
      newsList.innerHTML = ''; // Clear previous news

      if (data.status === 'ok') {
        data.articles.forEach(article => {
          const newsItem = document.createElement('div');
          newsItem.classList.add('news-item');
          newsItem.innerHTML = `
            <a href="${article.url}" target="_blank">
              <h4>${article.title}</h4>
              <p>${article.description}</p>
              <span>Source: ${article.source.name}</span>
            </a>
          `;
          newsList.appendChild(newsItem);
        });
      } else {
        newsList.innerHTML = '<p>Failed to load news, please try again later.</p>';
      }
    })
    .catch(err => {
      console.error('Error fetching news:', err);
      document.getElementById('news-list').innerHTML = '<p>Failed to load news, please try again later.</p>';
    });
}

// Call functions on page load
window.onload = () => {
  loadCoins();
  loadCryptoNews();  // Load crypto news
  setInterval(loadCoins, 60000); // auto-refresh every 60s
};

// Set price alert
function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) {
    localStorage.setItem(`alert-${id}`, target);
    alert(`Alert set for ${name} at $${target}`);
  }
}
