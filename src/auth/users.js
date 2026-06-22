/* TUH Lab QMS — ระบบผู้ใช้งานและสิทธิ์ (3 ระดับ).

   ⚠️ ต้นแบบเท่านั้น: รหัสผ่านถูกเก็บแบบ plaintext ใน localStorage ของเบราว์เซอร์
   ไม่เหมาะกับการใช้งานจริง — ระบบจริงต้องยืนยันตัวตนและแฮชรหัสผ่านที่ฝั่งเซิร์ฟเวอร์ */

export const USERS_KEY = 'tuh-qms-users-v1';

// 3 ระดับสิทธิ์
export const ROLES = {
  creator: { th: 'ผู้ดูแลสูงสุด', short: 'Creator', desc: 'แก้ไขได้ทุกอย่าง' },
  admin: { th: 'ผู้ดูแลระบบ', short: 'Admin', desc: 'จัดการผู้ใช้ · นำเข้า/ลบเอกสาร' },
  user: { th: 'ผู้ใช้งาน', short: 'User', desc: 'ดู ดาวน์โหลด และพิมพ์เอกสาร' },
};

export const ROLE_ORDER = ['creator', 'admin', 'user'];

// สิทธิ์การทำงานแยกตามระดับ
const PERMISSIONS = {
  creator: ['users:manage', 'docs:create', 'docs:delete', 'docs:edit', 'docs:view', 'docs:export'],
  admin: ['users:manage', 'docs:create', 'docs:delete', 'docs:view', 'docs:export'],
  user: ['docs:view', 'docs:export'],
};

export function can(role, action) {
  return (PERMISSIONS[role] || []).includes(action);
}

// บัญชีตั้งต้น (ใช้ล็อกอินครั้งแรก)
export const DEFAULT_USERS = [
  { username: 'creator', password: 'creator123', name: 'ธนกร พงษ์เจริญ', role: 'creator' },
  { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ', role: 'admin' },
  { username: 'user', password: 'user123', name: 'ผู้ใช้งานทั่วไป', role: 'user' },
];

export function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_USERS;
}

export function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* storage unavailable */
  }
}

// ตรวจสอบชื่อผู้ใช้/รหัสผ่าน — คืนค่า user (ไม่รวมรหัสผ่าน) หรือ null
export function authenticate(users, username, password) {
  const u = users.find(
    (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
  );
  if (!u) return null;
  return { username: u.username, name: u.name, role: u.role };
}
