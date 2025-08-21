/* =====================================
   CẤU HÌNH
===================================== */
const API_URL = "https://dangvien-app.onrender.com/members"; // endpoint /members
const PAGE = { cur: 1, size: 10 }; // size=all → hiển thị hết

/* =====================================
   TIỆN ÍCH CHUNG
===================================== */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function vnNormalize(str=""){
  return (str+"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d").replace(/[^a-z0-9@.\s\-_/]/g,"");
}

function fmtDate(d){          // yyyy-mm-dd -> dd/mm/yyyy
  if(!d) return "";
  const dt = new Date(d);
  if(Number.isNaN(dt)) return "";
  return dt.toLocaleDateString("vi-VN");
}

function diffYear(from){      // tuổi đảng
  if(!from) return "0 năm";
  const a = new Date(from), b = new Date();
  let y = b.getFullYear() - a.getFullYear();
  const m = b.getMonth() - a.getMonth();
  const d = b.getDate() - a.getDate();
  if(m < 0 || (m===0 && d<0)) y--;
  return `${Math.max(0,y)} năm`;
}

/* =====================================
   DỮ LIỆU & LỌC
===================================== */
let RAW = [];        // tất cả dữ liệu từ API
let VIEW = [];       // dữ liệu sau lọc đang hiển thị
let LASTKW = "";     // cache tìm kiếm

async function loadAll(){
  const res = await fetch(API_URL, {headers:{Accept:"application/json"}});  
  const json = await res.json();

  // Dữ liệu mẫu (mở rộng) nếu API chưa cung cấp đầy đủ
  RAW = (json.data || json || []).map((x,i)=>({
    id: x.id ?? i+1,
    name: x.name ?? x.fullname ?? "",
    email: x.email ?? "",
    gender: x.gender ?? (i%2 ? "Nữ" : "Nam"),
    unit: x.unit ?? "Phòng/ban A",
    branch: x.branch ?? "Chi bộ 1",
    card: x.card ?? "",
    joined_at: x.joined_at ?? new Date().toISOString(),
    status: x.status ?? "Đang sinh hoạt",
    note: x.note ?? ""
  }));
}

function applyFilters(){
  const kw = vnNormalize($("#kw").value);
  const from = $("#from").value ? new Date($("#from").value) : null;
  const to   = $("#to").value   ? new Date($("#to").value)   : null;
  const status = $("#status").value;

  VIEW = RAW.filter(r=>{
    const text = vnNormalize(`${r.name} ${r.email}`);
    if(kw && !text.includes(kw)) return false;

    if(from && new Date(r.joined_at) < from) return false;
    if(to   && new Date(r.joined_at) > to)   return false;

    if(status && r.status !== status) return false;
    return true;
  });

  // Cập nhật ghi chú khoảng ngày cho trang in
  if(from || to){
    $("#rangeNote").textContent =
      `Khoảng thời gian: ${from?fmtDate(from):"…"} – ${to?fmtDate(to):"…"}`;
  }else{
    $("#rangeNote").textContent = "";
  }

  PAGE.cur = 1;
  render();
}

/* =====================================
   HIỂN THỊ BẢNG
===================================== */
function getPageSlice(){
  const sizeSel = $("#size").value;
  PAGE.size = sizeSel === "all" ? Infinity : Number(sizeSel || 10);
  if(PAGE.size === Infinity) return VIEW;
  const start = (PAGE.cur-1) * PAGE.size;
  return VIEW.slice(start, start + PAGE.size);
}

