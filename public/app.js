/* ====== Cấu hình API & util ====== */
const API_URL = "https://dangvien-app.onrender.com/members"; // REST GET ?page&pageSize, v.v.
const tbody = document.getElementById("tbody");
const q = document.getElementById("q");
const statusSel = document.getElementById("status");
const fromDate = document.getElementById("fromDate");
const toDate   = document.getElementById("toDate");
const pageSizeSel = document.getElementById("pageSize");
const exportAllChk = document.getElementById("exportAll");
const pageInfo = document.getElementById("pageInfo");
const stats = document.getElementById("stats");
const subline = document.getElementById("subline");

const btnRefresh = document.getElementById("btnRefresh");
const btnExcel   = document.getElementById("btnExcel");
const btnPrint   = document.getElementById("btnPrint");
const prevBtn    = document.getElementById("prev");
const nextBtn    = document.getElementById("next");

/* modal */
const dlg = document.getElementById("dlg");
const dlgClose = document.getElementById("dlgClose");
const dlgTitle = document.getElementById("dlgTitle");
const f_name = document.getElementById("f_name");
const f_gender = document.getElementById("f_gender");
const f_unit = document.getElementById("f_unit");
const f_branch = document.getElementById("f_branch");
const f_card = document.getElementById("f_card");
const f_joined = document.getElementById("f_joined");
const f_email = document.getElementById("f_email");
const f_status = document.getElementById("f_status");
const f_note = document.getElementById("f_note");
const btnEdit = document.getElementById("btnEdit");
const btnSave = document.getElementById("btnSave");
const btnDocx = document.getElementById("btnDocx");
const btnPrintOne = document.getElementById("btnPrintOne");

let allData = [];   // cache toàn bộ (nếu server không hỗ trợ page)
let data = [];      // sau lọc
let page = 1;
let pageSize = 10;
let totalPages = 1;
let currentDetail = null;

