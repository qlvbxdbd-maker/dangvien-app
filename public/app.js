/* ====== Cấu hình API & trạng thái ====== */
const API = 'https://dangvien-app.onrender.com/members'; // API của bạn (GET)
const state = {
  all: [],         // dữ liệu thô (lấy 1 lần về bộ nhớ)
  filtered: [],    // sau khi áp các bộ lọc
  page: 1,
  pageSize: 10,    // hoặc 'all'
  q: '',
  from: '',
  to: '',
  status: '',      // Đang sinh hoạt / Nghỉ sinh hoạt / Chuyển đảng / ''
  exportAll: false,
  currentDetail: null,
};

/* ====== Trợ giúp ====== */
const $ = (sel) => document.querySelector(sel);
const tbody = $('#tbody');
const pageSizeEl = $('#pageSize');
const pageInfo = $('#pageInfo');
const summary = $('#summary');
const printRange = $('#printRange');

function vnNormalize(s=''){
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d');
}
function formatDate(d){
  if(!d) return '';
  const dt = new Date(d);
  if(Number.isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2,'0');
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function partyAge(joinDate){
  if(!joinDate) return '';
  const j = new Date(joinDate);
  const now = new Date();
  const years = now.getFullYear() - j.getFullYear();
  const m = now.getMonth() - j.getMonth();
  const d = now.getDate() - j.getDate();
  let y = years;
  if(m<0 || (m===0 && d<0)) y--;
  return `${Math.max(0,y)} năm`;
}

/* ====== Lấy dữ liệu ====== */
/* Backend của bạn trả về {data, paging}. Ta tải ALL về 1 lần để lọc client. */
async function fetchAll() {
  // tải trang đầu để biết tổng
  const pageSize = 100; // 100/turn để giảm số request
  let page = 1;
  let all = [];
  while(true){
    const url = new URL(API);
    url.searchParams.set('page', page);
    url.searchParams.set('pageSize', pageSize);
    const res = await fetch(url.toString(), {headers:{Accept:'application/json'}});
    if(!res.ok) throw new Error('Không tải được dữ liệu');
    const js = await res.json();
    const list = js.data || js || [];
    all = all.concat(list);
    if(!js.paging || list.length < pageSize) break;
    if(js.paging && page * pageSize >= (js.paging.total || all.length)) break;
    page++;
  }

  // Bổ sung các trường giả lập (vì backend ban đầu chỉ có id,name,email,joined_at)
  state.all = all.map((x,i)=>({
    id: x.id,
    name: x.name,
    gender: x.gender || (i%2===0 ? 'Nam' : 'Nữ'),
    dept: x.dept || '',
    cell: x.cell || '',
    card: x.card || '',
    joined_at: x.joined_at || x.joinedAt || '',
    email: x.email || '',
    status: x.status || 'Đang sinh hoạt',
    note: x.note || ''
  }));
}

/* ====== Áp bộ lọc & phân trang ====== */
function applyFilters(){
  const {q, from, to, status} = state;

  // cập nhật dòng "in" hiển thị khoảng thời gian
  printRange.textContent = (from || to)
    ? `Khoảng thời gian: ${from ? formatDate(from): '…'} – ${to ? formatDate(to) : '…'}`
    : '';

  const qn = vnNormalize(q);
  let arr = state.all.filter(x=>{
    // tìm theo tên/email bỏ dấu
    const okQ = !qn || vnNormalize(x.name).includes(qn) ||
                        vnNormalize(x.email).includes(qn);
    const dt = x.joined_at ? new Date(x.joined_at) : null;
    const okFrom = !from || (dt && dt >= new Date(from));
    const okTo   = !to   || (dt && dt <= new Date(to));
    const okStatus = !status || x.status === status;
    return okQ && okFrom && okTo && okStatus;
  });

  state.filtered = arr;
  render();
}

function getPageItems(){
  if(state.pageSize === 'all') return state.filtered;
  const size = Number(state.pageSize);
  const start = (state.page-1)*size;
  return state.filtered.slice(start, start+size);
}

function render(){
  // Table
  const rows = getPageItems();
  tbody.innerHTML = '';
  rows.forEach((x,idx)=>{
    const tr = document.createElement('tr');

    const stt = (state.pageSize === 'all')
      ? idx+1
      : (idx+1) + (state.page-1)*Number(state.pageSize);

    tr.innerHTML = `
      <td class="stt">${stt}</td>
      <td class="double-link" data-id="${x.id}">${x.name}</td>
      <td>${x.gender||''}</td>
      <td>${x.dept||''}</td>
      <td>${x.cell||''}</td>
      <td>${x.card||''}</td>
      <td>${formatDate(x.joined_at)}</td>
      <td>${partyAge(x.joined_at)}</td>
      <td>${x.email||''}</td>
      <td>${x.status||''}</td>
    `;
    tr.querySelector('.double-link').ondblclick = ()=>openDetail(x.id);
    tbody.appendChild(tr);
  });

  // Footer info & pager
  const total = state.filtered.length;
  const showing = rows.length;
  summary.textContent =
    `Hiển thị ${showing}/${total} – Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

  let totalPages = 1;
  if(state.pageSize === 'all') totalPages = 1;
  else totalPages = Math.max(1, Math.ceil(total/Number(state.pageSize)));

  if(state.page > totalPages) state.page = totalPages;
  pageInfo.textContent = `Trang ${state.page}/${totalPages}`;
  $('#prev').disabled = state.page<=1;
  $('#next').disabled = state.page>=totalPages;
}

/* ====== Sự kiện giao diện ====== */
async function init(){
  await fetchAll();
  applyFilters(); // render lần đầu

  // nhập ô tìm kiếm
  let timer;
  $('#q').addEventListener('input',(e)=>{
    state.q = e.target.value;
    clearTimeout(timer); timer=setTimeout(()=>{state.page=1;applyFilters()},180);
  });

  $('#from').addEventListener('change',e=>{state.from=e.target.value;state.page=1;applyFilters()});
  $('#to').addEventListener('change',e=>{state.to=e.target.value;state.page=1;applyFilters()});
  $('#status').addEventListener('change',e=>{state.status=e.target.value;state.page=1;applyFilters()});

  pageSizeEl.addEventListener('change', e=>{
    state.pageSize = e.target.value==='all'?'all':Number(e.target.value);
    state.page = 1; render();
  });

  $('#prev').onclick = ()=>{ if(state.page>1){state.page--; render();} };
  $('#next').onclick = ()=>{ state.page++; render(); };

  $('#refreshBtn').onclick = async ()=>{
    await fetchAll(); state.page=1; applyFilters();
  };

  // toggle xuất tất cả
  $('#exportAllToggle').onclick = ()=>{
    state.exportAll = !state.exportAll;
    $('#exportAllIcon').textContent = state.exportAll ? '■' : '□';
  };

  $('#btnPrint').onclick = ()=>window.print();
  $('#btnExport').onclick = ()=>exportExcel();
}
init().catch(err=>alert(err.message||err));

/* ====== Excel (.xlsx) ======
   Dùng xlsx-js-style để set style cơ bản.
*/
function buildAoa(items){
  const header = [
    'STT','Họ và tên','Giới tính','Đơn vị/Bộ phận','Chi bộ',
    'Số thẻ Đảng viên','Ngày vào Đảng','Tuổi Đảng','Email','Trạng thái'
  ];
  const rows = [header];
  items.forEach((x,i)=>{
    rows.push([
      i+1, x.name||'', x.gender||'', x.dept||'', x.cell||'',
      x.card||'', formatDate(x.joined_at), partyAge(x.joined_at),
      x.email||'', x.status||''
    ]);
  });
  return rows;
}

function exportExcel(){
  const dataset = state.exportAll ? state.filtered : getPageItems();
  if(!dataset.length){ alert('Không có dữ liệu để xuất'); return; }

  const aoa = buildAoa(dataset);
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // style header
  const range = XLSX.utils.decode_range(ws['!ref']);
  for(let c=range.s.c; c<=range.e.c; c++){
    const cell = XLSX.utils.encode_cell({r:0,c});
    if(!ws[cell]) continue;
    ws[cell].s = {
      font:{bold:true},
      alignment:{horizontal:'center',vertical:'center'},
      fill:{fgColor:{rgb:'DDE8FF'}},
      border:{
        top:{style:'thin',color:{rgb:'999999'}},
        left:{style:'thin',color:{rgb:'999999'}},
        right:{style:'thin',color:{rgb:'999999'}},
        bottom:{style:'thin',color:{rgb:'999999'}}
      }
    };
  }
  ws['!cols'] = [
    {wch:6},{wch:28},{wch:12},{wch:24},{wch:14},
    {wch:18},{wch:14},{wch:10},{wch:26},{wch:16}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dang vien');

  // thêm dòng tiêu đề + khoảng ngày vào A1 bằng sheet mới đẹp hơn
  // (đơn giản – đã style ở header)
  const fileName = `Danh_sach_Dang_vien_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/* ====== Modal chi tiết + DOCX ====== */
function openDetail(id){
  const item = state.all.find(x=>x.id==id);
  if(!item) return;
  state.currentDetail = item;

  $('#mdTitle').textContent = `Thông tin đảng viên – #${item.id}`;
  $('#mdName').value   = item.name||'';
  $('#mdGender').value = item.gender||'';
  $('#mdDept').value   = item.dept||'';
  $('#mdCell').value   = item.cell||'';
  $('#mdCard').value   = item.card||'';
  $('#mdJoin').value   = item.joined_at? new Date(item.joined_at).toISOString().slice(0,10):'';
  $('#mdEmail').value  = item.email||'';
  $('#mdStatus').value = item.status||'';
  $('#mdNote').value   = item.note||'';

  $('#mDetail').classList.add('open');

  // nút In – in modal
  $('#btnPrintDetail').onclick = ()=>{
    // tạm in cả trang – thường sẽ in riêng modal, ở đây cho nhanh
    window.print();
  };

  // lưu tạm (local, không gọi API)
  $('#btnSave').onclick = ()=>{
    Object.assign(item,{
      name:$('#mdName').value.trim(),
      gender:$('#mdGender').value.trim(),
      dept:$('#mdDept').value.trim(),
      cell:$('#mdCell').value.trim(),
      card:$('#mdCard').value.trim(),
      joined_at:$('#mdJoin').value? new Date($('#mdJoin').value):'',
      email:$('#mdEmail').value.trim(),
      status:$('#mdStatus').value.trim(),
      note:$('#mdNote').value.trim(),
    });
    applyFilters();
    alert('Đã lưu tạm ở phiên trình duyệt.');
  };

  // Xuất DOCX
  $('#btnDocx').onclick = ()=>exportDocx(item);
}
function closeDetail(){ $('#mDetail').classList.remove('open'); }

async function exportDocx(item){
  const {Document, Packer, Paragraph, TextRun} = window.docx;

  const p = (t,b=false)=> new Paragraph({
    children:[ new TextRun({text:t,bold:b,font:'Times New Roman'}) ],
    spacing:{after:120}
  });

  const doc = new Document({
    sections:[{
      properties:{},
      children:[
        p('THÔNG TIN ĐẢNG VIÊN', true),
        p(`Họ và tên: ${item.name||''}`),
        p(`Giới tính: ${item.gender||''}`),
        p(`Đơn vị/Bộ phận: ${item.dept||''}`),
        p(`Chi bộ: ${item.cell||''}`),
        p(`Số thẻ Đảng viên: ${item.card||''}`),
        p(`Ngày vào Đảng: ${formatDate(item.joined_at)}`),
        p(`Tuổi Đảng: ${partyAge(item.joined_at)}`),
        p(`Email: ${item.email||''}`),
        p(`Trạng thái: ${item.status||''}`),
        p(`Ghi chú: ${item.note||''}`)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const name = (item.name||'dang_vien').replace(/\s+/g,'_');
  saveBlob(blob, `Chi_tiet_${name}.docx`);
}

/* ====== Lưu blob ====== */
function saveBlob(blob, fileName){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},0);
}
