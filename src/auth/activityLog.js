/* TUH Lab QMS — บันทึกกิจกรรม (audit log).
   เก็บรายการว่าผู้ใช้คนไหนทำอะไรเมื่อไหร่ ใน localStorage (ต้นแบบ). */

export const LOG_KEY = 'tuh-qms-log-v1';
const LOG_LIMIT = 500;

// ชนิดการกระทำ → ป้ายภาษาไทย + ไอคอน + โทนสี
export const LOG_ACTIONS = {
  'login': { th: 'เข้าสู่ระบบ', icon: 'LogOut', c: 'var(--slate-600)' },
  'logout': { th: 'ออกจากระบบ', icon: 'LogOut', c: 'var(--slate-500)' },
  'doc:create': { th: 'ลงทะเบียนเอกสาร', icon: 'Plus', c: 'var(--green-700)' },
  'doc:publish': { th: 'ประกาศใช้เอกสาร', icon: 'Megaphone', c: 'var(--green-700)' },
  'doc:edit': { th: 'บันทึกแก้ไขเอกสาร', icon: 'PencilLine', c: 'var(--amber-700)' },
  'doc:file-update': { th: 'อัปเดตไฟล์เอกสาร (เวอร์ชันใหม่)', icon: 'Upload', c: 'var(--amber-700)' },
  'doc:obsolete': { th: 'ยกเลิกใช้งานเอกสาร', icon: 'Ban', c: 'var(--red-700)' },
  'doc:delete': { th: 'ลบเอกสาร', icon: 'Trash2', c: 'var(--red-700)' },
  'user:add': { th: 'เพิ่มผู้ใช้งาน', icon: 'UserCog', c: 'var(--blue-700)' },
  'user:edit': { th: 'แก้ไขผู้ใช้งาน', icon: 'PencilLine', c: 'var(--amber-700)' },
  'user:reset-password': { th: 'รีเซ็ตรหัสผ่าน', icon: 'Lock', c: 'var(--blue-700)' },
  'user:delete': { th: 'ลบผู้ใช้งาน', icon: 'UserCog', c: 'var(--red-700)' },
};

export function loadLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

export function saveLog(entries) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable */
  }
}

// สร้างรายการ log ใหม่ (ใส่ไว้บนสุด, จำกัดจำนวน)
export function appendLog(entries, { actor, action, target = '', detail = '' }) {
  if (!actor) return entries;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date().toISOString(),
    username: actor.username,
    name: actor.name,
    role: actor.role,
    action,
    target,
    detail,
  };
  return [entry, ...entries].slice(0, LOG_LIMIT);
}
