/* ทดสอบ API จริงแบบ end-to-end (ยิง HTTP เข้าเซิร์ฟเวอร์จริง + ฐานข้อมูล lowdb ชั่วคราว)
   เน้นเส้นทางที่เคยเป็นช่องโหว่จริง เพื่อกันไม่ให้กลับมาอีก (regression test)

   รันด้วย: npm test */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3399;
const BASE = `http://127.0.0.1:${PORT}`;

let server;
let tmpDir;

const api = async (p, opts = {}) => {
  const res = await fetch(BASE + p, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* บาง response ไม่ใช่ JSON */ }
  return { status: res.status, body };
};

const login = async (username, password) => {
  const { body } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  return body?.token;
};
const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  // ฐานข้อมูลชั่วคราวแยกจากของจริง (lowdb เขียนไฟล์ในโฟลเดอร์นี้)
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qms-test-'));

  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',            // ไม่ใช่ production → lowdb seed บัญชีทดสอบให้
      QMS_API_PORT: String(PORT),
      JWT_SECRET: 'test-secret-for-automated-tests-only',
      QMS_DATA_DIR: tmpDir,
      UPLOAD_DIR: path.join(tmpDir, 'uploads'),
      DATABASE_URL: '',            // บังคับให้ใช้ lowdb
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // รอจนเซิร์ฟเวอร์พร้อมรับ request (สูงสุด 20 วินาที)
  const deadline = Date.now() + 20000;
  for (;;) {
    try {
      const r = await fetch(BASE + '/api/documents');
      if (r.status) break;                    // ตอบอะไรก็ได้ = พร้อมแล้ว
    } catch { /* ยังไม่ขึ้น */ }
    if (Date.now() > deadline) throw new Error('เซิร์ฟเวอร์ทดสอบไม่ขึ้นภายในเวลาที่กำหนด');
    await new Promise((r) => setTimeout(r, 250));
  }
});

