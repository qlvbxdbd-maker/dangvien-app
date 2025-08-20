// public/app.js

// API lấy danh sách đảng viên (đổi domain nếu bạn dùng tên khác)
const API_URL = "https://dangvien-app.onrender.com/members";

/**
 * Render danh sách vào bảng <tbody id="members-list">
 * @param {Array} items - mảng các đảng viên [{id, name, email, joined_at}, ...]
 */
function render(items) {
  const tbody = document.getElementById("members-list");
  if (!tbody) return;

  // Xóa nội dung cũ
  tbody.innerHTML = "";

  // Nếu không có dữ liệu
  if (!Array.isArray(items) || items.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="2" style="text-align:center;">Không có dữ liệu</td>`;
    tbody.appendChild(tr);
    return;
  }

  // Đổ từng dòng
  items.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name ?? ""}</td>
      <td>${m.email ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Gọi API và hiển thị dữ liệu
 * Có thể truyền page, pageSize nếu sau này bạn thêm phân trang.
 * @param {Object} opts
 * @param {number} opts.page
 * @param {number} opts.pageSize
 */
async function loadMembers({ page = 1, pageSize = 50 } = {}) {
  const tbody = document.getElementById("members-list");
  if (!tbody) return;

  // Thông báo đang tải
  tbody.innerHTML = `<tr><td colspan="2">Đang tải dữ liệu...</td></tr>`;

  try {
    // Nếu cần phân trang, có thể bật đoạn query dưới:
    // const url = new URL(API_URL);
    // url.searchParams.set("page", page);
    // url.searchParams.set("pageSize", pageSize);

    const res = await fetch(API_URL, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status}`);
    }

    const json = await res.json();

    // Hỗ trợ cả 2 dạng: { data: [...] } hoặc [...]
    const items = Array.isArray(json) ? json : json.data || [];
    render(items);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2">Lỗi tải dữ liệu. Vui lòng thử lại.</td></tr>`;
  }
}

// Tải dữ liệu khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => loadMembers());
