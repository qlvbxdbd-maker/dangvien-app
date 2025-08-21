// public/app.js
// API của bạn:
const API_URL = 'https://dangvien-app.onrender.com/members';

// ====== Trạng thái giao diện ======
let state = {
  page: 1,
  pageSize: Number(localStorage.getItem('pageSize') || 10),
  q: '',
  from: '',
  to: '',
  total: 0,
  lastUpdated: null
};

// ====== Trợ giúp ======
const $ = (sel) => document.querySelector(sel);

const parseDate = (v) => {
  if (!v) return null;
  // chấp nhận 'YYYY-MM-DD' hoặc ISO
  try { return new Date(v); } catch { return null; }
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '';

const diffYears = (from, to = new Date()) => {
  if (!from) return '';
  let y = to.getFullYear() - from.getFullYear();
  let m = to.getMonth() - from.getMonth();
  let d = to.getDate() - from.getDate();
  if (d < 0) { m -= 1; }
  if (m < 0) { y -= 1; m += 12; }
  return `${y} năm${m ? ` ${m} tháng` : ''}`;
};

const normalize = (s) => (s || '').toString().normalize('NFC').toLowerCase();

// Lấy ngày vào đảng từ bản ghi (ưu tiên ngay_vao_dang, fallback joined_at)
const getNgayVaoDang = (m) => m.ngay_vao_dang || m.joined_at || m.joinedAt || '';

// ====== Gọi API 1 trang ======
async function fetchPage(page = 1, pageSize = state.pageSize) {
  const url = new URL(API_URL);
  url.searchParams.set('page', page);
  url.searchParams.set('pageSize', pageSize);

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const json = await res.json();

  // Chuẩn hóa: json có thể {data, paging} hoặc là mảng
  const items = Array.isArray(json) ? json : (json.data || []);
  const total = Array.isArray(json) ? items.length : (json.paging?.total ?? items.length);
  return { items, total };
}

// ====== Lấy toàn bộ (bỏ qua phân trang) ======
async function fetchAll() {
  // Lấy trang 1 để biết tổng
  const first = await fetchPage(1, state.pageSize);
  const all = [...first.items];
  const total = first.total;
  const pages = Math.ceil(total / state.pageSize);
  const tasks = [];
  for (let p = 2; p <= pages; p++) tasks.push(fetchPage(p, state.pageSize));
  const rest = await Promise.all(tasks);
  for (const r of rest) all.push(...r.items);
  return { items: all, total };
}

// ====== Render table ======
function render(items) {
  const tbody = $('#tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="9">Không có dữ liệu</td></tr>`;
    return;
  }

  const startStt = (state.page - 1) * state.pageSize;
  tbody.innerHTML = items.map((m, i) => {
    const name = m.name || m.hoten || '';
    const email = m.email || '';
    const gioiTinh = m.gioi_tinh || m.gioitinh || '';                // tuỳ backend
    const donVi = m.don_vi || m.donvi || m.bo_phan || '';            // tuỳ backend
    const chiBo = m.chi_bo || m.chibo || '';                         // tuỳ backend
    const soThe = m.so_the || m.soThe || m.so_the_dang_vien || '';   // tuỳ backend
    const ngayVao = getNgayVaoDang(m);
    const ngayDate = parseDate(ngayVao);
    const tuoiDang = diffYears(ngayDate);

    return `
      <tr>
        <td>${startStt + i + 1}</td>
        <td>${name}</td>
        <td class="hide-sm">${gioiTinh}</td>
        <td class="hide-sm">${donVi}</td>
        <td class="hide-sm">${chiBo}</td>
        <td class="hide-sm">${soThe}</td>
        <td>${fmtDate(ngayVao)}</td>
        <td>${tuoiDang}</td>
        <td>${email}</td>
      </tr>`;
  }).join('');
}

// ====== Lọc theo tìm kiếm + khoảng ngày ======
function filterClient(items) {
  const q = normalize(state.q);
  const fromD = parseDate(state.from);
  const toD = parseDate(state.to);

  return items.filter((m) => {
    // search theo tên/email
    const haystack = `${m.name || m.hoten || ''} ${m.email || ''}`;
    if (q && !normalize(haystack).includes(q)) return false;

    // lọc khoảng ngày (Ngày vào Đảng)
    if (fromD || toD) {
      const d = parseDate(getNgayVaoDang(m));
      if (!d) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
    }
    return true;
  });
}

// ====== Nạp 1 trang cho UI ======
async function loadPage() {
  $('#tbody').innerHTML = `<tr><td colspan="9">Đang tải dữ liệu…</td></tr>`;
  try {
    const { items, total } = await fetchPage(state.page, state.pageSize);
    state.total = total;
    const filtered = filterClient(items);
    render(filtered);
    updateFooter();
    state.lastUpdated = new Date();
  } catch (e) {
    console.error(e);
    $('#tbody').innerHTML = `<tr><td colspan="9">Lỗi tải dữ liệu</td></tr>`;
  }
}

// ====== Cập nhật footer/pager ======
function updateFooter() {
  const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
  $('#prev').disabled = state.page <= 1;
  $('#next').disabled = state.page >= pages;
  $('#pageInfo').textContent = `Trang ${state.page}/${pages}`;
  $('#showing').textContent = `Hiển thị ${Math.min(state.page * state.pageSize, state.total)}/${state.total}`;
  const t = state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString('vi-VN') : '—';
  $('#updated').textContent = `Cập nhật: ${t}`;
}

// ====== Xuất XLSX ======
async function exportXLSX() {
  const exportAll = $('#chkAll').checked;

  let items = [];
  let total = 0;
  $('#btnExport').disabled = true;
  try {
    if (exportAll) {
      // tải hết rồi mới lọc
      const all = await fetchAll();
      items = filterClient(all.items);
      total = all.total;
    } else {
      // chỉ trang hiện tại
      const page = await fetchPage(state.page, state.pageSize);
      items = filterClient(page.items);
      total = page.total;
    }

    // map thành dữ liệu bảng
    const rows = items.map((m, idx) => {
      const name = m.name || m.hoten || '';
      const email = m.email || '';
      const gioiTinh = m.gioi_tinh || m.gioitinh || '';
      const donVi = m.don_vi || m.donvi || m.bo_phan || '';
      const chiBo = m.chi_bo || m.chibo || '';
      const soThe = m.so_the || m.soThe || m.so_the_dang_vien || '';
      const ngayVao = getNgayVaoDang(m);
      const tuoiDang = diffYears(parseDate(ngayVao));
      // STT: nếu xuất tất cả thì đánh theo thứ tự hiện tại sau lọc, nếu trang hiện tại thì theo trang
      const stt = exportAll ? (idx + 1) : ((state.page - 1) * state.pageSize + idx + 1);

      return {
        'STT': stt,
        'Họ và tên': name,
        'Giới tính': gioiTinh,
        'Đơn vị/Bộ phận': donVi,
        'Chi bộ': chiBo,
        'Số thẻ Đảng viên': soThe,
        'Ngày vào Đảng': fmtDate(ngayVao),
        'Tuổi Đảng': tuoiDang,
        'Email': email
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { cellDates: false });
    XLSX.utils.book_append_sheet(wb, ws, "Dang_vien");

    // thêm auto width đơn giản
    const cols = Object.keys(rows[0] || {});
    const widths = cols.map(c => ({ wch: Math.max(12, c.length + 2) }));
    ws['!cols'] = widths;

    const dateStr = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `Dang_vien_${exportAll ? 'ALL' : 'PAGE'}_${dateStr}.xlsx`);
  } catch (e) {
    console.error(e);
    alert('Xuất Excel thất bại!');
  } finally {
    $('#btnExport').disabled = false;
  }
}

// ====== Gán sự kiện ======
function bindUI() {
  $('#q').value = state.q;
  $('#pageSize').value = String(state.pageSize);
  $('#pageSize').addEventListener('change', (e) => {
    state.pageSize = Number(e.target.value);
    localStorage.setItem('pageSize', state.pageSize);
    state.page = 1;
    loadPage();
  });

  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value;
    state.page = 1;
    loadPage();
  });

  $('#from').addEventListener('change', (e) => { state.from = e.target.value; state.page = 1; loadPage(); });
  $('#to').addEventListener('change', (e) => { state.to = e.target.value; state.page = 1; loadPage(); });

  $('#btnRefresh').addEventListener('click', () => loadPage());
  $('#btnExport').addEventListener('click', exportXLSX);

  $('#prev').addEventListener('click', () => { if (state.page > 1) { state.page--; loadPage(); } });
  $('#next').addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < pages) { state.page++; loadPage(); }
  });
}

// ====== Khởi tạo ======
document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  loadPage();
});
