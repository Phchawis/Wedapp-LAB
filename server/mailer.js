import nodemailer from 'nodemailer';

/* ส่งอีเมลผ่าน SMTP (บัญชี Brevo เดียวกับระบบทะเบียนบุคลากรและระบบทะเบียนเอกสารกลาง)

   ตั้งใจไม่โยน error ออกไป — หน้าลืมรหัสผ่านต้องตอบข้อความเดียวกันเสมอไม่ว่าส่งได้หรือไม่
   ไม่งั้นคนภายนอกจะเดาได้ว่าบัญชีไหนมีอยู่จริงจากข้อความที่ต่างกัน
   ความล้มเหลวบันทึกลง log ของเซิร์ฟเวอร์แทน */

const HOST = process.env.SMTP_HOST || '';
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const FROM = process.env.SMTP_FROM || 'ทะเบียนเอกสารคุณภาพห้องปฏิบัติการ <ahs.tuh.register@gmail.com>';

export const mailerConfigured = Boolean(HOST && USER && PASS);

let transport = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // 587/2525 ใช้ STARTTLS ไม่ใช่ TLS ตั้งแต่ต้น
      auth: { user: USER, pass: PASS },
    });
  }
  return transport;
}

export async function sendMail(to, subject, text, html) {
  if (!mailerConfigured) {
    console.error('[mailer] ยังไม่ได้ตั้งค่า SMTP — ไม่ได้ส่งอีเมลถึง', to);
    return false;
  }
  try {
    await getTransport().sendMail({ from: FROM, to, subject, text, html });
    return true;
  } catch (e) {
    console.error('[mailer] ส่งอีเมลไม่สำเร็จ:', e.message);
    return false;
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** จดหมายลิงก์ตั้งรหัสผ่านใหม่ — อ่านรู้เรื่องแม้เปิดในโปรแกรมที่ไม่แสดง HTML */
export function resetMail(fullName, link, minutes) {
  const subject = 'ตั้งรหัสผ่านใหม่ · ระบบทะเบียนเอกสารคุณภาพห้องปฏิบัติการเทคนิคการแพทย์';
  const text = [
    `เรียน ${fullName}`,
    '',
    'มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของท่านในระบบทะเบียนเอกสารคุณภาพห้องปฏิบัติการ',
    `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ภายใน ${minutes} นาที และใช้ได้ครั้งเดียว)`,
    '',
    link,
    '',
    'หากท่านไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใด ๆ รหัสผ่านเดิมยังใช้ได้ตามปกติ',
    'และโปรดแจ้งผู้ดูแลระบบเพื่อตรวจสอบ',
    '',
    '— ห้องปฏิบัติการเทคนิคการแพทย์ โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ',
  ].join('\n');
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a">
  <p>เรียน ${esc(fullName)}</p>
  <p>มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของท่านในระบบทะเบียนเอกสารคุณภาพห้องปฏิบัติการ</p>
  <p><a href="${esc(link)}" style="display:inline-block;padding:11px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:4px;font-weight:600">ตั้งรหัสผ่านใหม่</a></p>
  <p style="color:#666;font-size:13.5px">ลิงก์ใช้ได้ภายใน ${minutes} นาที และใช้ได้ครั้งเดียว<br>หากกดปุ่มไม่ได้ ให้คัดลอกที่อยู่นี้ไปวางในเบราว์เซอร์:<br><span style="word-break:break-all">${esc(link)}</span></p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:22px 0">
  <p style="color:#666;font-size:13px">หากท่านไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใด ๆ รหัสผ่านเดิมยังใช้ได้ตามปกติ และโปรดแจ้งผู้ดูแลระบบเพื่อตรวจสอบ</p>
  <p style="color:#888;font-size:12.5px">ห้องปฏิบัติการเทคนิคการแพทย์ · โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</p>
</div>`;
  return { subject, text, html };
}

/* ล้างอักขระล่องหนและจุดเกินท้ายโดเมนก่อนใช้เสมอ
   ข้อมูลจริงที่นำเข้ามามีอีเมลที่มี zero-width space ติดอยู่ ซึ่งมองด้วยตาเหมือนปกติ
   แต่ส่งไม่ออกและไม่มี error ให้เห็น */
export function cleanEmail(raw) {
  return String(raw || '')
    .replace(/[​-‍﻿ ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\.+$/, '');
}

export function isValidEmail(v) {
  return Boolean(v) && v.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v);
}