after(() => {
  server?.kill();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('การยืนยันตัวตน', () => {
  test('เรียก endpoint ที่ต้องล็อกอินโดยไม่มี token → 401', async () => {
    const { status } = await api('/api/documents');
    assert.equal(status, 401);
  });

  test('รหัสผ่านผิด → 401 และไม่คืน token', async () => {
    const { status, body } = await api('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username: 'sysadmin', password: 'ผิดแน่นอน' }),
    });
    assert.equal(status, 401);
    assert.equal(body?.token, undefined);
  });

  test('token ปลอม → 401', async () => {
    // HTTP header รับได้เฉพาะ ASCII จึงใช้ token ปลอมแบบ ASCII
    const { status } = await api('/api/documents', { headers: auth('fake.invalid.token') });
    assert.equal(status, 401);
  });

  test('รหัสผ่านถูก → ได้ token และเรียก API ได้', async () => {
    const token = await login('sysadmin', 'sysadmin123');
    assert.ok(token, 'ต้องได้ token');
    const { status } = await api('/api/documents', { headers: auth(token) });
    assert.equal(status, 200);
  });
});

describe('การควบคุมสิทธิ์ที่ระดับ API (ไม่ใช่แค่ซ่อนปุ่มใน UI)', () => {
  test('assistant แก้ไขเลขเวอร์ชัน/วันที่เอกสารไม่ได้ → 403', async () => {
    const admin = await login('sysadmin', 'sysadmin123');
    const assistant = await login('assistant', 'assistant123');
    const { body: docs } = await api('/api/documents', { headers: auth(admin) });
    const no = docs[0]?.no;
    assert.ok(no, 'ต้องมีเอกสารอย่างน้อย 1 ฉบับสำหรับทดสอบ');

    const res = await api(`/api/documents/${encodeURIComponent(no)}`, {
      method: 'PATCH', headers: auth(assistant),
      body: JSON.stringify({ rev: 99, updated: '2020-01-01' }),
    });
    assert.equal(res.status, 403, 'assistant ต้องแก้ rev/updated ไม่ได้');
  });

  test('assistant ลงทะเบียนเอกสารใหม่ไม่ได้ → 403', async () => {
    const assistant = await login('assistant', 'assistant123');
    const res = await api('/api/documents', { method: 'POST', headers: auth(assistant), body: JSON.stringify({}) });
    assert.equal(res.status, 403);
  });

  test('assistant โหลดชุดกู้ชีพทั้งคลังไม่ได้ → 403', async () => {
    const assistant = await login('assistant', 'assistant123');
    const res = await fetch(BASE + '/api/documents/export/zip', { headers: auth(assistant) });
    assert.equal(res.status, 403);
  });

  test('assistant ดูรายชื่อผู้ใช้งานไม่ได้ → 403', async () => {
    const assistant = await login('assistant', 'assistant123');
    const res = await api('/api/users', { headers: auth(assistant) });
    assert.equal(res.status, 403);
  });
});

describe('การตรวจความถูกต้องของข้อมูล (กัน 500 จากค่าขยะ)', () => {
  test('ส่งเลขเวอร์ชันเป็นตัวอักษร → 400 ไม่ใช่ 500', async () => {
    const admin = await login('sysadmin', 'sysadmin123');
    const { body: docs } = await api('/api/documents', { headers: auth(admin) });
    const no = docs[0].no;
    const res = await api(`/api/documents/${encodeURIComponent(no)}`, {
      method: 'PATCH', headers: auth(admin),
      body: JSON.stringify({ status: 'review', rev: 'ไม่ใช่ตัวเลข' }),
    });
    assert.equal(res.status, 400, 'ต้องเป็น 400 (ข้อมูลไม่ถูกต้อง) ไม่ใช่ 500');
  });

  test('ขอไฟล์แนบด้วย id ที่ไม่มีจริง → 404 ไม่ใช่ 500', async () => {
    const admin = await login('sysadmin', 'sysadmin123');
    const res = await fetch(BASE + '/api/attachments/ไม่ใช่-uuid/download', { headers: auth(admin) });
    assert.equal(res.status, 404);
  });
});

describe('ประวัติเอกสารต้องเป็นข้อมูลจริงเท่านั้น (ห้ามสร้างขึ้นเอง)', () => {
  test('/history ไม่มีเนื้อหาเอกสารที่ระบบแต่งขึ้น', async () => {
    const admin = await login('sysadmin', 'sysadmin123');
    const { body: docs } = await api('/api/documents', { headers: auth(admin) });
    const no = docs[0].no;
    const { status, body } = await api(`/api/documents/${encodeURIComponent(no)}/history`, { headers: auth(admin) });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body), 'ต้องเป็น array ของบันทึกกิจกรรมจริง');
    for (const item of body) {
      assert.equal(item.content, undefined, 'ห้ามมีฟิลด์ content (เนื้อหาเอกสารที่แต่งขึ้น)');
    }
  });
});

describe('ลายมือชื่อรับทราบต้องเก็บถาวร', () => {
  test('ลงนามรับทราบด้วยรหัสผ่านผิด → 401 และไม่ถูกบันทึก', async () => {
    const user = await login('med_tech', 'medtech123');
    const { body: docs } = await api('/api/documents', { headers: auth(user) });
    const no = docs[0].no;
    const res = await api(`/api/documents/${encodeURIComponent(no)}/acknowledge`, {
      method: 'POST', headers: auth(user), body: JSON.stringify({ password: 'ผิด' }),
    });
    assert.equal(res.status, 401);
  });

  test('ลงนามสำเร็จแล้วอ่านกลับมาได้ และลงซ้ำไม่ได้', async () => {
    const user = await login('med_tech', 'medtech123');
    const { body: docs } = await api('/api/documents', { headers: auth(user) });
    const no = docs[0].no;

    const first = await api(`/api/documents/${encodeURIComponent(no)}/acknowledge`, {
      method: 'POST', headers: auth(user), body: JSON.stringify({ password: 'medtech123' }),
    });
    assert.equal(first.status, 201, 'ลงนามครั้งแรกต้องสำเร็จ');

    const list = await api(`/api/documents/${encodeURIComponent(no)}/acknowledgments`, { headers: auth(user) });
    assert.equal(list.status, 200);
    assert.ok(list.body.some((a) => a.username === 'med_tech'), 'ต้องอ่านลายมือชื่อที่เพิ่งบันทึกกลับมาได้');

    const again = await api(`/api/documents/${encodeURIComponent(no)}/acknowledge`, {
      method: 'POST', headers: auth(user), body: JSON.stringify({ password: 'medtech123' }),
    });
    assert.equal(again.status, 400, 'ลงนามซ้ำเวอร์ชันเดิมต้องไม่ได้');
  });
});
