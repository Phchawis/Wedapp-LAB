/* TUH Lab QMS — REST API (Express).
   Auth: JWT (Bearer). Passwords hashed with bcrypt.
   File upload: multer (memory) → store (disk หรือ Supabase Storage).
   Data layer สลับได้ผ่าน server/store.js (lowdb ↔ Supabase). */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './store.js';
import { newId, kindFromFile } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dev: ใช้ QMS_API_PORT (เลี่ยงชน vite); production (โฮสต์): ใช้ PORT ที่โฮสต์กำหนด
const PORT = process.env.QMS_API_PORT || process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'tuh-qms-dev-secret-change-me';

const PERMISSIONS = {
  creator: ['users:manage', 'docs:create', 'docs:delete', 'docs:edit', 'docs:view', 'docs:export'],
  admin: ['users:manage', 'docs:create', 'docs:delete', 'docs:view', 'docs:export'],
  user: ['docs:view', 'docs:export'],
};
const can = (role, action) => (PERMISSIONS[role] || []).includes(action);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const logAction = (actor, action, target = '') =>
  store.addLog({ id: newId(), ts: new Date().toISOString(), username: actor.username, name: actor.name, role: actor.role, action, target, detail: '' });

// ── Auth ─────────────────────────────────────────────────────
function authMw(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'ต้องเข้าสู่ระบบก่อน' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }); }
}
const requirePerm = (action) => (req, res, next) =>
  can(req.user.role, action) ? next() : res.status(403).json({ error: 'ไม่มีสิทธิ์ดำเนินการนี้' });

// แปลง error เป็น 500 พร้อมข้อความ
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message || 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
});

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username = '', password = '' } = req.body;
  const u = await store.getUserByUsername(username);
  if (!u || !bcrypt.compareSync(password, u.passwordHash)) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
  }
  const actor = { username: u.username, name: u.name, role: u.role };
  const token = jwt.sign(actor, JWT_SECRET, { expiresIn: '12h' });
  await logAction(actor, 'login');
  res.json({ token, user: actor });
}));

app.post('/api/auth/logout', authMw, wrap(async (req, res) => {
  await logAction(req.user, 'logout');
  res.json({ ok: true });
}));

// ── Documents ────────────────────────────────────────────────
app.get('/api/documents', authMw, wrap(async (req, res) => {
  res.json(await store.listDocuments());
}));

app.get('/api/documents/:no', authMw, wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  res.json(doc);
}));

app.post('/api/documents', authMw, requirePerm('docs:create'), upload.array('files', 10), wrap(async (req, res) => {
  const b = req.body;
  const no = (b.no || '').trim();
  if (!no) return res.status(400).json({ error: 'ต้องระบุเลขที่เอกสาร' });
  if (await store.documentExists(no)) return res.status(409).json({ error: 'เลขที่เอกสารนี้มีอยู่แล้วในทะเบียน' });

  let links = [];
  try { links = JSON.parse(b.links || '[]'); } catch { links = []; }

  const attachments = [];
  for (const f of req.files || []) {
    const storage = await store.saveFile(f);
    // multer ตีความชื่อไฟล์เป็น latin1 → แปลงกลับเป็น UTF-8 เพื่อให้ชื่อไฟล์ภาษาไทยไม่เพี้ยน
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    attachments.push({ docNo: no, kind: kindFromFile(name, f.mimetype), name, mime: f.mimetype, size: f.size, storage });
  }
  for (const url of links) {
    if (url && url.trim()) attachments.push({ docNo: no, kind: 'url', name: url.trim(), url: url.trim() });
  }

  const doc = {
    no, th: (b.th || '').trim(), type: b.type, cat: b.cat,
    rev: Math.max(1, parseInt(b.rev, 10) || 1), status: b.status || 'draft',
    updated: b.updated, owner: (b.owner || '').trim(), retention: parseInt(b.retention, 10) || 5,
    files: [...new Set(attachments.map((a) => a.kind))], createdAt: new Date().toISOString(),
  };
  await store.createDocument(doc, attachments);
  await logAction(req.user, 'doc:create', no);
  res.status(201).json(await store.getDocument(no)); // ส่งกลับพร้อมประวัติล่าสุด
}));

