/* TUH Lab QMS — controlled vocabularies + sample register data.
   Business data only, no styling. */

// 9 document TYPES (ประเภทเอกสาร). `code` is the document-number prefix.
export const DOC_TYPES = [
  { code: 'QM', th: 'คู่มือคุณภาพ', en: 'Quality Manual' },
  { code: 'SP', th: 'ระเบียบปฏิบัติ', en: 'Standard Procedure' },
  { code: 'WI', th: 'วิธีปฏิบัติ', en: 'Work Instruction' },
  { code: 'WS', th: 'แบบบันทึกการปฏิบัติงาน', en: 'Work Sheet' },
  { code: 'FM', th: 'แบบฟอร์มบันทึก', en: 'Form Sheet' },
  { code: 'EF', th: 'บันทึกอิเล็กทรอนิกส์', en: 'Electronic Form' },
  { code: 'ED', th: 'เอกสารอิเล็กทรอนิกส์', en: 'Electronic Document' },
  { code: 'SD', th: 'เอกสารสนับสนุน', en: 'Supporting Document' },
  { code: 'RF', th: 'เอกสารอ้างอิง', en: 'References' },
];

// Work CATEGORIES (หมวดงาน). `code` is the section segment of the doc number.
export const WORK_CATEGORIES = [
  { code: 'OUT', th: 'รับสิ่งส่งตรวจและห้องปฏิบัติการส่งต่อ', en: 'Specimen Receiving & Referral' },
  { code: 'HEM', th: 'โลหิตวิทยา', en: 'Hematology' },
  { code: 'MIC', th: 'จุลทรรศนศาสตร์และปรสิตวิทยา', en: 'Microscopy & Parasitology' },
  { code: 'CHE', th: 'เคมีคลินิก', en: 'Clinical Chemistry' },
  { code: 'IMM', th: 'ภูมิคุ้มกันวิทยา', en: 'Immunology' },
  { code: 'OPD', th: 'บริหารสิ่งส่งตรวจและบริการผู้ป่วยนอก รพธ.', en: 'Specimen Admin & OPD' },
  { code: 'THAMC', th: 'บริหารจัดการสิ่งส่งตรวจและบริการศูนย์การแพทย์', en: 'Specimen Mgmt & Medical Centre' },
  { code: 'POC', th: 'บริหารจัดการเครื่องมือ ณ จุดดูแลผู้ป่วย', en: 'Point-of-Care Testing' },
  { code: 'CMTL', th: 'ศูนย์ปฏิบัติการตรวจวินิจฉัยทางการแพทย์', en: 'Medical Diagnostic Centre' },
  { code: 'ADS', th: 'ธุรการและคลังพัสดุห้องปฏิบัติการ', en: 'Administration & Lab Supplies' },
  { code: 'DIL', th: 'เวชสารสนเทศห้องปฏิบัติการ', en: 'Laboratory Medical Informatics' },
];

// Document-control STATUS (สถานะเอกสาร).
export const STATUS = {
  draft: { th: 'ร่าง' },
  review: { th: 'รอทบทวน' },
  approved: { th: 'อนุมัติแล้ว' },
  effective: { th: 'ประกาศใช้' },
  obsolete: { th: 'ยกเลิกใช้งาน' },
  controlled: { th: 'สำเนาควบคุม' },
};

// ระยะเวลาจัดเก็บเอกสาร (อายุการจัดเก็บก่อนทบทวน/ทำลาย) — หน่วยเป็นปี
export const RETENTION_OPTIONS = [
  { value: 2, label: '2 ปี' },
  { value: 5, label: '5 ปี' },
  { value: 10, label: '10 ปี' },
];

