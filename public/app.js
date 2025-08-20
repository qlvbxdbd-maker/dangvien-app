// public/app.js
const API_URL = 'https://dangvien-app.onrender.com/members';

function render(items) {
  const tbody = document.getElementById('members-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  items.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.email}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadMembers(page = 1, pageSize = 50) {
  try {
    const url = new URL(API_URL);
    url.searchParams.set('page', page);
    url.searchParams.set('pageSize', pageSize);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    render(items);
  } catch (err) {
    console.error(err);
    const tbody = document.getElementById('members-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="2">Không tải được dữ liệu. Vui lòng thử lại.</td></tr>`;
  }
}

// Khi DOM sẵn sàng thì tải danh sách
document.addEventListener('DOMContentLoaded', () => loadMembers());
