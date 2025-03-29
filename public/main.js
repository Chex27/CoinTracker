let currentPage = 1;
function loadCoins() {
  fetch(`/api/prices?page=${currentPage}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#crypto-table tbody");
      data.forEach(coin => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${coin.name}</td>
          <td>${coin.symbol.toUpperCase()}</td>
          <td>$${coin.current_price}</td>
          <td>${coin.change_1h}%</td>
          <td>${coin.change_24h}%</td>
          <td>${coin.change_7d}%</td>
          <td>$${coin.market_cap}</td>
          <td>$${coin.total_volume}</td>
          <td>${coin.circulating_supply}</td>
          <td><button onclick="setAlert('${coin.id}', '${coin.name}', ${coin.current_price})">🔔</button></td>
        `;
        tbody.appendChild(row);
      });
    });
}
function loadMore() { currentPage++; loadCoins(); }
function setAlert(id, name, price) {
  const target = prompt(`Set alert for ${name} (current: $${price})`);
  if (target) localStorage.setItem(`alert-${id}`, target);
}
window.onload = loadCoins;