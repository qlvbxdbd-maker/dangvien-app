// public/app.js
const API_URL = 'https://dangvien-app.onrender.com/members';

function render(items) {
  const list = document.getElementById('members-list');
  list.innerHTML = '';
  items.forEach(m => {
    const li = document.createElement('li');
    li.textContent = `${m.name} — ${m.email}`;
    list.appendChild(li);
  });
}

async function loadMembers({ page = 1, pageSize = 50 } = {}) {
  const list = document.getElementById('members-list');
  list.innerHTML = '<li>Đang tải...</li>';

  try {
    const url = new URL(API_URL);
    url.searchParams.set('page', page);
    url.searchParams.set('pageSize', pageSize);

    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();

    // Hỗ trợ cả hai dạng: [{...}] hoặc {data:[...]}
    const items = Array.isArray(json) ? json : json.data || [];
    render(items);
  } catch (err) {
    console.error(err);
    list.innerHTML = '<li>Lỗi tải dữ liệu. Vui lòng thử lại.</li>';
  }
}

// Tải sau khi DOM sẵn sàng (ổn định hơn window.onload)
document.addEventListener('DOMContentLoaded', () => loadMembers());
