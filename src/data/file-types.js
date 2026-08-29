/* ชนิดไฟล์แนบที่ระบบอนุญาต — โมดูลนี้ต้องไม่พึ่ง Node หรือ DOM
   เพราะถูก import ทั้งจาก server/index.js และจากหน้าจอฝั่งเบราว์เซอร์

   เหตุผลที่ต้องรวมไว้ที่เดียว: เดิมฝั่งเซิร์ฟเวอร์รับรูปภาพ/PowerPoint ได้
   แต่ accept ของช่องเลือกไฟล์ตั้งไว้แค่ PDF/Word/Excel ผู้ใช้จึงเลือกไฟล์
   ไม่เจอและแจ้งว่า "แนบไฟล์ไม่ได้" ทั้งที่เซิร์ฟเวอร์ยอมรับ

   ต้องตรงกับ src/lib/file-types.ts ของระบบ Masterlist ด้วย
   ไม่งั้นไฟล์เดียวกันแนบได้ระบบหนึ่งแต่อีกระบบปฏิเสธ

   จงใจไม่รับ .svg/.htm/.html/.zip — พาสคริปต์หรือไฟล์อื่นแฝงเข้ามาได้ */

export const ALLOWED_EXT = [
  'pdf',
  'doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf',
  'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'ods', 'csv',
  'ppt', 'pptx', 'ppsx', 'odp',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'heif',
  'txt',
];

export const ALLOWED_EXT_SET = new Set(ALLOWED_EXT);

// ขนาดสูงสุดต่อไฟล์ — เท่ากับระบบ Masterlist เพื่อให้กติกาเหมือนกันทั้งสองระบบ
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '50MB';

// ใช้เป็น accept ของ <input type="file"> ให้ตรงกับที่เซิร์ฟเวอร์รับจริงเสมอ
export const ACCEPT_ATTR = ALLOWED_EXT.map((e) => `.${e}`).join(',');

export const UNSUPPORTED_MSG = (ext) =>
  `ไม่รองรับไฟล์นามสกุล .${ext} — รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ และไฟล์ข้อความ`;
