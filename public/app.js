// public/app.js
// Đổi URL này nếu bạn đổi domain/service của Render
const API_URL = 'https://dangvien-app.onrender.com/members';

/** Escape HTML để tránh lỗi hiển thị khi dữ liệu có ký tự đặc biệt */
const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/** Vẽ danh sách vào tbody */
function render(items) {
  const tbody = document.getElementById('members-body');
  if (!tbody) return;

  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td class="col-stt" colspan="3" style="text-align:center">
          Không có dữ liệu.
        </td>
      </tr>`;
    return;
  }

  const rows = items.map((m, idx) => `
    <tr>
      <td class="col-stt">${idx + 1}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.email)}</td>
    </tr>
  `);

  tbody.innerHTML = rows.join('');
}

/** Tải danh sách đảng viên (có tham số trang nếu cần mở rộng sau này) */
async function loadMembers(page = 1, pageSize = 50) {
  const tbody = document.getElementById('members-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td class="col-stt" colspan="3" style="text-align:center">
          Đang tải dữ liệu...
        </td>
      </tr>`;
  }

  try {
    const url = new URL(API_URL);
    url.searchParams.set('page', page);
    url.searchParams.set('pageSize', pageSize);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const json = await res.json();
    // API có thể trả trực tiếp mảng, hoặc object { data: [...] }
    const items = Array.isArray(json) ? json : json.data || [];
    render(items);
  } catch (err) {
    console.error(err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td class="col-stt" colspan="3" style="text-align:center;color:#b91c1c">
            Không tải được dữ liệu. Vui lòng thử lại sau.
          </td>
        </tr>`;
    }
  }
}

// Sau khi DOM sẵn sàng, gọi API
document.addEventListener('DOMContentLoaded', () => loadMembers());
