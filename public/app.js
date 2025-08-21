/* ====== Cấu hình & Helper ====== */
const API_URL = "https://dangvien-app.onrender.com/members";

/* bỏ dấu & lower-case để tìm kiếm kiểu Google */
function norm(s = "") {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
function ymd(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "";
  return dt.toLocaleDateString("vi-VN");
}
function yearsDiff(d) {
  if (!d) return "0 năm";
  const a = new Date(d), b = new Date();
  if (Number.isNaN(a)) return "0 năm";
  let y = b.getFullYear() - a.getFullYear();
  const m = b.getMonth() - a.getMonth();
  if (m < 0 || (m === 0 && b.getDate() < a.getDate())) y--;
  return `${y} năm`;
}

/* ========= state ========= */
const state = {
  raw: [],           // toàn bộ dữ liệu từ API
  items: [],         // sau khi filter + map
  page: 1,
  pageSize: 10,
  total: 0,
};

const $ = (sel) => document.querySelector(sel);
const tbody = $("#tbody");
const info = $("#info");
const pageInfo = $("#pageInfo");

/* ========= load data ========= */
async function fetchAll() {
  // API demo trả tối đa 50 item; để "Tất cả" ta gọi 1 lần và giữ trong state.raw
  const res = await fetch(API_URL, { headers: { Accept: "application/json" }});
  const js = await res.json();
  // Chấp nhận hai format: {data:[...]} hoặc [...]
  const arr = Array.isArray(js) ? js : (js.data ?? []);

  // Chuẩn hóa để luôn có đầy đủ trường
  state.raw = arr.map((x, idx) => ({
    id: x.id ?? idx + 1,
    name: x.name ?? "N/A",
    email: x.email ?? "N/A",
    join_date: x.joined_at ?? x.join_date ?? null,

    gender: x.gender ?? (idx % 2 ? "Nữ" : "Nam"),
    unit: x.unit ?? "Phòng/ban A",
    branch: x.branch ?? "Chi bộ 1",
    card_no: x.card_no ?? "",
    status: x.status ?? "Đang sinh hoạt",
    note: x.note ?? "",
  }));
}

/* ========= filter & render ========= */
function applyFilter() {
  const kw = norm($("#kw").value);
  const from = $("#fromDate").value ? new Date($("#fromDate").value) : null;
  const to   = $("#toDate").value ? new Date($("#toDate").value) : null;
  const stt  = $("#status").value;

  let items = state.raw.filter((m) => {
    // tìm theo tên/email
    if (kw) {
      const ok =
        norm(m.name).includes(kw) ||
        norm(m.email).includes(kw);
      if (!ok) return false;
    }
    // ngày vào đảng
    if (from || to) {
      const dt = m.join_date ? new Date(m.join_date) : null;
      if (!dt || Number.isNaN(dt)) return false;
      if (from && dt < from) return false;
      if (to && dt > to) return false;
    }
    // trạng thái
    if (stt && m.status !== stt) return false;
    return true;
  });

  // mapping hiển thị
  items = items.map((m) => ({
    ...m,
    join_date_text: ymd(m.join_date),
    age_text: yearsDiff(m.join_date),
  }));

  state.items = items;
  state.total = items.length;

  // reset page nếu cần
  const ps = $("#pageSize").value;
  state.pageSize = ps === "all" ? state.total || 1 : +ps;
  if (state.pageSize <= 0) state.pageSize = 10;
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  state.page = Math.min(state.page, maxPage);

  render();
}

function render() {
  const { page, pageSize, items, total } = state;
  const start = pageSize === state.total ? 0 : (page - 1) * pageSize;
  const slice =
    pageSize === state.total ? items : items.slice(start, start + pageSize);

  tbody.innerHTML = slice
    .map((m, i) => {
      const stt = pageSize === state.total ? i + 1 : start + i + 1;
      return `
      <tr>
        <td class="text-center">${stt}</td>
        <td class="text-primary" role="button"
            ondblclick='openDetail(${JSON.stringify(m.id)})'>
          ${m.name}
        </td>
        <td class="text-center">${m.gender}</td>
        <td>${m.unit}</td>
        <td>${m.branch}</td>
        <td class="text-center">${m.card_no || ""}</td>
        <td class="text-center nowrap">${m.join_date_text || ""}</td>
        <td class="text-center nowrap">${m.age_text}</td>
        <td class="nowrap">${m.email}</td>
        <td class="nowrap">${m.status}</td>
      </tr>`;
    })
    .join("");

  // info + pager
  const shown = slice.length;
  info.textContent = `Hiển thị ${shown}/${total} – Cập nhật: ${new Date()
    .toLocaleTimeString("vi-VN")}`;
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
  pageInfo.textContent = `Trang ${state.page}/${maxPage}`;
}

/* ========= paging ========= */
$("#prev").onclick = () => {
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  state.page = Math.max(1, state.page - 1);
  pageInfo.textContent = `Trang ${state.page}/${maxPage}`;
  render();
};
$("#next").onclick = () => {
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  state.page = Math.min(maxPage, state.page + 1);
  pageInfo.textContent = `Trang ${state.page}/${maxPage}`;
  render();
};

/* ========= Excel ========= */
function exportExcel() {
  const rows = [
    [
      "STT","Họ và tên","Giới tính","Đơn vị/Bộ phận","Chi bộ",
      "Số thẻ Đảng viên","Ngày vào Đảng","Tuổi Đảng","Email","Trạng thái"
    ],
  ];

  const list = ($("#pageSize").value === "all")
    ? state.items
    : (() => {
        const start = (state.page - 1) * state.pageSize;
        return state.items.slice(start, start + state.pageSize);
      })();

  list.forEach((m, idx) => {
    rows.push([
      idx + 1,
      m.name,
      m.gender,
      m.unit,
      m.branch,
      m.card_no || "",
      m.join_date_text || "",
      m.age_text,
      m.email,
      m.status,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DS Dang vien");
  XLSX.writeFile(wb, "Danh_sach_Dang_vien.xlsx");
}

/* ========= DOCX (danh sách) ========= */
async function exportDocxList() {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType } = docx;

  const make = (t, bold=false) => new Paragraph({
    children:[ new TextRun({ text:t, bold }) ]
  });

  const head = [
    "STT","Họ và tên","Giới tính","Đơn vị/Bộ phận","Chi bộ",
    "Số thẻ","Ngày vào Đảng","Tuổi Đảng","Email","Trạng thái"
  ];

  const list = ($("#pageSize").value === "all")
    ? state.items
    : (() => {
        const start = (state.page - 1) * state.pageSize;
        return state.items.slice(start, start + state.pageSize);
      })();

  const header = new TableRow({
    children: head.map(h => new TableCell({
      children: [make(h, true)], 
    })),
  });

  const bodyRows = list.map((m, i) => new TableRow({
    children:[
      new TableCell({ children:[make(String(i+1))] }),
      new TableCell({ children:[make(m.name)] }),
      new TableCell({ children:[make(m.gender)] }),
      new TableCell({ children:[make(m.unit)] }),
      new TableCell({ children:[make(m.branch)] }),
      new TableCell({ children:[make(m.card_no || "")] }),
      new TableCell({ children:[make(m.join_date_text || "")] }),
      new TableCell({ children:[make(m.age_text)] }),
      new TableCell({ children:[make(m.email)] }),
      new TableCell({ children:[make(m.status)] }),
    ],
  }));

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...bodyRows],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [ new TextRun({ text:"Danh sách Đảng viên", bold:true }) ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text:`Từ ngày ${$("#fromDate").value || "…"}  đến ngày ${$("#toDate").value || "…"}`
              })
            ]
          }),
          new Paragraph({ text:" " }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Danh_sach_Dang_vien.docx");
}