/* Chuẩn hoá chuỗi: bỏ dấu + lower */
function norm(s=''){
  return s.normalize('NFD')
          .replace(/[\u0300-\u036f]/g,'')
          .replace(/đ/g,'d').replace(/Đ/g,'D')
          .toLowerCase();
}
function formatDateISO(d){
  if(!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toISOString().slice(0,10);
}
function calcAgeParty(joinDate){
  if(!joinDate) return '';
  const a = new Date(joinDate);
  const b = new Date();
  if (isNaN(a)) return '';
  const years = Math.max(0, Math.floor((b - a)/(365.25*24*3600*1000)));
  return `${years} năm`;
}

/* ============ Tải dữ liệu ============ */
async function fetchAll(){
  // Server ở bài trước đã trả đầy đủ khi gọi /members (không phân trang)
  const res = await fetch(API_URL, { headers:{'accept':'application/json'}});
  const js  = await res.json();
  const arr = Array.isArray(js.data) ? js.data : (Array.isArray(js)? js : []);
  // map thêm các trường mẫu (demo)
  allData = arr.map((m, idx) => ({
    id: m.id ?? idx+1,
    name: m.name ?? '',
    email: m.email ?? '',
    joined_at: m.joined_at ?? '',
    gender: m.gender ?? (idx%2 ? 'Nữ' : 'Nam'),
    unit: m.unit ?? 'Phòng/ban A',
    branch: m.branch ?? 'Chi bộ 1',
    card_no: m.card_no ?? '',
    status: m.status ?? 'Đang sinh hoạt',
    note: m.note ?? ''
  }));
}

/* ============ Lọc + phân trang + render ============ */
function applyFilters(){
  const s = norm(q.value.trim());
  const st = statusSel.value;
  const f = fromDate.value ? new Date(fromDate.value) : null;
  const t = toDate.value ? new Date(toDate.value) : null;

  data = allData.filter(x=>{
    const key = norm(`${x.name} ${x.email}`);
    if (s && !key.includes(s)) return false;

    if (st && x.status !== st) return false;

    if (f || t){
      const j = new Date(x.joined_at);
      if (isNaN(j)) return false;
      if (f && j < f) return false;
      if (t && j > t) return false;
    }
    return true;
  });

  // phân trang
  pageSize = pageSizeSel.value === 'all' ? data.length || 1 : Number(pageSizeSel.value);
  totalPages = Math.max(1, Math.ceil(data.length / (pageSize||1)));
  if (page>totalPages) page = totalPages;

  renderTable();
  updateFooter();
}

function renderTable(){
  tbody.innerHTML = '';
  const start = (page-1)*pageSize;
  const end = Math.min(data.length, start + pageSize);
  const rows = (pageSizeSel.value==='all') ? data : data.slice(start, end);

  rows.forEach((x, i)=>{
    const tr = document.createElement('tr');

    const stt = (pageSizeSel.value==='all') ? (i+1) : (start+i+1);

    tr.innerHTML = `
      <td class="nowrap">${stt}</td>
      <td class="nowrap" title="${x.name}">${x.name}</td>
      <td>${x.gender||''}</td>
      <td>${x.unit||''}</td>
      <td>${x.branch||''}</td>
      <td>${x.card_no||''}</td>
      <td class="nowrap">${formatDateISO(x.joined_at)}</td>
      <td>${calcAgeParty(x.joined_at)}</td>
      <td class="nowrap" title="${x.email||''}">${x.email||''}</td>
      <td>${x.status||''}</td>
    `;
    // dblclick vào cột tên
    tr.children[1].style.cursor='zoom-in';
    tr.children[1].ondblclick = ()=>openDetail(x);

    tbody.appendChild(tr);
  });
}

function updateFooter(){
  stats.textContent = `Hiển thị ${data.length ? Math.min(data.length, page*pageSize) - ((page-1)*pageSize) : 0}/${data.length} – Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;
  pageInfo.textContent = `Trang ${page}/${totalPages}`;
  const ftxt = (fromDate.value || toDate.value)
    ? `Từ ngày ${fromDate.value||'…'} – Đến ngày ${toDate.value||'…'}`
    : '';
  subline.textContent = ftxt;
}

/* ============ Excel (xlsx) ============ */
function exportExcel(){
  const rows = exportAllChk.checked ? data : (()=>{ // theo phân trang
    const start = (page-1)*pageSize;
    const end = Math.min(data.length, start+pageSize);
    return data.slice(start, end);
  })();

  if (!rows.length){ alert("Không có dữ liệu để xuất."); return; }

  // Chuẩn hoá thành mảng object đơn giản
  const out = rows.map((x, idx)=>({
    STT: idx + 1,
    "Họ và tên": x.name || '',
    "Giới tính": x.gender || '',
    "Đơn vị/Bộ phận": x.unit || '',
    "Chi bộ": x.branch || '',
    "Số thẻ Đảng viên": x.card_no || '',
    "Ngày vào Đảng": formatDateISO(x.joined_at),
    "Tuổi Đảng": calcAgeParty(x.joined_at),
    "Email": x.email || '',
    "Trạng thái": x.status || ''
  }));

  const ws = XLSX.utils.json_to_sheet(out, {origin: "A2"});
  // hàng tiêu đề
  const headers = Object.keys(out[0]);
  headers.forEach((h, i)=>{ ws[XLSX.utils.encode_cell({r:1, c:i})] = { t:'s', v:h }; });
  ws['!cols'] = [
    {wch:6},{wch:24},{wch:10},{wch:22},{wch:18},{wch:16},{wch:12},{wch:10},{wch:28},{wch:16}
  ];

  // Tiêu đề + dòng thời gian
  const title = [["Danh sách Đảng viên"], [subline.textContent||""]];
  const ws2 = XLSX.utils.aoa_to_sheet(title);
  XLSX.utils.sheet_add_json(ws2, out, {origin:"A4"});
  ws2['!cols'] = ws['!cols'];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws2, "Danh sách");

  try{
    const buf = XLSX.write(wb, {type:'array', bookType:'xlsx'});
    saveAs(new Blob([buf],{type:"application/octet-stream"}), "Danh_sach_Dang_vien.xlsx");
  }catch(e){
    console.error(e);
    alert("Xuất Excel thất bại!");
  }
}

/* ============ In danh sách ============ */
function printList(){
  window.print();
}

/* ============ Modal chi tiết ============ */
function openDetail(x){
  currentDetail = x;
  dlgTitle.textContent = `Chi tiết Đảng viên — ${x.name}`;
  f_name.value = x.name || '';
  f_gender.value = x.gender || 'Nam';
  f_unit.value = x.unit || '';
  f_branch.value = x.branch || '';
  f_card.value = x.card_no || '';
  f_joined.value = formatDateISO(x.joined_at);
  f_email.value = x.email || '';
  f_status.value = x.status || 'Đang sinh hoạt';
  f_note.value = x.note || '';

  setEditable(false);
  dlg.classList.add('show');
}
function closeDetail(){ dlg.classList.remove('show'); }
dlgClose.onclick = closeDetail;

function setEditable(en){
  [f_name,f_gender,f_unit,f_branch,f_card,f_joined,f_email,f_status,f_note]
    .forEach(el=>el.disabled = !en);
  btnSave.disabled = !en;
  btnEdit.disabled = en;
}
btnEdit.onclick = ()=> setEditable(true);

btnSave.onclick = async ()=>{
  if(!currentDetail) return;
  // cập nhật local
  currentDetail.name = f_name.value.trim();
  currentDetail.gender = f_gender.value;
  currentDetail.unit = f_unit.value.trim();
  currentDetail.branch = f_branch.value.trim();
  currentDetail.card_no = f_card.value.trim();
  currentDetail.joined_at = f_joined.value;
  currentDetail.email = f_email.value.trim();
  currentDetail.status = f_status.value;
  currentDetail.note = f_note.value.trim();

  // thử gửi lên server (nếu có hỗ trợ)
  try{
    await fetch(`${API_URL}/${currentDetail.id}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(currentDetail)
    });
  }catch(e){
    console.warn("PUT bị chặn hoặc không hỗ trợ – lưu ở UI:", e);
  }
  // render lại
  applyFilters();
  setEditable(false);
  alert("Đã lưu thay đổi.");
};

