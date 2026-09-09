/* TUH Lab QMS — frontend API client.
   พูดคุยกับ backend ผ่าน /api (Vite proxy → http://localhost:3001).
   เก็บ JWT ไว้ใน localStorage และแนบ Authorization ทุกคำขอ */

const TOKEN_KEY = 'tuh-qms-token';

// เก็บ token ใน sessionStorage → ปิดแท็บ/เบราว์เซอร์เมื่อไหร่ ระบบ logout อัตโนมัติ
// (refresh หน้าเดิมยังคง login อยู่ เพราะ sessionStorage อยู่ตลอดอายุแท็บ)
// ลบ token เก่าที่อาจค้างใน localStorage จากเวอร์ชันก่อนหน้าทิ้งด้วย
try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));

// ถอด base64url เป็นข้อความ UTF-8 (รองรับอักขระไทยใน payload)
function b64urlToUtf8(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// อ่าน payload จาก JWT (ไม่ตรวจ signature — ใช้แค่ดึง user สำหรับ UI; เซิร์ฟเวอร์ตรวจจริง)
export function decodeToken(token = getToken()) {
  if (!token) return null;
  try {
    const payload = JSON.parse(b64urlToUtf8(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { username: payload.username, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

// รหัสประเภท/หมวดงานเดิม → รหัสใหม่ที่ตรงกับระบบ Masterlist (ฝ่ายสหเวชศาสตร์)
// แปลงตอนรับข้อมูลจาก backend ทันที เพื่อให้เอกสารที่ลงทะเบียนไว้ก่อนหน้านี้ด้วยรหัสเดิม
// ยังกรอง/นับ/แสดงผลถูกต้องเหมือนเอกสารใหม่ทุกประการ
const LEGACY_TYPE = { SP: 'SOP' };
const LEGACY_CAT = { POC: 'POCT' };
function normalizeDoc(d) {
  if (!d) return d;
  return {
    ...d,
    type: LEGACY_TYPE[d.type] || d.type,
    cat: LEGACY_CAT[d.cat] || d.cat,
  };
}
function normalizeDocs(list) {
  return Array.isArray(list) ? list.map(normalizeDoc) : list;
}

async function req(path, { method = 'GET', body, isForm } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    let payload = null;
    try { payload = await res.json(); msg = payload?.error || msg; } catch { /* non-json */ }
    const err = new Error(msg);
    err.status = res.status;
    // เซิร์ฟเวอร์แจ้งว่าบัญชีนี้ต้องตั้งรหัสผ่านใหม่ก่อนใช้งาน
    err.mustChangePassword = !!payload?.mustChangePassword;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

export const api = {
  decodeToken,
  login: (username, password) => req('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => req('/auth/logout', { method: 'POST' }).catch(() => {}),
  changeOwnPassword: (currentPassword, newPassword) =>
    req('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  // เข้าสู่ระบบผ่านลิงก์จาก Masterlist ด้วย token อายุสั้นที่เซ็นมาแล้ว
  ssoLogin: (ssoToken) => req('/auth/sso', { method: 'POST', body: { token: ssoToken } }),
  // ลืมรหัสผ่าน — ตั้งรหัสใหม่เองผ่านลิงก์ที่ส่งไปทางอีเมล
  forgotPassword: (email) => req('/auth/forgot', { method: 'POST', body: { email } }),
  checkResetToken: (token) => req(`/auth/reset/${encodeURIComponent(token)}`),
  resetPassword: (token, password) => req('/auth/reset', { method: 'POST', body: { token, password } }),
  updateMyEmail: (email) => req('/me/email', { method: 'PATCH', body: { email } }),

  /* ดึงรายงานตัวชี้วัดฉบับเต็มมาเปิดในแท็บใหม่
     ต้องดึงผ่าน fetch เพราะ token อยู่ในหัว Authorization ไม่ใช่คุกกี้ —
     ลิงก์ <a href> ธรรมดาจะไม่ติด token ไปด้วยแล้วโดนปฏิเสธ 401 */
  // แบบฟอร์ม Excel กรอกผลรายเดือน — ต้องใช้ fetch เพราะ token อยู่ในหัว Authorization
  downloadKpiTemplate: async (year = 2569) => {
    const res = await fetch(`/api/kpi/template?year=${year}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('ดาวน์โหลดแบบฟอร์มไม่สำเร็จ');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `KPI-Template-${year}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },

  // แดชบอร์ดที่อัปโหลด — ข้อมูลอยู่ที่ระบบทะเบียนกลาง ที่นี่เรียกผ่านเซิร์ฟเวอร์ของตัวเอง
  listKpiDashboards: () => req('/kpi/dashboards'),
  uploadKpiDashboard: async (formData) => {
    const res = await fetch('/api/kpi/dashboards', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'อัปโหลดไม่สำเร็จ');
    return data;
  },
  /* เปิดแดชบอร์ดที่อัปโหลด — ต้องเปิดเป็น URL จริง ไม่ใช่ blob
     เพราะ blob จะได้ origin เดียวกับแอปแล้ว header sandbox หลุด
     ขอตั๋วอายุสั้นก่อนเพราะแท็บใหม่ไม่ส่ง Authorization header ไปด้วย */
  openKpiDashboard: async (id) => {
    const { ticket } = await req(`/kpi/dashboards/${encodeURIComponent(id)}/ticket`, { method: 'POST' });
    window.open(`/api/kpi/dashboards/${encodeURIComponent(id)}/view?t=${encodeURIComponent(ticket)}`, '_blank', 'noopener');
  },

  openKpiReport: async (name) => {
    const token = getToken();
    const res = await fetch(`/api/kpi/report/${encodeURIComponent(name)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(res.status === 401 ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : 'เปิดรายงานไม่สำเร็จ');
    const url = URL.createObjectURL(new Blob([await res.text()], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    // คืนหน่วยความจำหลังเบราว์เซอร์โหลดเสร็จ — เพิกถอนทันทีแท็บใหม่จะเปิดไม่ทัน
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  listDocuments: () => req('/documents').then(normalizeDocs),
  getDocument: (no) => req('/documents/' + encodeURIComponent(no)).then(normalizeDoc),
  createDocument: (formData) => req('/documents', { method: 'POST', body: formData, isForm: true }).then(normalizeDoc),
  updateDocument: (no, patch) => req('/documents/' + encodeURIComponent(no), { method: 'PATCH', body: patch }).then(normalizeDoc),
  deleteDocument: (no) => req('/documents/' + encodeURIComponent(no), { method: 'DELETE' }),
  // แนบไฟล์ใหม่เข้าเอกสารที่ลงทะเบียนไว้แล้ว (ไม่ใช่การทับไฟล์เดิม จึงไม่เพิ่มเลข rev)
  addAttachment: (no, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/documents/' + encodeURIComponent(no) + '/attachments', { method: 'POST', body: fd, isForm: true });
  },
  // อัปเดตไฟล์แนบเป็นเวอร์ชันใหม่ (แทนที่ไฟล์เดิม) — ส่งไฟล์เดียวแบบ FormData
  updateAttachmentFile: (no, id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/documents/' + encodeURIComponent(no) + '/attachments/' + encodeURIComponent(id) + '/version', { method: 'POST', body: fd, isForm: true });
  },

  // ตัวชี้วัดคุณภาพ — ข้อมูลอยู่ที่ระบบ Masterlist เซิร์ฟเวอร์ของเราเรียกต่อให้
  getKpi: (year) => req('/kpi' + (year ? '?year=' + encodeURIComponent(year) : '')),
  saveKpiValues: (fiscalYear, month, entries) =>
    req('/kpi/values', { method: 'POST', body: { fiscalYear, month, entries } }),

  listUsers: () => req('/users'),
  createUser: (u) => req('/users', { method: 'POST', body: u }),
  updateUser: (username, patch) => req('/users/' + encodeURIComponent(username), { method: 'PATCH', body: patch }),
  resetUserPassword: (username, password) => req('/users/' + encodeURIComponent(username) + '/reset-password', { method: 'POST', body: { password } }),
  deleteUser: (username) => req('/users/' + encodeURIComponent(username), { method: 'DELETE' }),

  listLogs: () => req('/logs'),

  // ดึงไฟล์แนบ (พร้อม auth) คืนค่าเป็น Blob
  downloadAttachment: async (id) => {
    const res = await fetch('/api/attachments/' + id + '/download', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('ดาวน์โหลดไฟล์ไม่สำเร็จ');
    return res.blob();
  },

  // ดาวน์โหลดชุดกู้ชีพข้อมูลฉุกเฉิน (ZIP)
  downloadEmergencyKit: async () => {
    const res = await fetch('/api/documents/export/zip', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('ไม่สามารถดาวน์โหลดชุดสำรองฉุกเฉินได้');
    return res.blob();
  },

  getDocumentHistory: (no) => req('/documents/' + encodeURIComponent(no) + '/history'),
  getDocumentAcknowledgments: (no) => req('/documents/' + encodeURIComponent(no) + '/acknowledgments'),
  acknowledgeDocument: (no, password) => req('/documents/' + encodeURIComponent(no) + '/acknowledge', { method: 'POST', body: { password } }),
};