/* ========= Detail modal ========= */
let currentDetail = null;

function renderDetail(m, editable=false) {
  const field = (label, key, type="text") => `
    <div class="row mb-2">
      <label class="col-4 col-form-label">${label}:</label>
      <div class="col-8">
        ${
          editable
          ? `<input class="form-control" data-k="${key}" value="${m[key] ?? ""}">`
          : `<div>${m[key] ?? ""}</div>`
        }
      </div>
    </div>
  `;

  $("#detailView").innerHTML = `
    <div class="text-center fw-bold fs-5 mb-3">Lý lịch Đảng viên</div>
    ${field("Họ và tên", "name")}
    ${field("Giới tính", "gender")}
    ${field("Đơn vị/Bộ phận", "unit")}
    ${field("Chi bộ", "branch")}
    ${field("Số thẻ Đảng viên", "card_no")}
    ${field("Ngày vào Đảng", "join_date_text")}
    ${field("Tuổi Đảng", "age_text")}
    ${field("Email", "email")}
    ${field("Trạng thái", "status")}
    ${field("Ghi chú", "note")}
  `;
}
function openDetail(id) {
  const m = state.items.find(x => x.id === id) || state.raw.find(x=>x.id===id);
  if (!m) return;
  currentDetail = m;
  renderDetail(m, false);
  $("#mSave").classList.add("d-none");
  $("#mEdit").classList.remove("d-none");
  const bs = bootstrap.Modal.getOrCreateInstance("#detailModal");
  bs.show();
}

