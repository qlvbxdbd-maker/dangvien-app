/* ===========================
   CHỈ BỔ SUNG / ĐIỀU CHỈNH
   =========================== */

/** Tạo HTML chi tiết – dùng chung cho In & Modal */
function buildMemberDetailHTML(member, title = 'Lý lịch Đảng viên') {
  const T = v => (v == null ? '' : String(v));
  return `
    <div style="font-family:'Times New Roman',serif; line-height:1.6">
      <h2 style="text-align:center; margin:0 0 12px 0">${title}</h2>
      <table style="width:100%; border-collapse:collapse" cellpadding="4">
        <tr><td style="width:220px; font-weight:bold">Họ và tên</td><td>${T(member.name)}</td></tr>
        <tr><td style="font-weight:bold">Giới tính</td><td>${T(member.gender)}</td></tr>
        <tr><td style="font-weight:bold">Đơn vị/Bộ phận</td><td>${T(member.department)}</td></tr>
        <tr><td style="font-weight:bold">Chi bộ</td><td>${T(member.chiBo)}</td></tr>
        <tr><td style="font-weight:bold">Số thẻ Đảng viên</td><td>${T(member.cardNumber)}</td></tr>
        <tr><td style="font-weight:bold">Ngày vào Đảng</td><td>${T(member.joined_at)}</td></tr>
        <tr><td style="font-weight:bold">Tuổi Đảng</td><td>${T(member.partyAge)} năm</td></tr>
        <tr><td style="font-weight:bold">E-mail</td><td>${T(member.email)}</td></tr>
        <tr><td style="font-weight:bold">Trạng thái</td><td>${T(member.status)}</td></tr>
        <tr><td style="font-weight:bold">Ghi chú</td><td>${T(member.note)}</td></tr>
      </table>
    </div>
  `;
}

/** IN chi tiết – KHÔNG còn tab trắng */
function printMemberDetail(member) {
  const html = buildMemberDetailHTML(member, 'Lý lịch Đảng viên');
  const w = window.open('', '_blank');
  w.document.write(`
    <html>
      <head>
        <title>Lý lịch Đảng viên</title>
        <style>
          body{font-family:"Times New Roman",serif; line-height:1.6; padding:18px}
          table{width:100%; border-collapse:collapse}
          td{padding:6px 4px; vertical-align:top}
          h2{text-align:center; margin:0 0 12px 0}
          @media print{ .no-print{display:none} }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

/** Xuất DOCX chi tiết – dùng docx + FileSaver (2 CDN đã thêm trong index.html) */
async function exportMemberDocx(member) {
  if (!window.docx || !window.saveAs) {
    alert('Thư viện xuất DOCX chưa sẵn sàng. Vui lòng tải lại trang.');
    return;
  }
  const {
    Document, Packer, Paragraph, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, TextRun
  } = docx;

  const row = (label, value) => new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [ new Paragraph({ children:[new TextRun({ text: label, bold:true })] }) ]
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [ new Paragraph(String(value ?? '')) ]
      })
    ]
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } }, // 12pt
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Lý lịch Đảng viên",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({ text: " " }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            row("Họ và tên", member.name),
            row("Giới tính", member.gender),
            row("Đơn vị/Bộ phận", member.department),
            row("Chi bộ", member.chiBo),
            row("Số thẻ Đảng viên", member.cardNumber),
            row("Ngày vào Đảng", member.joined_at),
            row("Tuổi Đảng", (member.partyAge!=null?`${member.partyAge} năm`:"")),
            row("E-mail", member.email),
            row("Trạng thái", member.status),
            row("Ghi chú", member.note || "")
          ]
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const safeFile = `Ly-lich-${(member.name||'dang-vien')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9\- ]/g,'').trim().replace(/\s+/g,'-')}.docx`;
  window.saveAs(blob, safeFile);
}

/* ====== GẮN NÚT TRONG MODAL CHI TIẾT ======
   Ở nơi bạn mở modal chi tiết, sau khi fill dữ liệu,
   gán sự kiện cho 2 nút: In & Xuất DOCX
*/
function openMemberDetailModal(member) {
  // ... phần fill dữ liệu modal (bạn đang có) ...
  const btnPrint = document.getElementById('btnPrintMember');
  const btnDocx  = document.getElementById('btnExportMemberDocx');
  if (btnPrint) btnPrint.onclick = () => printMemberDetail(member);
  if (btnDocx)  btnDocx.onclick  = () => exportMemberDocx(member);
}

/* ====== Nút Làm mới (nếu bạn muốn) ====== */
document.getElementById('btnRefresh')?.addEventListener('click', () => {
  document.getElementById('txtSearch').value = '';
  document.getElementById('fromDate').value = '';
  document.getElementById('toDate').value = '';
  document.getElementById('statusFilter').value = 'all';
  // currentPage = 1; // nếu bạn dùng phân trang
  // loadMembers();   // gọi lại API danh sách
});