export const DOCS = [
  { no: 'QM-CMTL-001', th: 'คู่มือคุณภาพห้องปฏิบัติการ', type: 'QM', cat: 'CMTL', rev: 4, status: 'effective', updated: '2026-05-12', owner: 'พญ. สุรีย์พร กิตติ', files: ['pdf', 'word'], reads: 142, total: 156, retention: 10 },
  { no: 'SP-IMM-014', th: 'การควบคุมคุณภาพการตรวจภูมิคุ้มกัน', type: 'SP', cat: 'IMM', rev: 2, status: 'effective', updated: '2026-04-28', owner: 'ทนพ. ธนกร พงษ์', files: ['pdf', 'word'], reads: 38, total: 41, retention: 5 },
  { no: 'WI-MIC-022', th: 'การย้อมสีแกรมและการอ่านผล', type: 'WI', cat: 'MIC', rev: 1, status: 'review', updated: '2026-06-02', owner: 'ทนพญ. กมลชนก ส.', files: ['pdf', 'word', 'url'], reads: 0, total: 27, retention: 5 },
  { no: 'FM-OPD-103', th: 'แบบฟอร์มขอตรวจทางห้องปฏิบัติการ', type: 'FM', cat: 'OPD', rev: 6, status: 'effective', updated: '2026-03-15', owner: 'นางสาว วราภรณ์ ด.', files: ['pdf'], reads: 201, total: 210, retention: 2 },
  { no: 'WS-OUT-008', th: 'แบบบันทึกการส่งต่อสิ่งส่งตรวจ', type: 'WS', cat: 'OUT', rev: 3, status: 'draft', updated: '2026-06-10', owner: 'ทนพ. ปรัชญา ม.', files: ['word'], reads: 0, total: 19, retention: 2 },
  { no: 'ED-THAMC-045', th: 'ทะเบียนเครื่องมือและการสอบเทียบ', type: 'ED', cat: 'THAMC', rev: 2, status: 'controlled', updated: '2026-05-30', owner: 'ทนพญ. อรพิน จ.', files: ['pdf', 'url'], reads: 33, total: 35, retention: 10 },
  { no: 'SP-CHE-009', th: 'การควบคุมคุณภาพการตรวจเคมีคลินิก', type: 'SP', cat: 'CHE', rev: 5, status: 'effective', updated: '2026-05-08', owner: 'ทนพ. ณัฐพล ว.', files: ['pdf', 'word'], reads: 47, total: 52, retention: 5 },
  { no: 'WI-HEM-031', th: 'การตรวจนับเม็ดเลือดด้วยเครื่องอัตโนมัติ', type: 'WI', cat: 'HEM', rev: 2, status: 'effective', updated: '2026-04-19', owner: 'ทนพญ. ศิริพร ท.', files: ['pdf', 'word'], reads: 44, total: 48, retention: 5 },
  { no: 'EF-POC-002', th: 'บันทึกผลควบคุมคุณภาพเครื่องตรวจน้ำตาลปลายนิ้ว', type: 'EF', cat: 'POC', rev: 1, status: 'effective', updated: '2026-06-01', owner: 'ทนพ. อดิเทพ ค.', files: ['url'], reads: 12, total: 30, retention: 2 },
  { no: 'SD-CMTL-031', th: 'เอกสารความปลอดภัยทางชีวภาพ', type: 'SD', cat: 'CMTL', rev: 1, status: 'obsolete', updated: '2025-12-01', owner: 'พญ. สุรีย์พร กิตติ', files: ['pdf'], reads: 156, total: 156, retention: 5 },
  { no: 'RF-IMM-005', th: 'แนวทาง CLSI สำหรับการตรวจภูมิคุ้มกัน', type: 'RF', cat: 'IMM', rev: 1, status: 'effective', updated: '2026-02-14', owner: 'พญ. สุรีย์พร กิตติ', files: ['pdf', 'url'], reads: 22, total: 41, retention: 10 },
  { no: 'WI-CHE-018', th: 'การสอบเทียบปิเปตอัตโนมัติ', type: 'WI', cat: 'CHE', rev: 3, status: 'approved', updated: '2026-06-05', owner: 'ทนพ. ณัฐพล ว.', files: ['pdf', 'word'], reads: 0, total: 52, retention: 5 },
];

export const REVISIONS = [
  { rev: 4, date: '2026-05-12', by: 'พญ. สุรีย์พร กิตติ', note: 'ปรับปรุงขอบเขตให้ครอบคลุมหมวดงาน POCT' },
  { rev: 3, date: '2025-11-20', by: 'พญ. สุรีย์พร กิตติ', note: 'แก้ไขผังโครงสร้างองค์กรห้องปฏิบัติการ' },
  { rev: 2, date: '2025-04-03', by: 'ทนพ. ธนกร พงษ์', note: 'เพิ่มนโยบายความเป็นกลางและความลับ' },
  { rev: 1, date: '2024-09-01', by: 'พญ. สุรีย์พร กิตติ', note: 'ประกาศใช้ครั้งแรก' },
];

export const QMS = { DOC_TYPES, WORK_CATEGORIES, STATUS, DOCS, REVISIONS };
export default QMS;
