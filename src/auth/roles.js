/* TUH Lab QMS — ระบบผู้ใช้งานและสิทธิ์ (7 ระดับ, เทียบเท่าระบบ Masterlist)
   โมดูลนี้เป็น ESM ล้วน ไม่พึ่ง DOM/localStorage/Node built-in ใดๆ
   เพื่อให้ import ได้ทั้งจากฝั่ง frontend (Vite) และฝั่ง backend (server/index.js) */

export const ROLES = {
  sysadmin: { th: 'ผู้ดูแลระบบ', short: 'SysAdmin', desc: 'สิทธิ์สูงสุด · จัดการระบบและผู้ใช้งานทั้งหมด' },
  head_work: { th: 'หัวหน้างาน', short: 'Head Work', desc: 'อนุมัติ · ประกาศใช้ · แก้ไข · ดูรายชื่อผู้ใช้งาน' },
  head_cat: { th: 'หัวหน้าหมวดงาน', short: 'Head Cat', desc: 'ประกาศใช้ · แก้ไข · ลงทะเบียนเอกสาร' },
  med_tech: { th: 'นักเทคนิคการแพทย์', short: 'Med Tech', desc: 'อ่าน · รับทราบ · เสนอแก้ไข' },
  assistant: { th: 'ผู้ช่วยนักเทคนิคการแพทย์', short: 'Assistant', desc: 'อ่าน · รับทราบ' },
  admin_staff: { th: 'เจ้าหน้าที่ธุรการ', short: 'Admin Staff', desc: 'อ่าน · รับทราบ' },
  doc_manager: { th: 'ผู้จัดการเอกสาร', short: 'Doc Manager', desc: 'ลงทะเบียน · แนบไฟล์ · รับทราบ' },
};

export const ROLE_ORDER = ['sysadmin', 'head_work', 'head_cat', 'med_tech', 'assistant', 'admin_staff', 'doc_manager'];

export const PERM_LIST = ['register', 'publish', 'revise', 'acknowledge', 'approve', 'upload', 'manage', 'propose', 'audit', 'viewUsers'];

export const PERM_LABELS = {
  register: 'ลงทะเบียน / ยกเลิก / ลบเอกสาร',
  publish: 'ประกาศใช้',
  revise: 'บันทึกแก้ไข',
  acknowledge: 'อ่าน / รับทราบ',
  approve: 'อนุมัติ',
  upload: 'แนบไฟล์ / อัปเดตไฟล์แนบ',
  manage: 'จัดการผู้ใช้งาน (เพิ่ม/แก้ไข/ลบ)',
  propose: 'เสนอแก้ไขเอกสาร',
  audit: 'ดูบันทึกกิจกรรม (Audit Log)',
  viewUsers: 'ดูรายชื่อผู้ใช้งาน',
};

// สิทธิ์การทำงานแยกตามระดับ — ต้นแบบเดียวกับ Masterlist (src/lib/reference.ts)
const ROLE_PERMS = {
  sysadmin: ['register', 'publish', 'revise', 'acknowledge', 'approve', 'upload', 'manage', 'audit', 'viewUsers'],
  head_work: ['register', 'publish', 'revise', 'acknowledge', 'approve', 'upload', 'audit', 'viewUsers'],
  head_cat: ['register', 'publish', 'revise', 'acknowledge', 'upload', 'audit'],
  med_tech: ['acknowledge', 'propose'],
  assistant: ['acknowledge'],
  admin_staff: ['acknowledge'],
  doc_manager: ['register', 'upload', 'acknowledge', 'audit'],
};

export function can(role, perm) {
  return (ROLE_PERMS[role] || []).includes(perm);
}
