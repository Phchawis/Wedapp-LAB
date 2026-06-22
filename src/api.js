/* TUH Lab QMS — frontend API client.
   พูดคุยกับ backend ผ่าน /api (Vite proxy → http://localhost:3001).
   เก็บ JWT ไว้ใน localStorage และแนบ Authorization ทุกคำขอ */

const TOKEN_KEY = 'tuh-qms-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

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
    try { msg = (await res.json()).error || msg; } catch { /* non-json */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

export const api = {
  login: (username, password) => req('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => req('/auth/logout', { method: 'POST' }).catch(() => {}),

  listDocuments: () => req('/documents'),
  getDocument: (no) => req('/documents/' + encodeURIComponent(no)),
  createDocument: (formData) => req('/documents', { method: 'POST', body: formData, isForm: true }),
  updateDocument: (no, patch) => req('/documents/' + encodeURIComponent(no), { method: 'PATCH', body: patch }),
  deleteDocument: (no) => req('/documents/' + encodeURIComponent(no), { method: 'DELETE' }),

  listUsers: () => req('/users'),
  createUser: (u) => req('/users', { method: 'POST', body: u }),
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
};
