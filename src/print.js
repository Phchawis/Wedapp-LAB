/* พิมพ์ไฟล์แนบได้ทุกชนิด:
   - PDF        → พิมพ์ตรงผ่าน iframe
   - รูปภาพ      → แสดงรูปแล้วพิมพ์
   - Excel/CSV  → แปลงเป็นตาราง HTML แล้วพิมพ์
   - Word .docx → แปลงเป็น HTML (mammoth) แล้วพิมพ์
   - อื่น ๆ (.doc เก่า ฯลฯ) → ดาวน์โหลดให้ไปพิมพ์จากโปรแกรม */
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { api } from './api.js';

const escapeHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function openPrintWindow(title, innerHtml) {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาต popup ของเว็บนี้แล้วลองใหม่');
    return;
  }
  w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:'Sarabun',system-ui,sans-serif;color:#15233b;margin:0;padding:28px}
    h1{font-size:18px;margin:0 0 12px} h2{font-size:14px;margin:18px 0 6px}
    table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px}
    td,th{border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top}
    img{max-width:100%} p{margin:0 0 8px;line-height:1.6}
    @media print{body{padding:0}}
  </style></head><body>${innerHtml}
  <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};window.onafterprint=function(){window.close()};<\/script>
  </body></html>`);
  w.document.close();
}

export async function printAttachment(att) {
  if (att.kind === 'url') { window.open(att.url, '_blank', 'noopener'); return; }

  const blob = await api.downloadAttachment(att.id);
  const name = att.name || 'document';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = att.mime || '';

  // PDF
  if (att.kind === 'pdf' || ext === 'pdf') {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    iframe.src = url;
    iframe.onload = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { window.open(url, '_blank'); } };
    document.body.appendChild(iframe);
    setTimeout(() => { URL.revokeObjectURL(url); iframe.remove(); }, 60000);
    return;
  }

  // Images
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    const url = URL.createObjectURL(blob);
    openPrintWindow(name, `<img src="${url}" alt="${escapeHtml(name)}">`);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  // Excel / CSV → ตาราง
  if (att.kind === 'excel' || ['xlsx', 'xls', 'xlsm', 'csv'].includes(ext)) {
    // CSV อ่านเป็นข้อความ UTF-8 เพื่อให้ภาษาไทยไม่เพี้ยน; Excel อ่านเป็น binary
    const isCsv = ext === 'csv' || mime.includes('csv');
    const wb = isCsv
      ? XLSX.read(new TextDecoder('utf-8').decode(await blob.arrayBuffer()), { type: 'string' })
      : XLSX.read(await blob.arrayBuffer(), { type: 'array' });
    let html = `<h1>${escapeHtml(name)}</h1>`;
    wb.SheetNames.forEach((sn) => { html += `<h2>${escapeHtml(sn)}</h2>` + XLSX.utils.sheet_to_html(wb.Sheets[sn]); });
    openPrintWindow(name, html);
    return;
  }

  // Word (.docx)
  if (ext === 'docx') {
    const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
    openPrintWindow(name, `<h1>${escapeHtml(name)}</h1>${value || '<p>(ไม่มีเนื้อหาที่แปลงได้)</p>'}`);
    return;
  }

  // อื่น ๆ — แปลงเพื่อพิมพ์ไม่ได้ → ดาวน์โหลดแทน
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  window.alert('ไฟล์ชนิดนี้พิมพ์ตรงจากระบบไม่ได้ (รองรับ PDF / Excel / Word .docx / รูปภาพ)\nดาวน์โหลดไฟล์ให้แล้ว — กรุณาเปิดพิมพ์จากโปรแกรม');
}
