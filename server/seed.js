/* ข้อมูลตั้งต้น + ฟังก์ชันช่วย ใช้ร่วมกันทั้ง lowdb และ Supabase store */
import path from 'node:path';

export const SEED_USERS = [
  { username: 'sysadmin', password: 'sysadmin123', name: 'ธนกร พงษ์เจริญ', role: 'sysadmin' },
  { username: 'head_work', password: 'headwork123', name: 'หัวหน้างานเทคนิคการแพทย์', role: 'head_work' },
  { username: 'head_cat', password: 'headcat123', name: 'หัวหน้าหมวดงานจุลชีววิทยา', role: 'head_cat' },
  { username: 'med_tech', password: 'medtech123', name: 'นักเทคนิคการแพทย์ทั่วไป', role: 'med_tech' },
  { username: 'assistant', password: 'assistant123', name: 'ผู้ช่วยนักเทคนิคการแพทย์', role: 'assistant' },
  { username: 'admin_staff', password: 'adminstaff123', name: 'เจ้าหน้าที่ธุรการห้องปฏิบัติการ', role: 'admin_staff' },
  { username: 'doc_manager', password: 'docmanager123', name: 'ผู้จัดการเอกสารคุณภาพ', role: 'doc_manager' },
];

export const SEED_DOCS = [
  { no: 'QM-CMTL-001', th: 'คู่มือคุณภาพห้องปฏิบัติการ', type: 'QM', cat: 'CMTL', rev: 4, status: 'effective', updated: '2026-05-12', owner: 'พญ. สุรีย์พร กิตติ', files: ['pdf', 'word'], retention: 10 },
  { no: 'SOP-IMM-014', th: 'การควบคุมคุณภาพการตรวจภูมิคุ้มกัน', type: 'SOP', cat: 'IMM', rev: 2, status: 'effective', updated: '2026-04-28', owner: 'ทนพ. ธนกร พงษ์', files: ['pdf', 'word'], retention: 5 },
  { no: 'WI-MIC-022', th: 'การย้อมสีแกรมและการอ่านผล', type: 'WI', cat: 'MIC', rev: 1, status: 'review', updated: '2026-06-02', owner: 'ทนพญ. กมลชนก ส.', files: ['pdf', 'word', 'url'], retention: 5 },
  { no: 'FM-OPD-103', th: 'แบบฟอร์มขอตรวจทางห้องปฏิบัติการ', type: 'FM', cat: 'OPD', rev: 6, status: 'effective', updated: '2026-03-15', owner: 'นางสาว วราภรณ์ ด.', files: ['pdf'], retention: 2 },
  { no: 'WS-OUT-008', th: 'แบบบันทึกการส่งต่อสิ่งส่งตรวจ', type: 'WS', cat: 'OUT', rev: 3, status: 'draft', updated: '2026-06-10', owner: 'ทนพ. ปรัชญา ม.', files: ['word'], retention: 2 },
  { no: 'ED-THAMC-045', th: 'ทะเบียนเครื่องมือและการสอบเทียบ', type: 'ED', cat: 'THAMC', rev: 2, status: 'controlled', updated: '2026-05-30', owner: 'ทนพญ. อรพิน จ.', files: ['pdf', 'url'], retention: 10 },
  { no: 'SOP-CHE-009', th: 'การควบคุมคุณภาพการตรวจเคมีคลินิก', type: 'SOP', cat: 'CHE', rev: 5, status: 'effective', updated: '2026-05-08', owner: 'ทนพ. ณัฐพล ว.', files: ['pdf', 'word'], retention: 5 },
  { no: 'WI-HEM-031', th: 'การตรวจนับเม็ดเลือดด้วยเครื่องอัตโนมัติ', type: 'WI', cat: 'HEM', rev: 2, status: 'effective', updated: '2026-04-19', owner: 'ทนพญ. ศิริพร ท.', files: ['pdf', 'word'], retention: 5 },
  { no: 'EF-POCT-002', th: 'บันทึกผลควบคุมคุณภาพเครื่องตรวจน้ำตาลปลายนิ้ว', type: 'EF', cat: 'POCT', rev: 1, status: 'effective', updated: '2026-06-01', owner: 'ทนพ. อดิเทพ ค.', files: ['url'], retention: 2 },
  { no: 'SD-CMTL-031', th: 'เอกสารความปลอดภัยทางชีวภาพ', type: 'SD', cat: 'CMTL', rev: 1, status: 'obsolete', updated: '2025-12-01', owner: 'พญ. สุรีย์พร กิตติ', files: ['pdf'], retention: 5 },
  { no: 'RF-IMM-005', th: 'แนวทาง CLSI สำหรับการตรวจภูมิคุ้มกัน', type: 'RF', cat: 'IMM', rev: 1, status: 'effective', updated: '2026-02-14', owner: 'พญ. สุรีย์พร กิตติ', files: ['pdf', 'url'], retention: 10 },
  { no: 'WI-CHE-018', th: 'การสอบเทียบปิเปตอัตโนมัติ', type: 'WI', cat: 'CHE', rev: 3, status: 'approved', updated: '2026-06-05', owner: 'ทนพ. ณัฐพล ว.', files: ['pdf', 'word'], retention: 5 },
];

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// แปลงชนิดไฟล์จากนามสกุล/ไมม์
export function kindFromFile(name, mime) {
  const ext = path.extname(name || '').toLowerCase();
  const m = mime || '';
  if (ext === '.pdf' || m === 'application/pdf') return 'pdf';
  if (['.doc', '.docx'].includes(ext) || m.includes('word')) return 'word';
  if (['.xls', '.xlsx', '.xlsm', '.csv'].includes(ext) || m.includes('sheet') || m.includes('excel') || m.includes('csv')) return 'excel';
  return 'other';
}
