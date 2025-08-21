// public/app.js
const API_URL = "https://dangvien-app.onrender.com/members";

/* =================== State =================== */
let allMembers = [];       // dữ liệu gốc
let filtered = [];         // sau khi search/sort
let currentPage = 1;
let pageSize = 10;         // 0 = all
let sortKey = null;        // 'name' | 'email' | null
let sortDir = 1;           // 1 = asc, -1 = desc

/* =================== Helpers =================== */
// Bỏ dấu + đưa về thường để tìm kiếm tiếng Việt
const normalizeVN = (s = "") =>
  s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Debounce: tránh gọi render quá nhiều khi gõ
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Lấy dữ liệu từ API
async function fetchMembers() {
  const tbody = document.getElementById("members-list");
  tbody.innerHTML = `<tr><td colspan="3" class="center">Đang tải dữ liệu...</td></tr>`;
  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();

    allMembers = Array.isArray(json) ? json : (json.data || []);
    // đảm bảo có name/email
    allMembers = allMembers.map(x => ({ name: x.name || "", email: x.email || "" }));

    document.getElementById("updatedAt").textContent =
      "Cập nhật: " + new Date().toLocaleString("vi-VN");

    applyAndRender();
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      `<tr><td colspan="3" class="center">Lỗi tải dữ liệu. Vui lòng thử lại.</td></tr>`;
  }
}

/* =================== Pipeline (search → sort → paginate) =================== */
function applyAndRender() {
  // 1) Search
  const q = normalizeVN(document.getElementById("q").value);
  filtered = !q
    ? [...allMembers]
    : allMembers.filter(m =>
        normalizeVN(m.name).includes(q) || normalizeVN(m.email).includes(q)
      );

  // 2) Sort
  if (sortKey) {
    filtered.sort((a, b) => {
      const va = normalizeVN(a[sortKey]);
      const vb = normalizeVN(b[sortKey]);
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }

  // 3) Pagination
  const total = filtered.length;
  const size = pageSize === 0 ? total : pageSize;

  const totalPages = size === 0 ? 1 : Math.max(1, Math.ceil(total / size));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = size === 0 ? 0 : (currentPage - 1) * size;
  const end = size === 0 ? total : start + size;
  const pageItems = filtered.slice(start, end);

  // 4) Render table
  renderTable(pageItems, start);

  // 5) Render footer
  document.getElementById("counter").textContent = `Hiển thị ${pageItems.length}/${total}`;
  document.getElementById("info").textContent =
    total === 0 ? "Không có dữ liệu." : `Tổng: ${total} bản ghi`;
  document.getElementById("pageLabel").textContent =
    size === 0 ? `Trang 1/1` : `Trang ${currentPage}/${totalPages}`;
  document.getElementById("prev").disabled = size === 0 || currentPage <= 1;
  document.getElementById("next").disabled = size === 0 || currentPage >= totalPages;

  // 6) Cập nhật trạng thái mũi tên sort trên header
  const thName = document.getElementById("th-name");
  const thEmail = document.getElementById("th-email");
  [thName, thEmail].forEach(th => th.classList.remove("asc", "desc"));
  if (sortKey === "name") thName.classList.add(sortDir === 1 ? "asc" : "desc");
  if (sortKey === "email") thEmail.classList.add(sortDir === 1 ? "asc" : "desc");
}

function renderTable(items, startIndex) {
  const tbody = document.getElementById("members-list");
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="center">Không có dữ liệu phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((m, i) => {
      const stt = startIndex + i + 1;
      return `
        <tr>
          <td>${stt}</td>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.email)}</td>
        </tr>
      `;
    })
    .join("");
}

// Simple escape
function escapeHtml(s = "") {
  return s
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* =================== Events =================== */
function bindEvents() {
  // Search (debounce)
  const onSearch = debounce(() => {
    currentPage = 1;
    applyAndRender();
  }, 250);
  document.getElementById("q").addEventListener("input", onSearch);

  // Page size
  document.getElementById("pageSize").addEventListener("change", (e) => {
    pageSize = Number(e.target.value);
    currentPage = 1;
    applyAndRender();
  });

  // Pagination
  document.getElementById("prev").addEventListener("click", () => {
    currentPage--;
    applyAndRender();
  });
  document.getElementById("next").addEventListener("click", () => {
    currentPage++;
    applyAndRender();
  });

  // Refresh
  document.getElementById("refresh").addEventListener("click", fetchMembers);

  // Sorting
  document.getElementById("th-name").addEventListener("click", () => toggleSort("name"));
  document.getElementById("th-email").addEventListener("click", () => toggleSort("email"));
}

function toggleSort(key) {
  if (sortKey === key) {
    sortDir = -1 * sortDir;            // đảo chiều
  } else {
    sortKey = key;
    sortDir = 1;                       // mặc định tăng dần
  }
  applyAndRender();
}

/* =================== Init =================== */
document.addEventListener("DOMContentLoaded", () => {
  // lấy pageSize mặc định từ select
  pageSize = Number(document.getElementById("pageSize").value);
  bindEvents();
  fetchMembers();
});