/* In chi tiết 1 đảng viên (theo mẫu gọn) */
btnPrintOne.onclick = ()=>{
  const w = window.open("", "_blank");
  const x = currentDetail;
  const html = `
    <html><head>
      <meta charset="utf-8"/>
      <title>Lý lịch Đảng viên</title>
      <style>
        body{ font-family:"Times New Roman", Times, serif; }
        h2{ text-align:center; margin:0 0 8px; }
        .grid{ display:grid; grid-template-columns: 220px 1fr; row-gap:8px; column-gap:10px; }
        .row{ display:contents; }
        .label{ color:#444; }
        @page{ size:A4; margin:15mm; }
      </style>
    </head>
    <body>
      <h2>Lý lịch Đảng viên</h2>
      <div class="grid">
        <div class="label">Họ và tên</div><div>${x.name||''}</div>
        <div class="label">Giới tính</div><div>${x.gender||''}</div>
        <div class="label">Đơn vị/Bộ phận</div><div>${x.unit||''}</div>
        <div class="label">Chi bộ</div><div>${x.branch||''}</div>
        <div class="label">Số thẻ Đảng viên</div><div>${x.card_no||''}</div>
        <div class="label">Ngày vào Đảng</div><div>${formatDateISO(x.joined_at)}</div>
        <div class="label">Tuổi Đảng</div><div>${calcAgeParty(x.joined_at)}</div>
        <div class="label">Email</div><div>${x.email||''}</div>
        <div class="label">Trạng thái</div><div>${x.status||''}</div>
        <div class="label">Ghi chú</div><div>${x.note||''}</div>
      </div>
      <script>window.onload=()=>window.print();</script>
    </body></html>`;
  w.document.write(html); w.document.close();
};

/* DOCX chi tiết một đảng viên */
btnDocx.onclick = async ()=>{
  if(!currentDetail) return;
  const {Document, Packer, Paragraph, TextRun, HeadingLevel} = docx;

  const x = currentDetail;

  const doc = new Document({
    styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } }
  });

  function p(label, value){
    return new Paragraph({
      children:[
        new TextRun({ text: `${label}: `, bold:true }),
        new TextRun({ text: value || "" })
      ]
    });
  }

  doc.addSection({
    properties:{ page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, // 720 = 1/2.54cm
    children: [
      new Paragraph({ text: "Lý lịch Đảng viên", heading: HeadingLevel.HEADING_1, alignment: docx.AlignmentType.CENTER }),
      new Paragraph({ text: "" }),
      p("Họ và tên", x.name),
      p("Giới tính", x.gender),
      p("Đơn vị/Bộ phận", x.unit),
      p("Chi bộ", x.branch),
      p("Số thẻ Đảng viên", x.card_no),
      p("Ngày vào Đảng", formatDateISO(x.joined_at)),
      p("Tuổi Đảng", calcAgeParty(x.joined_at)),
      p("Email", x.email),
      p("Trạng thái", x.status),
      p("Ghi chú", x.note)
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Ly_lich_Dang_vien_${(x.name||'').replace(/\s+/g,'_')}.docx`);
};

/* ============ Sự kiện ============ */
[q,statusSel,fromDate,toDate,pageSizeSel].forEach(el=>{
  el.addEventListener('input', ()=>{ page=1; applyFilters(); });
});
btnRefresh.onclick = ()=>{ page=1; q.value=''; statusSel.value=''; fromDate.value=''; toDate.value=''; applyFilters(); };
prevBtn.onclick = ()=>{ if(page>1){ page--; renderTable(); updateFooter(); } };
nextBtn.onclick = ()=>{ if(page<totalPages){ page++; renderTable(); updateFooter(); } };
btnExcel.onclick = exportExcel;
btnPrint.onclick = printList;

window.addEventListener('keydown', (e)=>{
  if(e.key==='Escape') closeDetail();
});

/* ============ Khởi chạy ============ */
(async function init(){
  await fetchAll();
  applyFilters();
})();