app.patch('/api/documents/:no', authMw, requirePerm('docs:edit'), wrap(async (req, res) => {
  const { status, rev, updated, action } = req.body;
  const updatedDoc = await store.updateDocument(req.params.no, { status, rev, updated });
  if (!updatedDoc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  await logAction(req.user, action || 'doc:edit', req.params.no);
  res.json(await store.getDocument(req.params.no)); // ส่งกลับพร้อมประวัติล่าสุด
}));

app.delete('/api/documents/:no', authMw, requirePerm('docs:delete'), wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  await store.deleteDocument(req.params.no);
  await logAction(req.user, 'doc:delete', req.params.no);
  res.json({ ok: true });
}));

// ── Attachment download (auth) ───────────────────────────────
app.get('/api/attachments/:id/download', authMw, wrap(async (req, res) => {
  const a = await store.getAttachment(req.params.id);
  if (!a || !a.storage) return res.status(404).json({ error: 'ไม่พบไฟล์' });
  const buf = await store.readAttachmentData(a);
  if (!buf) return res.status(404).json({ error: 'ไฟล์หาย' });
  res.setHeader('Content-Type', a.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`);
  res.send(buf);
}));

// ── Users ────────────────────────────────────────────────────
app.get('/api/users', authMw, requirePerm('users:manage'), wrap(async (req, res) => {
  res.json(await store.listUsers());
}));

app.post('/api/users', authMw, requirePerm('users:manage'), wrap(async (req, res) => {
  const { username = '', password = '', name = '', role = 'user' } = req.body;
  const uname = username.trim();
  if (!uname || password.length < 6 || !name.trim()) return res.status(400).json({ error: 'ข้อมูลไม่ครบ (รหัสผ่านอย่างน้อย 6 ตัวอักษร)' });
  if (!['creator', 'admin', 'user'].includes(role)) return res.status(400).json({ error: 'ระดับสิทธิ์ไม่ถูกต้อง' });
  if (role === 'creator' && req.user.role !== 'creator') return res.status(403).json({ error: 'เฉพาะ Creator เท่านั้นที่สร้างบัญชี Creator ได้' });
  if (await store.getUserByUsername(uname)) return res.status(409).json({ error: 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' });
  const created = await store.createUser({ username: uname, passwordHash: bcrypt.hashSync(password, 8), name: name.trim(), role });
  await logAction(req.user, 'user:add', uname);
  res.status(201).json(created);
}));

app.delete('/api/users/:username', authMw, requirePerm('users:manage'), wrap(async (req, res) => {
  const target = await store.getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
  if (target.username === req.user.username) return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' });
  if (target.role === 'creator' && (await store.countCreators()) <= 1) return res.status(400).json({ error: 'ต้องมี Creator อย่างน้อย 1 บัญชี' });
  await store.deleteUser(req.params.username);
  await logAction(req.user, 'user:delete', req.params.username);
  res.json({ ok: true });
}));

// ── Logs ─────────────────────────────────────────────────────
app.get('/api/logs', authMw, requirePerm('users:manage'), wrap(async (req, res) => {
  res.json(await store.listLogs());
}));

// ── เสิร์ฟหน้าเว็บที่ build แล้ว (production / โฮสต์) ─────────────
// dev ใช้ vite แยกบนพอร์ต 5173; แต่บนโฮสต์จะมีโฟลเดอร์ dist ให้เสิร์ฟจากที่นี่
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // ทุก path ที่ไม่ใช่ /api ให้ส่ง index.html (SPA)
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => console.log(`TUH QMS API on :${PORT} · data store: ${store.label}`));