$("#mEdit").onclick = () => {
  if (!currentDetail) return;
  renderDetail(currentDetail, true);
  $("#mEdit").classList.add("d-none");
  $("#mSave").classList.remove("d-none");
};
$("#mSave").onclick = () => {
  if (!currentDetail) return;
  // đọc lại input trong modal, cập nhật vào currentDetail & state.raw
  $("#detailView").querySelectorAll("input[data-k]").forEach(inp=>{
    const k = inp.dataset.k;
    currentDetail[k] = inp.value;
  });
  // đặc biệt join_date_text & age_text nếu user sửa ngày
  if (currentDetail.join_date) {
    currentDetail.join_date_text = ymd(currentDetail.join_date);
    currentDetail.age_text = yearsDiff(currentDetail.join_date);
  }
  $("#mSave").classList.add("d-none");
  $("#mEdit").classList.remove("d-none");
  render();
  renderDetail(currentDetail, false);
};

/* In/Docx riêng trong modal */
$("#mPrint").onclick = () => {
  if (!currentDetail) return;
  const w = window.open("", "_blank", "noopener,noreferrer");
  w.document.write(`
    <html><head><title>Lý lịch Đảng viên</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; }
        .title { text-align:center; font-weight:bold; font-size:20px; margin-bottom:10px; }
        .row { display:flex; margin:6px 0; }
        .col-l { width:220px; }
      </style>
    </head>
    <body>
      <div class="title">Lý lịch Đảng viên</div>
      <div class="row"><div class="col-l">Họ và tên:</div><div>${currentDetail.name}</div></div>
      <div class="row"><div class="col-l">Giới tính:</div><div>${currentDetail.gender}</div></div>
      <div class="row"><div class="col-l">Đơn vị/Bộ phận:</div><div>${currentDetail.unit}</div></div>
      <div class="row"><div class="col-l">Chi bộ:</div><div>${currentDetail.branch}</div></div>
      <div class="row"><div class="col-l">Số thẻ Đảng viên:</div><div>${currentDetail.card_no || ""}</div></div>
      <div class="row"><div class="col-l">Ngày vào Đảng:</div><div>${currentDetail.join_date_text || ""}</div></div>
      <div class="row"><div class="col-l">Tuổi Đảng:</div><div>${currentDetail.age_text}</div></div>
      <div class="row"><div class="col-l">Email:</div><div>${currentDetail.email}</div></div>
      <div class="row"><div class="col-l">Trạng thái:</div><div>${currentDetail.status}</div></div>
      <div class="row"><div class="col-l">Ghi chú:</div><div>${currentDetail.note || ""}</div></div>
      <script>window.onload = () => { window.print(); setTimeout(()=>window.close(), 300); };</script>
    </body></html>
  `);
  w.document.close();
};

$("#mDocx").onclick = async () => {
  if (!currentDetail) return;
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const line = (k, v) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${k}: `, bold: true }),
        new TextRun(String(v ?? "")),
      ],
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children:[ new TextRun({ text:"Lý lịch Đảng viên", bold:true }) ],
          }),
          line("Họ và tên", currentDetail.name),
          line("Giới tính", currentDetail.gender),
          line("Đơn vị/Bộ phận", currentDetail.unit),
          line("Chi bộ", currentDetail.branch),
          line("Số thẻ", currentDetail.card_no || ""),
          line("Ngày vào Đảng", currentDetail.join_date_text || ""),
          line("Tuổi Đảng", currentDetail.age_text),
          line("Email", currentDetail.email),
          line("Trạng thái", currentDetail.status),
          line("Ghi chú", currentDetail.note || ""),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Ly_lich_${currentDetail.name.replace(/\s+/g,"_")}.docx`);
};

/* ========= In danh sách ========= */
function printList() {
  // hiển thị dòng khoảng ngày trong lúc in
  const from = $("#fromDate").value || "…";
  const to   = $("#toDate").value || "…";
  $("#printRange").textContent = `Từ ngày ${from} đến ngày ${to}`;
  $("#printRange").classList.remove("d-none");
  window.print();
  setTimeout(() => $("#printRange").classList.add("d-none"), 200);
}

/* ========= Events ========= */
$("#kw").addEventListener("input", () => { state.page = 1; applyFilter(); });
$("#fromDate").addEventListener("change", () => { state.page = 1; applyFilter(); });
$("#toDate").addEventListener("change", () => { state.page = 1; applyFilter(); });
$("#status").addEventListener("change", () => { state.page = 1; applyFilter(); });
$("#pageSize").addEventListener("change", () => { state.page = 1; applyFilter(); });

$("#btnRefresh").onclick = () => { state.page = 1; applyFilter(); };
$("#btnExcel").onclick = () => exportExcel();
$("#btnDocx").onclick = () => exportDocxList();
$("#btnPrint").onclick = () => printList();

/* ========= init ========= */
(async function init(){
  await fetchAll();
  applyFilter();
})();
