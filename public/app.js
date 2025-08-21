// ========== CẤU HÌNH ==========
const API_URL = "https://dangvien-app.onrender.com/members"; // endpoint JSON
// ==============================

// Trạng thái UI / phân trang
let state = {
  page: 1,
  pageSize: 10,
  q: "",
  from: "",
  to: "",
  status: "",
  data: [],
  total: 0,
  lastUpdated: ""
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const qInput   = $("#q");
const fromI    = $("#from");
const toI      = $("#to");
const statusI  = $("#status");
const pageSizeI= $("#pageSize");
const exportAllI = $("#exportAll");
const refreshBtn= $("#refresh");
const btnExcel  = $("#btnExcel");
const btnPrint  = $("#btnPrint");
const prevBtn   = $("#prev");
const nextBtn   = $("#next");

const tbody   = $("#tbody");
const pageInfo= $("#pageInfo");
const footInfo= $("#footInfo");

const modal   = $("#modal");
const btnClose= $("#btnClose");
const btnEdit = $("#btnEdit");
const btnPrintDetail = $("#btnPrintDetail");
const btnDocx = $("#btnDocx");
const detailGrid = $("#detailGrid");

let currentDetail = null;

// ======= Helpers =======
function formatDateISO(d){
  if(!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fromISO(dISO){
  // server có thể trả ISO hoặc 'YYYY-MM-DDTHH:mm:ssZ'
  const dt = new Date(dISO);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function calcPartyAge(joinISO){
  const d = fromISO(joinISO);
  if(!d) return "";
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  let days = now.getDate() - d.getDate();
  if (days < 0){ months--; }
  if (months < 0){ years--; months+=12; }
  if (years < 0) return "0 năm";
  if (years === 0 && months <= 0) return "0 năm";
  return months>0 ? `${years} năm ${months} tháng` : `${years} năm`;
}

function pick(v, def=""){ return v==null? def : String(v); }

// tải 1 trang
async function fetchPage(page, pageSize, params){
  const url = new URL(API_URL);
  url.searchParams.set("page", page);
  url.searchParams.set("pageSize", pageSize);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  if (params.status) url.searchParams.set("status", params.status);

  const res = await fetch(url.toString(), { headers: { "Accept":"application/json" }});
  if(!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json(); // {data:[], paging:{page,pageSize,total}}
}

// tải tất cả (khi chọn pageSize = all hoặc xuấtAll)
async function fetchAll(params){
  const first = await fetchPage(1, 200, params);
  let all = first.data || [];
  const total = first.paging?.total ?? all.length;
  let page = 2;
  while(all.length < total){
    const nxt = await fetchPage(page, 200, params);
    all = all.concat(nxt.data||[]);
    page++;
    if ((nxt.data||[]).length===0) break;
  }
  return { data: all, total };
}

// render bảng
function renderTable(){
  tbody.innerHTML = "";
  const startIndex = (state.page-1) * state.pageSize;
  const pageData = state.pageSize === "all" ? state.data : state.data.slice(startIndex, startIndex + Number(state.pageSize));

  pageData.forEach((m, idx) => {
    const tr = document.createElement("tr");

    const stt = state.pageSize==="all" ? idx+1 : startIndex + idx + 1;

    const cells = [
      stt,
      pick(m.name),
      pick(m.gender),
      pick(m.department),
      pick(m.branch),
      pick(m.member_no),
      formatDateISO(m.joined_at),
      calcPartyAge(m.joined_at),
      pick(m.email),
      pick(m.status)
    ];

    cells.forEach((val, i) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
      // double-click vào Họ và tên mở chi tiết
      if (i===1){
        td.style.cursor = "pointer";
        td.ondblclick = () => openDetail(m);
      }
    });
    tbody.appendChild(tr);
  });

  const total = state.total;
  const totalPages = state.pageSize==="all" ? 1 : Math.max(1, Math.ceil(total / Number(state.pageSize)));
  pageInfo.textContent = `Trang ${state.page}/${totalPages}`;
  footInfo.textContent = `Hiển thị ${pageData.length}/${total} · Cập nhật: ${state.lastUpdated || "--"}`;

  prevBtn.disabled = state.page<=1 || state.pageSize==="all";
  nextBtn.disabled = state.page>=totalPages || state.pageSize==="all";
}

// mở modal chi tiết
function openDetail(m){
  currentDetail = m;
  detailGrid.innerHTML = "";
  const rows = [
    ["Họ và tên", pick(m.name)],
    ["Giới tính", pick(m.gender)],
    ["Đơn vị/Bộ phận", pick(m.department)],
    ["Chi bộ", pick(m.branch)],
    ["Số thẻ Đảng viên", pick(m.member_no)],
    ["Ngày vào Đảng", formatDateISO(m.joined_at)],
    ["Tuổi Đảng", calcPartyAge(m.joined_at)],
    ["E‑mail", pick(m.email)],
    ["Trạng thái", pick(m.status)]
  ];
  for (const [label, val] of rows){
    const l = document.createElement("div"); l.className="label"; l.textContent = label;
    const v = document.createElement("div"); v.textContent = val;
    detailGrid.append(l, v);
  }
  modal.classList.add("show");
}

// In toàn bảng
function printTable(){
  window.print();
}

// In modal chi tiết
function printDetail(){
  const w = window.open("", "_blank");
  if(!w) return;
  const title = currentDetail?.name || "Đảng viên";
  const html = `
  <html><head><meta charset="utf-8" />
  <title>${title}</title>
  <style>
  body{font-family:"Times New Roman", Times, serif; line-height:1.6; padding:24px}
  h2{margin:0 0 12px 0}
  .grid{display:grid; grid-template-columns: 200px 1fr; gap:6px 12px}
  .grid div{ padding:6px 0; border-bottom:1px dotted #999}
  .label{ font-weight:700}
  </style>
  </head><body onload="window.print(); setTimeout(()=>window.close(), 300)">
    <h2>Thông tin đảng viên</h2>
    <div class="grid">
      ${detailGrid.innerHTML}
    </div>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}

// Xuất DOCX 1 đảng viên (từ modal)
async function exportDocx(){
  if(!currentDetail){
    alert("Chưa chọn đảng viên.");
    return;
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

  function line(label, val){
    return new Paragraph({
      spacing:{ after: 120 },
      children:[
        new TextRun({ text: `${label}: `, bold:true }),
        new TextRun({ text: String(val||"") })
      ]
    });
  }

  const doc = new Document({
    creator: "Đảng viên App",
    title: `Thong tin dang vien - ${currentDetail.name}`,
    sections:[{
      properties:{},
      children:[
        new Paragraph({ text:"THÔNG TIN ĐẢNG VIÊN", heading:HeadingLevel.HEADING_1 }),
        new Paragraph({ text:" "}),
        line("Họ và tên", currentDetail.name),
        line("Giới tính", currentDetail.gender),
        line("Đơn vị/Bộ phận", currentDetail.department),
        line("Chi bộ", currentDetail.branch),
        line("Số thẻ Đảng viên", currentDetail.member_no),
        line("Ngày vào Đảng", formatDateISO(currentDetail.joined_at)),
        line("Tuổi Đảng", calcPartyAge(currentDetail.joined_at)),
        line("E‑mail", currentDetail.email),
        line("Trạng thái", currentDetail.status)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Dang_vien_${(currentDetail.name||"").replace(/\s+/g,"_")}.docx`;
  if (window.saveAs) window.saveAs(blob, filename);
  else {
    // fallback
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

// Xuất Excel (xlsx) theo lọc và tùy chọn "Xuất tất cả"
async function exportExcel(){
  try{
    // Nếu chọn "Xuất tất cả" → lấy tất cả theo bộ lọc hiện tại
    let rows = [];
    if (exportAllI.checked || pageSizeI.value === "all"){
      const all = await fetchAll({
        q: state.q, from: state.from, to: state.to, status: state.status
      });
      rows = all.data;
    } else {
      // chỉ dữ liệu đang hiển thị trong bảng (trang hiện tại)
      const startIndex = (state.page-1) * state.pageSize;
      rows = state.data.slice(startIndex, startIndex + Number(state.pageSize));
    }

    // Map cột theo yêu cầu
    let stt = 1;
    const mapped = rows.map(m => ({
      "STT": stt++,
      "Họ và tên": pick(m.name),
      "Giới tính": pick(m.gender),
      "Đơn vị/Bộ phận": pick(m.department),
      "Chi bộ": pick(m.branch),
      "Số thẻ Đảng viên": pick(m.member_no),
      "Ngày vào Đảng": formatDateISO(m.joined_at),
      "Tuổi Đảng": calcPartyAge(m.joined_at),
      "Email": pick(m.email),
      "Trạng thái": pick(m.status)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(mapped, { header: Object.keys(mapped[0] || {"STT":""}) });
    XLSX.utils.book_append_sheet(wb, ws, "Dang vien");

    const fname = "Danh_sach_Dang_vien.xlsx";
    XLSX.writeFile(wb, fname);
  }catch(err){
    console.error(err);
    alert("Xuất Excel thất bại!");
  }
}

// nạp dữ liệu từ server theo bộ lọc
async function loadData(){
  try{
    const now = new Date();
    state.lastUpdated = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} ${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

    const params = { q: state.q, from: state.from, to: state.to, status: state.status };
    if (state.pageSize === "all"){
      const full = await fetchAll(params);
      state.data = full.data || [];
      state.total = full.total || state.data.length;
      state.page = 1; // 1 trang duy nhất
    } else {
      // để đồng bộ total khi chuyển trang
      const first = await fetchPage(state.page, state.pageSize, params);
      state.data = [];
      state.total = first.paging?.total ?? (first.data?.length || 0);

      // để hiển thị đúng phân trang hiện tại, ta giữ mảng "ảo" chứa tất cả đã tải đến
      // nhưng render sẽ chỉ cắt theo trang hiện tại
      // tải thêm các trang trước đó (tùy yêu cầu có thể bỏ)
      // Ở đây chỉ cần trang hiện tại là đủ:
      // => ta sẽ lưu toàn bộ data; với ít bản ghi vẫn ok
      const all = await fetchAll(params);
      state.data = all.data || [];
      state.total = all.total || state.data.length;
    }

    renderTable();
  }catch(err){
    console.error(err);
    alert("Không tải được dữ liệu.");
  }
}

// ====== Sự kiện ======
qInput.addEventListener("input", () => { state.q = qInput.value.trim(); state.page=1; loadData(); });
fromI.addEventListener("change", () => { state.from = fromI.value; state.page=1; loadData(); });
toI.addEventListener("change",   () => { state.to   = toI.value; state.page=1; loadData(); });
statusI.addEventListener("change", () => { state.status=statusI.value; state.page=1; loadData(); });

pageSizeI.addEventListener("change", () => {
  state.pageSize = pageSizeI.value === "all" ? "all" : Number(pageSizeI.value);
  state.page = 1;
  loadData();
});

refreshBtn.addEventListener("click", () => loadData());
prevBtn.addEventListener("click", () => { if(state.page>1){ state.page--; renderTable(); }});
nextBtn.addEventListener("click", () => {
  const totalPages = state.pageSize==="all" ? 1 : Math.max(1, Math.ceil(state.total / Number(state.pageSize)));
  if(state.page<totalPages){ state.page++; renderTable(); }
});

btnExcel.addEventListener("click", exportExcel);
btnPrint.addEventListener("click", printTable);

btnClose.addEventListener("click", () => modal.classList.remove("show"));
btnPrintDetail.addEventListener("click", printDetail);
btnDocx.addEventListener("click", exportDocx);
btnEdit.addEventListener("click", () => {
  alert("Nút Sửa mới là placeholder. Bạn có thể nối API cập nhật để lưu thông tin tại đây.");
});

// ====== Khởi động ======
(function init(){
  // giá trị mặc định
  state.page = 1;
  state.pageSize = 10;
  loadData();
})();
