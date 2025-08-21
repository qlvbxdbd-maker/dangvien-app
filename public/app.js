// public/app.js
const API_URL = "https://dangvien-app.onrender.com/members";

let allMembers = [];
let currentPage = 1;
let pageSize = 10;

// Render bảng
function renderTable(data) {
  const list = document.getElementById("members-list");
  list.innerHTML = "";
  data.forEach((m, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td ondblclick="showDetail(${m.id})" style="cursor:pointer">${m.name}</td>
      <td>${m.gender || ""}</td>
      <td>${m.department || ""}</td>
      <td>${m.branch || ""}</td>
      <td>${m.cardNumber || ""}</td>
      <td>${m.joinDate || ""}</td>
      <td>${calcPartyAge(m.joinDate)}</td>
      <td>${m.email || ""}</td>
      <td>${statusText(m.status)}</td>
    `;
    list.appendChild(row);
  });
  document.getElementById("total-count").innerText = `Hiển thị ${data.length}/${allMembers.length} • Cập nhật: ${new Date().toLocaleString()}`;
}

// Tính tuổi đảng
function calcPartyAge(joinDate) {
  if (!joinDate) return "";
  const d = new Date(joinDate);
  const diff = new Date().getFullYear() - d.getFullYear();
  return `${diff} năm`;
}

// Text trạng thái
function statusText(s) {
  switch (s) {
    case "active": return "Đang sinh hoạt";
    case "inactive": return "Nghỉ sinh hoạt";
    case "moved": return "Chuyển đảng";
    default: return "";
  }
}

// Hiển thị chi tiết
function showDetail(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;
  const detail = `
    <p><strong>Họ và tên:</strong> ${m.name}</p>
    <p><strong>Giới tính:</strong> ${m.gender || ""}</p>
    <p><strong>Đơn vị/Bộ phận:</strong> ${m.department || ""}</p>
    <p><strong>Chi bộ:</strong> ${m.branch || ""}</p>
    <p><strong>Số thẻ Đảng viên:</strong> ${m.cardNumber || ""}</p>
    <p><strong>Ngày vào Đảng:</strong> ${m.joinDate || ""}</p>
    <p><strong>Tuổi Đảng:</strong> ${calcPartyAge(m.joinDate)}</p>
    <p><strong>Email:</strong> ${m.email || ""}</p>
    <p><strong>Trạng thái:</strong> ${statusText(m.status)}</p>
  `;
  document.getElementById("memberDetail").innerHTML = detail;
  new bootstrap.Modal(document.getElementById("memberModal")).show();
}

// Xuất Excel
function exportExcel() {
  const ws = XLSX.utils.json_to_sheet(allMembers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DangVien");
  XLSX.writeFile(wb, "DanhSachDangVien.xlsx");
}

// Load danh sách
async function loadMembers() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    allMembers = json.data || json;
    renderTable(allMembers);
  } catch (err) {
    console.error(err);
  }
}

// Sự kiện
document.getElementById("refreshBtn").onclick = loadMembers;
document.getElementById("exportExcelBtn").onclick = exportExcel;
document.getElementById("printBtn").onclick = () => window.print();

// Khởi động
document.addEventListener("DOMContentLoaded", loadMembers);