function render(){
  const body = $("#tbl tbody");
  body.innerHTML = "";

  const rows = getPageSlice();
  rows.forEach((r, idx)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="center">${PAGE.size===Infinity ? VIEW.indexOf(r)+1 : ( (PAGE.cur-1)*PAGE.size + idx + 1 )}</td>
      <td class="fit-name dv-name" title="Nháy đúp để xem chi tiết">${r.name}</td>
      <td class="center">${r.gender ?? ""}</td>
      <td>${r.unit ?? ""}</td>
      <td>${r.branch ?? ""}</td>
      <td class="center">${r.card ?? ""}</td>
      <td class="center">${fmtDate(r.joined_at)}</td>
      <td class="center">${diffYear(r.joined_at)}</td>
      <td>${r.email}</td>
      <td>${r.status}</td>
    `;
    tr.dataset.id = r.id;
    tr.querySelector(".dv-name").addEventListener("dblclick", ()=>Detail.open(r.id));
    body.appendChild(tr);
  });

  // meta + phân trang
  $("#meta").textContent = `Hiển thị ${rows.length}/${VIEW.length} – Cập nhật: ${new Date().toLocaleTimeString("vi-VN")}`;
  const totalPage = PAGE.size===Infinity ? 1 : Math.max(1, Math.ceil(VIEW.length / PAGE.size));
  $("#pageInfo").textContent = `Trang ${PAGE.cur}/${totalPage}`;
  $("#prev").disabled = PAGE.cur <= 1;
  $("#next").disabled = PAGE.cur >= totalPage;
}

/* =====================================
   IN – TẠO IFRAME SAU KHI IN TỰ ĐÓNG
===================================== */
function printList(){
  const rows = getPageSlice();      // in phần đang hiển thị (đã lọc)
  const note = $("#rangeNote").textContent ? `<div style="text-align:center;margin:4px 0 8px 0">${$("#rangeNote").textContent}</div>` : "";

  let html = `
    <html><head>
      <meta charset="utf-8" />
      <title>Danh sách Đảng viên</title>
      <style>
        body{font-family:"Times New Roman";font-size:12pt}
        h2{text-align:center;margin:0 0 4mm 0}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #000;padding:4pt}
        th{background:#e6eefb}
        .center{text-align:center}
      </style>
    </head><body>
      <h2>Danh sách Đảng viên</h2>
      ${note}
      <table>
        <thead>
          <tr>
            <th style="width:35pt">STT</th>
            <th>Họ và tên</th>
            <th style="width:55pt">Giới tính</th>
            <th>Đơn vị/Bộ phận</th>
            <th style="width:65pt">Chi bộ</th>
            <th style="width:85pt">Số thẻ Đảng viên</th>
            <th style="width:75pt">Ngày vào Đảng</th>
            <th style="width:55pt">Tuổi Đảng</th>
            <th style="width:160pt">Email</th>
            <th style="width:90pt">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i)=>`
          <tr>
            <td class="center">${i+1}</td>
            <td>${r.name}</td>
            <td class="center">${r.gender??""}</td>
            <td>${r.unit??""}</td>
            <td>${r.branch??""}</td>
            <td class="center">${r.card??""}</td>
            <td class="center">${fmtDate(r.joined_at)}</td>
            <td class="center">${diffYear(r.joined_at)}</td>
            <td>${r.email}</td>
            <td>${r.status}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <script>
        window.onafterprint = () => setTimeout(()=>window.close(), 50);
        window.print();
      <\/script>
    </body></html>
  `;

  const w = window.open("about:blank");
  w.document.open(); w.document.write(html); w.document.close();
}

/* =====================================
   EXCEL (.xlsx) – SheetJS
===================================== */
function exportExcel(){
  const rows = getPageSlice();

  // Chuẩn dữ liệu theo cột hiển thị
  const sheetData = [
    ["STT","Họ và tên","Giới tính","Đơn vị/Bộ phận","Chi bộ","Số thẻ Đảng viên","Ngày vào Đảng","Tuổi Đảng","Email","Trạng thái"],
    ...rows.map((r,i)=>[
      i+1, r.name, r.gender??"", r.unit??"", r.branch??"", r.card??"",
      fmtDate(r.joined_at), diffYear(r.joined_at), r.email, r.status
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // set width
  const wch = [6,24,10,20,12,18,12,10,28,16];
  ws["!cols"] = wch.map(w=>({wch:w}));

  XLSX.utils.book_append_sheet(wb, ws, "Danh sách");
  XLSX.writeFile(wb, `DanhSachDangVien_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* =====================================
   MODAL CHI TIẾT + DOCX
===================================== */
const Dlg = {
  el: $("#dlg"),
  open(){ this.el.classList.add("open"); },
  close(){ this.el.classList.remove("open"); }
};
const Detail = {
  cur: null,
  open(id){
    const r = RAW.find(x=>x.id==id); if(!r) return;
    this.cur = structuredClone(r);
    this.fill(this.cur);
    this.enableEdit(false);
    Dlg.open();
  },
  fill(r){
    $("#f_name").value   = r.name||"";
    $("#f_gender").value = r.gender||"";
    $("#f_unit").value   = r.unit||"";
    $("#f_branch").value = r.branch||"";
    $("#f_card").value   = r.card||"";
    $("#f_join").value   = r.joined_at ? new Date(r.joined_at).toISOString().slice(0,10) : "";
    $("#f_email").value  = r.email||"";
    $("#f_status").value = r.status||"";
    $("#f_note").value   = r.note||"";
  },
  read(){
    return {
      ...this.cur,
      name: $("#f_name").value.trim(),
      gender: $("#f_gender").value.trim(),
      unit: $("#f_unit").value.trim(),
      branch: $("#f_branch").value.trim(),
      card: $("#f_card").value.trim(),
      joined_at: $("#f_join").value? new Date($("#f_join").value).toISOString(): "",
      email: $("#f_email").value.trim(),
      status: $("#f_status").value.trim(),
      note: $("#f_note").value.trim(),
    };
  },
  enableEdit(edit){
    $$("#dlg input, #dlg textarea").forEach(e=>e.disabled=!edit);
    $("#btnEdit").style.display = edit? "none":"inline-block";
    $("#btnSave").style.display = edit? "inline-block":"none";
  },
  save(){
    const r = this.read();
    // Lưu chỉ phía client (demo). Nếu có API PUT/PATCH thì gọi ở đây.
    const idx = RAW.findIndex(x=>x.id==r.id);
    if(idx>-1){ RAW[idx] = r; applyFilters(); }
    this.enableEdit(false);
    alert("Đã lưu (demo). Nếu có API, thay bằng gọi PUT/PATCH).");
  },
  print(){
    const r = this.read();
    const html = `
    <html><head><meta charset="utf-8" />
    <title>Lý lịch Đảng viên</title>
    <style>
      body{font-family:"Times New Roman";font-size:12pt;margin:12mm}
      h2{text-align:center;margin:0 0 6mm 0}
      table{border-collapse:collapse;width:100%}
      td{padding:4pt 6pt}
      .lbl{width:140pt;color:#222}
    </style></head><body>
      <h2>Lý lịch Đảng viên</h2>
      <table>
        <tr><td class="lbl">Họ và tên</td><td>${r.name}</td></tr>
        <tr><td class="lbl">Giới tính</td><td>${r.gender}</td></tr>
        <tr><td class="lbl">Đơn vị/Bộ phận</td><td>${r.unit}</td></tr>
        <tr><td class="lbl">Chi bộ</td><td>${r.branch}</td></tr>
        <tr><td class="lbl">Số thẻ Đảng viên</td><td>${r.card}</td></tr>
        <tr><td class="lbl">Ngày vào Đảng</td><td>${fmtDate(r.joined_at)}</td></tr>
        <tr><td class="lbl">Tuổi Đảng</td><td>${diffYear(r.joined_at)}</td></tr>
        <tr><td class="lbl">Email</td><td>${r.email}</td></tr>
        <tr><td class="lbl">Trạng thái</td><td>${r.status}</td></tr>
        <tr><td class="lbl">Ghi chú</td><td>${r.note??""}</td></tr>
      </table>
      <script>window.onafterprint=()=>setTimeout(()=>window.close(),60);window.print();<\/script>
    </body></html>`;
    const w = window.open("about:blank");
    w.document.open(); w.document.write(html); w.document.close();
  },
  async docx(){
    const r = this.read();
    const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } = docx;

    function row(label, value){
      return new TableRow({
        children:[
          new TableCell({width:{size:28,type:WidthType.PERCENT},
            children:[new Paragraph({children:[new TextRun({text:label,bold:true})]})]}),
          new TableCell({width:{size:72,type:WidthType.PERCENT},
            children:[new Paragraph(String(value||""))]})
        ]
      });
    }

    const doc = new Document({
      sections:[{
        children:[
          new Paragraph({text:"Lý lịch Đảng viên", heading:HeadingLevel.HEADING_1, spacing:{after:120}, alignment:"CENTER"}),
          new Table({
            width:{size:10000, type:WidthType.DXA},
            rows:[
              row("Họ và tên", r.name),
              row("Giới tính", r.gender),
              row("Đơn vị/Bộ phận", r.unit),
              row("Chi bộ", r.branch),
              row("Số thẻ Đảng viên", r.card),
              row("Ngày vào Đảng", fmtDate(r.joined_at)),
              row("Tuổi Đảng", diffYear(r.joined_at)),
              row("Email", r.email),
              row("Trạng thái", r.status),
              row("Ghi chú", r.note)
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `LyLich_${vnNormalize(r.name).replace(/\s+/g,'_') || "dang_vien"}.docx`;
    document.body.appendChild(a); a.click(); a.remove();
  }
};

/* =====================================
   SỰ KIỆN GIAO DIỆN
===================================== */
// tìm kiếm “kiểu Google”: bỏ dấu + không phân biệt hoa/thường + phản hồi sau 120ms
let KW_TIMER=null;
$("#kw").addEventListener("input",()=>{
  clearTimeout(KW_TIMER);
  KW_TIMER = setTimeout(()=>{
    const val = $("#kw").value;
    if(val !== LASTKW){ LASTKW = val; applyFilters(); }
  },120);
});

$("#from").addEventListener("change", applyFilters);
$("#to").addEventListener("change", applyFilters);
$("#status").addEventListener("change", applyFilters);
$("#size").addEventListener("change", ()=>{ PAGE.cur=1; render(); });

$("#refresh").addEventListener("click", applyFilters);
$("#print").addEventListener("click", printList);
$("#excel").addEventListener("click", exportExcel);

$("#prev").addEventListener("click", ()=>{ if(PAGE.cur>1){ PAGE.cur--; render(); }});
$("#next").addEventListener("click", ()=>{ PAGE.cur++; render(); });

/* =====================================
   KHỞI ĐỘNG
===================================== */
(async function init(){
  try{
    await loadAll();
    applyFilters();
  }catch(e){
    alert("Không tải được dữ liệu.\n" + e.message);
  }
})();
