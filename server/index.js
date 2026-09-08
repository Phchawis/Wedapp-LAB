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
import { ROLE_ORDER, can } from '../src/auth/roles.js';
import { ALLOWED_EXT_SET, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, UNSUPPORTED_MSG } from '../src/data/file-types.js';
import crypto from 'node:crypto';
import { sendMail, resetMail, cleanEmail, isValidEmail } from './mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dev: ใช้ QMS_API_PORT (เลี่ยงชน vite); production (โฮสต์): ใช้ PORT ที่โฮสต์กำหนด
const PORT = process.env.QMS_API_PORT || process.env.PORT || 3001;
// บน production ต้องตั้ง secret จริงและยาวพอ (กุญแจ HS256 ที่สั้นถูก brute-force ได้)
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: ต้องตั้ง JWT_SECRET อย่างน้อย 32 ตัวอักษรบน production'); process.exit(1);
  }
  if (process.env.SSO_SHARED_SECRET && process.env.SSO_SHARED_SECRET.length < 32) {
    console.error('FATAL: SSO_SHARED_SECRET สั้นเกินไป (อย่างน้อย 32 ตัวอักษร)'); process.exit(1);
  }
}
const JWT_SECRET = process.env.JWT_SECRET || 'tuh-qms-dev-secret-change-me';
// เชื่อถือ token ที่เซ็นมาจากระบบ Masterlist (ฝ่ายสหเวชศาสตร์) เท่านั้น — คนละ secret กับ JWT_SECRET
// เพื่อไม่ให้ secret รั่วจากฝั่งหนึ่งปลอมเซสชันของอีกฝั่งได้โดยตรง
const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET || '';

const app = express();
app.use(cors());
app.use(express.json());

// ชนิด/ขนาดไฟล์ที่อนุญาต อ่านจากโมดูลกลางที่ฝั่งหน้าจอใช้ร่วมกัน (src/data/file-types.js)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ALLOWED_EXT_SET.has(ext)) return cb(null, true);
    cb(new Error(UNSUPPORTED_MSG(ext)));
  },
});

const logAction = (actor, action, target = '') =>
  store.addLog({ id: newId(), ts: new Date().toISOString(), username: actor.username, name: actor.name, role: actor.role, action, target, detail: '' });

// ── Auth ─────────────────────────────────────────────────────
async function authMw(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'ต้องเข้าสู่ระบบก่อน' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); }
  catch { return res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }); }
  try {
    // ตรวจซ้ำกับฐานข้อมูลทุกครั้ง — บัญชีที่ถูกลบหรือเปลี่ยนสิทธิ์จะมีผลทันที
    // (เดิมเชื่อ role ใน token ทำให้ลด/ถอนสิทธิ์ไม่มีผลจนกว่า token จะหมดอายุ ~12 ชม.)
    const u = await store.getUserByUsername(payload.username);
    if (!u) return res.status(401).json({ error: 'บัญชีนี้ถูกปิดหรือถูกลบแล้ว กรุณาเข้าสู่ระบบใหม่' });
    req.user = { username: u.username, name: u.name, role: u.role, cat: u.cat || null };
    // บัญชีที่ยังใช้รหัสชั่วคราว: บล็อกทุกอย่างที่ฝั่งเซิร์ฟเวอร์จนกว่าจะตั้งรหัสใหม่
    // (บังคับที่ API ไม่ใช่แค่ซ่อนหน้าจอ — กันการเรียก API ตรงข้ามหน้าเปลี่ยนรหัส)
    if (u.mustChangePassword && req.path !== '/api/auth/change-password' && req.path !== '/api/auth/logout') {
      return res.status(403).json({ error: 'ต้องตั้งรหัสผ่านใหม่ก่อนใช้งานระบบ', mustChangePassword: true });
    }
    next();
  } catch (e) { console.error(e); res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' }); }
}
const requirePerm = (action) => (req, res, next) =>
  can(req.user.role, action) ? next() : res.status(403).json({ error: 'ไม่มีสิทธิ์ดำเนินการนี้' });

// วันที่วันนี้ตามเวลาไทย (YYYY-MM-DD) — ห้ามใช้ toISOString().slice(0,10) เพราะเป็น UTC
const todayTH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

// แปลง error เป็น 500 — ถ้าส่ง response ไปแล้วต้องไม่ส่งซ้ำ (กัน ERR_HTTP_HEADERS_SENT → unhandled)
// และไม่เปิดเผยข้อความ error ดิบจากฐานข้อมูล (กันข้อมูลโครงสร้างตารางรั่ว)
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e);
  if (res.headersSent) return; // ส่ง response ไปแล้ว — จบ ไม่ต้องทำอะไรต่อ
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
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
  // mustChangePassword = บัญชีที่ผู้ดูแลสร้าง/รีเซ็ตรหัสให้ ต้องตั้งรหัสใหม่ก่อนใช้งานจริง
  res.json({ token, user: { ...actor, mustChangePassword: !!u.mustChangePassword } });
}));

// ผู้ใช้ตั้งรหัสผ่านใหม่ของตัวเอง (ยืนยันรหัสเดิมก่อน) — ใช้ปลดล็อกบัญชีที่ยังใช้รหัสชั่วคราว
app.post('/api/auth/change-password', authMw, wrap(async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
  }
  const u = await store.getUserByUsername(req.user.username);
  if (!u || !bcrypt.compareSync(currentPassword, u.passwordHash)) {
    return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
  }
  if (bcrypt.compareSync(newPassword, u.passwordHash)) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' });
  }
  await store.setOwnPassword(req.user.username, bcrypt.hashSync(newPassword, 10));
  await logAction(req.user, 'user:change-password');
  res.json({ ok: true });
}));

app.post('/api/auth/logout', authMw, wrap(async (req, res) => {
  await logAction(req.user, 'logout');
  res.json({ ok: true });
}));

// เข้าสู่ระบบผ่านลิงก์จาก Masterlist — ไม่ใช่การล็อกอินแบบพาสเวิร์ด แต่รับรอง token อายุสั้น
// ที่เซ็นด้วย SSO_SHARED_SECRET (ต้องตรงกันทั้งสองระบบ) แล้วไปหาบัญชีจริงในทะเบียนผู้ใช้ของระบบนี้
// ต่อด้วยชื่อผู้ใช้งาน — ถ้าไม่พบบัญชีที่ตรงกัน ให้กลับไปหน้าล็อกอินปกติ ไม่สร้างบัญชีใหม่ให้อัตโนมัติ
app.post('/api/auth/sso', wrap(async (req, res) => {
  if (!SSO_SHARED_SECRET) return res.status(503).json({ error: 'ระบบยังไม่เปิดใช้งานการเข้าสู่ระบบผ่าน Masterlist' });
  const { token: ssoToken } = req.body;
  let payload;
  try {
    payload = jwt.verify(ssoToken, SSO_SHARED_SECRET, { issuer: 'masterlist', audience: 'tuh-lab-qms' });
  } catch {
    return res.status(401).json({ error: 'ลิงก์เข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานโดยตรง' });
  }
  const u = await store.getUserByUsername(payload.username || '');
  if (!u) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบทะเบียนเอกสารเทคนิคการแพทย์ กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานโดยตรง' });
  const actor = { username: u.username, name: u.name, role: u.role };
  const token = jwt.sign(actor, JWT_SECRET, { expiresIn: '12h' });
  await logAction(actor, 'login');
  res.json({ token, user: actor });
}));

// ── Documents ────────────────────────────────────────────────
app.get('/api/documents', authMw, wrap(async (req, res) => {
  res.json(await store.listDocuments());
}));

// ประวัติการเปลี่ยนแปลงของเอกสาร — คืน "บันทึกกิจกรรมจริง" (audit log) ของเอกสารนี้เท่านั้น
// ไม่มีการสร้างเวอร์ชัน/เนื้อหาปลอมขึ้นเอง (ระบบไม่ได้จัดเก็บสแนปช็อตเนื้อหารายเวอร์ชัน)
app.get('/api/documents/:no/history', authMw, wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  res.json(doc.history || []);
}));

app.get('/api/documents/:no/acknowledgments', authMw, wrap(async (req, res) => {
  res.json(await store.listAcknowledgments(req.params.no));
}));

app.post('/api/documents/:no/acknowledge', authMw, wrap(async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'ต้องระบุรหัสผ่านเพื่อลงชื่อรับทราบ' });

  const u = await store.getUserByUsername(req.user.username);
  if (!u || !bcrypt.compareSync(password, u.passwordHash)) {
    return res.status(401).json({ error: 'รหัสผ่านสำหรับลงนามอิเล็กทรอนิกส์ไม่ถูกต้อง' });
  }

  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });

  const added = await store.addAcknowledgment({
    docNo: req.params.no,
    username: req.user.username,
    name: req.user.name,
    role: req.user.role,
    ts: new Date().toISOString(),
    version: String(doc.rev),
  });
  if (!added) {
    return res.status(400).json({ error: 'คุณได้ลงชื่อรับทราบเอกสารเวอร์ชันปัจจุบันเรียบร้อยแล้ว' });
  }

  await logAction(req.user, 'doc:acknowledge', req.params.no);
  res.status(201).json(await store.listAcknowledgments(req.params.no));
}));

app.get('/api/documents/:no', authMw, wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  res.json(doc);
}));

app.post('/api/documents', authMw, requirePerm('register'), upload.array('files', 10), wrap(async (req, res) => {
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
    reviewer: (b.reviewer || '').trim(), approver: (b.approver || '').trim(),
    nextReview: /^\d{4}-\d{2}-\d{2}$/.test(b.nextReview || '') ? b.nextReview : null,
    controlled: b.controlled === undefined ? true : b.controlled !== 'false' && b.controlled !== false,
    files: [...new Set(attachments.map((a) => a.kind))], createdAt: new Date().toISOString(),
  };
  await store.createDocument(doc, attachments);
  await logAction(req.user, 'doc:create', no);
  res.status(201).json(await store.getDocument(no)); // ส่งกลับพร้อมประวัติล่าสุด
}));

// การเปลี่ยนสถานะเอกสารแต่ละแบบต้องใช้สิทธิ์เฉพาะ — ตรวจจากสถานะปัจจุบัน→สถานะใหม่ ไม่ใช่สิทธิ์เดียวครอบทุกกรณี
// ต้องครอบคลุมทุกสถานะที่ฟอร์มลงทะเบียนเลือกได้ (draft/review/approved/effective/obsolete/controlled)
// ไม่งั้นเอกสารที่เริ่มด้วย approved/controlled จะเปลี่ยนสถานะไม่ได้เลย (ล็อกตายถาวร)
const STATUS_TRANSITIONS = {
  draft:      { review: 'revise', effective: 'publish' },
  review:     { effective: 'publish', draft: 'revise', approved: 'approve' },
  approved:   { effective: 'publish', review: 'revise' },
  effective:  { review: 'revise', obsolete: 'register', controlled: 'register' },
  controlled: { review: 'revise', obsolete: 'register', effective: 'publish' },
  obsolete:   { review: 'revise' },
};
app.patch('/api/documents/:no', authMw, wrap(async (req, res) => {
  const { status, rev, updated, action, reviewer, approver, nextReview, controlled } = req.body;
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });

  const statusChanging = status != null && status !== doc.status;
  if (statusChanging) {
    const needPerm = STATUS_TRANSITIONS[doc.status]?.[status];
    if (!needPerm || !can(req.user.role, needPerm)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เปลี่ยนสถานะเอกสารนี้' });
    }
  }

  // rev / updated เป็นเมทาดาทาที่ระบบปรับให้พร้อมกับการเปลี่ยนสถานะเท่านั้น
  // (ดู flow publish/revise/obsolete) — ห้ามแก้ตรง ๆ โดยไม่มีการเปลี่ยนสถานะที่ได้รับอนุญาต
  // กันผู้ใช้สิทธิ์ต่ำ (เช่น assistant) ยิง PATCH แก้เลขเวอร์ชัน/วันประกาศใช้เอง
  if ((rev != null || updated != null) && !statusChanging) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขข้อมูลเอกสารนี้' });
  }

  // ข้อมูลควบคุมเอกสาร (ผู้ทบทวน ผู้อนุมัติ กำหนดทบทวน) เป็นหลักฐานที่ผู้ตรวจประเมินดู
  // จึงให้แก้ได้เฉพาะผู้มีสิทธิ์ประกาศใช้ ไม่ใช่ทุกคนที่แก้เอกสารได้
  const touchingCtrl = [reviewer, approver, nextReview, controlled].some((v) => v !== undefined);
  if (touchingCtrl && !can(req.user.role, 'publish')) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ข้อมูลควบคุมเอกสาร' });
  }

  // ตรวจชนิดข้อมูลก่อนเขียน (กัน 500 จาก Postgres และค่าขยะ)
  const patch = {};

  // บันทึกผู้ทบทวน/ผู้อนุมัติจากคนที่กดจริง ไม่ให้ฝั่งหน้าเว็บส่งชื่อมาเอง
  // (ถ้าให้ส่งมาได้ ใครก็อ้างชื่อคนอื่นเป็นผู้อนุมัติได้ ซึ่งทำลายคุณค่าของหลักฐานทั้งชุด)
  // ทำแบบเดียวกับระบบทะเบียนเอกสารกลาง: เข้าสู่ทบทวน = ผู้ทบทวน · ประกาศใช้ = ผู้อนุมัติ
  if (statusChanging && status === 'review' && !doc.reviewer) patch.reviewer = req.user.name;
  if (statusChanging && status === 'effective') patch.approver = req.user.name;
  if (reviewer !== undefined) patch.reviewer = String(reviewer).trim();
  if (approver !== undefined) patch.approver = String(approver).trim();
  if (controlled !== undefined) patch.controlled = controlled !== false && controlled !== 'false';
  if (nextReview !== undefined) {
    if (nextReview && !/^\d{4}-\d{2}-\d{2}$/.test(nextReview)) {
      return res.status(400).json({ error: 'รูปแบบวันที่ทบทวนไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
    }
    patch.nextReview = nextReview || null;
  }
  if (status != null) patch.status = status;
  if (rev != null) {
    const n = Number(rev);
    if (!Number.isInteger(n) || n < 1) return res.status(400).json({ error: 'เลขเวอร์ชันไม่ถูกต้อง' });
    patch.rev = n;
  }
  if (updated != null) {
    if (typeof updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
      return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
    }
    patch.updated = updated;
  }

  const updatedDoc = await store.updateDocument(req.params.no, patch);
  if (!updatedDoc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  await logAction(req.user, action || 'doc:edit', req.params.no);
  res.json(await store.getDocument(req.params.no)); // ส่งกลับพร้อมประวัติล่าสุด
}));

/* แนบไฟล์ใหม่เข้าเอกสารที่ลงทะเบียนไว้แล้ว
   เดิมระบบแนบไฟล์ได้เฉพาะตอนลงทะเบียนครั้งแรกกับตอนทับไฟล์เดิมเท่านั้น
   เอกสารที่ลงทะเบียนไว้โดยยังไม่มีไฟล์จึงแนบทีหลังไม่ได้เลย และแนบไฟล์ที่สองไม่ได้
   (ระบบ Masterlist มีความสามารถนี้อยู่แล้ว — ทำให้สองระบบทำงานต่างกัน)

   จงใจไม่เพิ่มเลข rev เหมือนตอนทับไฟล์ เพราะ "เพิ่มไฟล์ประกอบ" ไม่ใช่การแก้ไข
   ตัวเอกสาร การเด้ง rev จะทำให้ผู้ที่ลงนามรับทราบไว้ต้องลงนามใหม่โดยไม่จำเป็น */
app.post('/api/documents/:no/attachments', authMw, requirePerm('upload'), upload.single('file'), wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });

  const link = (req.body?.url || '').trim();
  if (!req.file && !link) return res.status(400).json({ error: 'กรุณาแนบไฟล์หรือระบุลิงก์' });

  if (req.file) {
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const storage = await store.saveFile(req.file);
    await store.addAttachment(doc.no, {
      docNo: doc.no, kind: kindFromFile(name, req.file.mimetype),
      name, mime: req.file.mimetype, size: req.file.size, storage,
    });
  } else {
    if (!/^https?:\/\//i.test(link)) return res.status(400).json({ error: 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://' });
    await store.addAttachment(doc.no, { docNo: doc.no, kind: 'url', name: link, url: link });
  }

  // อัปเดตชุดชนิดไฟล์ของเอกสารให้ตรงกับไฟล์แนบจริง (ใช้แสดงป้ายในทะเบียน)
  const fresh = await store.getDocument(doc.no);
  const kinds = [...new Set((fresh.attachments || []).map((a) => a.kind))];
  await store.updateDocument(doc.no, { files: kinds, updated: todayTH() });
  await logAction(req.user, 'doc:file-add', doc.no);
  res.status(201).json(await store.getDocument(doc.no));
}));

// อัปเดตไฟล์แนบเป็นเวอร์ชันใหม่ — แทนที่ไฟล์เดิม + เพิ่มเลขแก้ไข (rev) + บันทึกประวัติ
app.post('/api/documents/:no/attachments/:id/version', authMw, requirePerm('upload'), upload.single('file'), wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  const att = (doc.attachments || []).find((a) => a.id === req.params.id);
  if (!att) return res.status(404).json({ error: 'ไม่พบไฟล์แนบ' });
  if (att.kind === 'url') return res.status(400).json({ error: 'อัปเดตได้เฉพาะไฟล์ที่อัปโหลด ไม่ใช่ลิงก์' });
  if (!req.file) return res.status(400).json({ error: 'กรุณาแนบไฟล์ใหม่' });

  const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const newKind = kindFromFile(name, req.file.mimetype);

  const storage = await store.saveFile(req.file);
  await store.updateAttachment(att.id, {
    name, kind: newKind, mime: req.file.mimetype, size: req.file.size, storage,
  });

  // เพิ่มเลขแก้ไข + ปรับวันที่ + ปรับชุดชนิดไฟล์ของเอกสาร
  const fresh = await store.getDocument(req.params.no);
  const kinds = [...new Set((fresh.attachments || []).map((a) => a.kind))];
  await store.updateDocument(req.params.no, { rev: (doc.rev || 1) + 1, updated: todayTH(), files: kinds });
  await logAction(req.user, 'doc:file-update', req.params.no);
  res.json(await store.getDocument(req.params.no));
}));

app.delete('/api/documents/:no', authMw, requirePerm('register'), wrap(async (req, res) => {
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
  // กันเบราว์เซอร์เดา content-type แล้วรันไฟล์ (เช่น .html แฝง) — บังคับดาวน์โหลดอย่างเดียว
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`);
  res.send(buf);
}));

// ── Users ────────────────────────────────────────────────────
app.get('/api/users', authMw, requirePerm('viewUsers'), wrap(async (req, res) => {
  res.json(await store.listUsers());
}));

app.post('/api/users', authMw, requirePerm('manage'), wrap(async (req, res) => {
  const { username = '', password = '', name = '', role = 'med_tech', cat = '' } = req.body;
  const uname = username.trim();
  if (!uname || password.length < 6 || !name.trim()) return res.status(400).json({ error: 'ข้อมูลไม่ครบ (รหัสผ่านอย่างน้อย 6 ตัวอักษร)' });
  if (!ROLE_ORDER.includes(role)) return res.status(400).json({ error: 'ระดับสิทธิ์ไม่ถูกต้อง' });
  if (role === 'sysadmin' && req.user.role !== 'sysadmin') return res.status(403).json({ error: 'เฉพาะ SysAdmin เท่านั้นที่สร้างบัญชี SysAdmin ได้' });
  if (await store.getUserByUsername(uname)) return res.status(409).json({ error: 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' });
  const created = await store.createUser({ username: uname, passwordHash: bcrypt.hashSync(password, 10), name: name.trim(), role, cat: cat.trim() || null });
  await logAction(req.user, 'user:add', uname);
  res.status(201).json(created);
}));

app.patch('/api/users/:username', authMw, requirePerm('manage'), wrap(async (req, res) => {
  const target = await store.getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
  const { name, role, cat, username } = req.body;
  const patch = {};
  if (username !== undefined) {
    const newUname = username.trim();
    if (!newUname) return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้งาน' });
    if (newUname.toLowerCase() !== req.params.username.toLowerCase()) {
      if (target.username === req.user.username) return res.status(400).json({ error: 'เปลี่ยนชื่อผู้ใช้งานของตัวเองไม่ได้ในหน้านี้' });
      if (await store.getUserByUsername(newUname)) return res.status(409).json({ error: 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' });
      patch.username = newUname;
    }
  }
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'กรุณาระบุชื่อ-นามสกุล' });
    patch.name = name.trim();
  }
  if (role !== undefined) {
    if (!ROLE_ORDER.includes(role)) return res.status(400).json({ error: 'ระดับสิทธิ์ไม่ถูกต้อง' });
    if (role === 'sysadmin' && req.user.role !== 'sysadmin') return res.status(403).json({ error: 'เฉพาะ SysAdmin เท่านั้นที่กำหนดสิทธิ์ SysAdmin ได้' });
    if (target.role === 'sysadmin' && role !== 'sysadmin' && (await store.countSysadmins()) <= 1) return res.status(400).json({ error: 'ต้องมี SysAdmin อย่างน้อย 1 บัญชี — ลดสิทธิ์บัญชีนี้ไม่ได้' });
    patch.role = role;
  }
  if (cat !== undefined) patch.cat = cat.trim() || null;
  if (req.body.email !== undefined) {
    const em = cleanEmail(req.body.email);
    if (em && !isValidEmail(em)) return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
    // อีเมลซ้ำจะทำให้ลิงก์ตั้งรหัสใหม่ไปโผล่ผิดคน จึงห้ามซ้ำเช่นเดียวกับชื่อผู้ใช้
    if (em) {
      const dup = await store.getUserByEmail(em);
      if (dup && dup.username.toLowerCase() !== req.params.username.toLowerCase()) {
        return res.status(409).json({ error: 'อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว' });
      }
    }
    patch.email = em;
  }
  const updated = await store.updateUser(req.params.username, patch);
  await logAction(req.user, 'user:edit', patch.username || req.params.username);
  res.json(updated);
}));

/* อีเมลของตัวเอง — ให้เจ้าตัวแก้เองได้ ไม่ต้องผ่านผู้ดูแล
   เพราะอีเมลที่นำเข้ามาจากทะเบียนบุคลากรมีทั้งที่ผิดและที่ยังไม่มี
   ถ้าต้องรอผู้ดูแลกรอกให้ทีละคนก็กลับไปเป็นปัญหาเดิม */
app.patch('/api/me/email', authMw, wrap(async (req, res) => {
  const em = cleanEmail(req.body.email);
  if (em && !isValidEmail(em)) return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
  if (em) {
    const dup = await store.getUserByEmail(em);
    if (dup && dup.username.toLowerCase() !== req.user.username.toLowerCase()) {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว' });
    }
  }
  await store.updateUser(req.user.username, { email: em });
  await logAction(req.user, 'user:email', req.user.username);
  res.json({ email: em });
}));

const RESET_TTL_MIN = 30;
const RESET_MAX_PER_HOUR = 5; // กันยิงซ้ำจนกินโควตาผู้ให้บริการอีเมล
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

/* ขอลิงก์ตั้งรหัสผ่านใหม่
   ตอบข้อความเดียวกันเสมอไม่ว่าอีเมลจะมีในระบบหรือไม่ — ถ้าตอบต่างกัน
   คนนอกจะไล่เดาได้ว่าใครมีบัญชีในระบบบ้าง */
app.post('/api/auth/forgot', wrap(async (req, res) => {
  const em = cleanEmail(req.body.email);
  if (!em) return res.status(400).json({ error: 'กรุณากรอกอีเมล' });
  const user = isValidEmail(em) ? await store.getUserByEmail(em) : null;
  if (user) {
    const recent = await store.countRecentResets(user.username, 60);
    if (recent < RESET_MAX_PER_HOUR) {
      const token = crypto.randomBytes(32).toString('base64url');
      await store.createPasswordReset({
        username: user.username,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60000).toISOString(),
        requestedIp: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '',
      });
      const base = process.env.APP_BASE_URL || 'https://labqms.duckdns.org';
      const mail = resetMail(user.name, `${base}/?reset=${token}`, RESET_TTL_MIN);
      await sendMail(em, mail.subject, mail.text, mail.html);
    }
  }
  res.json({ ok: true });
}));

/** ตรวจว่า token ยังใช้ได้ ก่อนแสดงฟอร์ม — จะได้ไม่ให้พิมพ์รหัสเสียเปล่า */
app.get('/api/auth/reset/:token', wrap(async (req, res) => {
  const row = await store.getPasswordReset(hashToken(req.params.token));
  res.json({ valid: Boolean(row && !row.usedAt && new Date(row.expiresAt) > new Date()) });
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const { token = '', password = '' } = req.body;
  if (password.length < 8) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร' });
  const row = token ? await store.getPasswordReset(hashToken(token)) : null;
  if (!row || row.usedAt || new Date(row.expiresAt) <= new Date()) {
    return res.status(400).json({ error: 'ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่' });
  }
  const user = await store.getUserByUsername(row.username);
  if (!user) return res.status(400).json({ error: 'ไม่พบบัญชีผู้ใช้' });

  // ตั้งรหัสเองแล้ว จึงไม่ต้องบังคับเปลี่ยนซ้ำตอนเข้าระบบ
  await store.updateUser(user.username, { passwordHash: bcrypt.hashSync(password, 10), mustChangePassword: false });
  // ตีตราใบที่ใช้ และล้างใบที่เหลือของคนนั้น — เคยกดขอหลายครั้ง ใบเก่าต้องใช้ไม่ได้ทันที
  await store.consumePasswordReset(row.id, row.username);
  await logAction({ username: user.username, name: user.name }, 'user:reset-self', user.username);
  res.json({ ok: true });
}));

app.post('/api/users/:username/reset-password', authMw, requirePerm('manage'), wrap(async (req, res) => {
  const target = await store.getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
  const { password = '' } = req.body;
  if (password.length < 6) return res.status(400).json({ error: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' });
  await store.resetUserPassword(req.params.username, bcrypt.hashSync(password, 10));
  await logAction(req.user, 'user:reset-password', req.params.username);
  res.json({ ok: true });
}));

app.delete('/api/users/:username', authMw, requirePerm('manage'), wrap(async (req, res) => {
  const target = await store.getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
  if (target.username === req.user.username) return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' });
  if (target.role === 'sysadmin' && (await store.countSysadmins()) <= 1) return res.status(400).json({ error: 'ต้องมี SysAdmin อย่างน้อย 1 บัญชี' });
  await store.deleteUser(req.params.username);
  await logAction(req.user, 'user:delete', req.params.username);
  res.json({ ok: true });
}));

// ── Logs ─────────────────────────────────────────────────────
app.get('/api/logs', authMw, requirePerm('audit'), wrap(async (req, res) => {
  res.json(await store.listLogs());
}));

/* ── ตัวชี้วัดคุณภาพ (KPI) ────────────────────────────────────
   ตัวชี้วัดเก็บอยู่ที่ระบบ Masterlist ที่เดียว ระบบนี้เรียกผ่าน API ภายใน
   ไม่คัดลอกมาเก็บเอง — แก้ที่ระบบไหนก็เห็นตรงกันทั้งสองฝั่งทันที และกติกา
   ตรวจค่า (สเกลร้อยละ สิทธิ์แก้ไข) อยู่ที่เดียวไม่ต้องเขียนซ้ำสองที่

   MASTERLIST_INTERNAL_URL ชี้ไปที่คอนเทนเนอร์ Masterlist ในเครือข่าย docker
   ไม่ได้ออกอินเทอร์เน็ต และใช้กุญแจ SSO_SHARED_SECRET ที่สองระบบมีตรงกันอยู่แล้ว */
const MASTERLIST_URL = process.env.MASTERLIST_INTERNAL_URL || '';
const KPI_WORK = 'MEDTECH'; // ระบบนี้ดูแลเฉพาะงานเทคนิคการแพทย์

async function callMasterlist(path, init = {}) {
  if (!MASTERLIST_URL || !process.env.SSO_SHARED_SECRET) {
    const e = new Error('ยังไม่ได้เชื่อมต่อกับระบบทะเบียนเอกสารกลาง');
    e.status = 503;
    throw e;
  }
  const res = await fetch(`${MASTERLIST_URL}${path}`, {
    ...init,
    headers: {
      'x-internal-key': process.env.SSO_SHARED_SECRET,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || 'เรียกระบบทะเบียนเอกสารกลางไม่สำเร็จ');
    e.status = res.status;
    throw e;
  }
  return data;
}

/* รายงานตัวชี้วัดฉบับเต็ม (ไฟล์ HTML แยก)

   เสิร์ฟผ่าน API ที่ต้องล็อกอิน ไม่ได้วางใน dist/ เพราะไฟล์ใน dist เปิดสาธารณะทั้งหมด
   ข้อมูลชุดนี้เป็นผลการดำเนินงานภายใน ไม่ควรเปิดให้ใครก็เข้าถึงได้ด้วย URL เปล่า ๆ
   ชื่อไฟล์รับเฉพาะที่อยู่ในรายการ กัน path traversal ตั้งแต่ต้นทาง */
const KPI_REPORTS = {
  'medtech-2569': 'medtech-2569.html',
  'summary-2569': 'summary-2569.html',
};
app.get('/api/kpi/report/:name', authMw, wrap(async (req, res) => {
  const file = KPI_REPORTS[req.params.name];
  if (!file) return res.status(404).json({ error: 'ไม่พบรายงาน' });
  const full = path.join(__dirname, 'kpi-reports', file);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'ไม่พบไฟล์รายงาน' });
  res.type('html').sendFile(full);
}));

app.get('/api/kpi', authMw, wrap(async (req, res) => {
  const year = req.query.year ? `&year=${encodeURIComponent(req.query.year)}` : '';
  const data = await callMasterlist(`/api/kpi?work=${KPI_WORK}${year}`);
  // บอกหน้าจอไปด้วยว่าผู้ใช้คนนี้แก้ได้ไหม จะได้ไม่ต้องคำนวณสิทธิ์ซ้ำ
  res.json({ ...data, canEdit: can(req.user.role, 'publish') || req.user.role === 'sysadmin' });
}));

app.post('/api/kpi/values', authMw, wrap(async (req, res) => {
  if (!(can(req.user.role, 'publish') || req.user.role === 'sysadmin')) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขตัวชี้วัด' });
  }
  const { fiscalYear, month, entries } = req.body || {};
  const data = await callMasterlist('/api/kpi', {
    method: 'POST',
    body: JSON.stringify({
      workId: KPI_WORK,
      fiscalYear,
      month,
      entries,
      // ส่งบทบาทไปให้ Masterlist ตรวจซ้ำ — หัวหน้างานของระบบนี้เทียบเท่า HEAD_WORK
      actor: {
        name: req.user.name,
        role: req.user.role === 'sysadmin' ? 'SYSADMIN' : 'HEAD_WORK',
        workId: KPI_WORK,
      },
    }),
  });
  await logAction(req.user, 'kpi:save', `เดือนที่ ${month} ปีงบ ${fiscalYear}`);
  res.json(data);
}));

// ── Emergency Kit Export (ZIP) ───────────────────────────────
// ไม่มีสิทธิ์ใดโดยเฉพาะครอบคลุมฟีเจอร์นี้ใน Masterlist — เปิดให้ผู้ใช้งานที่ล็อกอินทุกคนใช้ได้ (เหมือนพฤติกรรมเดิม)
// escape ข้อความก่อนยัดลง HTML — กัน HTML/script injection ในไฟล์ที่ export ออกไป
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
// ชื่อไฟล์ปลอดภัยสำหรับ zip entry — ตัด path separator และ .. ทิ้ง (กัน Zip Slip ตอนแตกไฟล์)
const safeZipName = (name) => String(name || 'file')
  .replace(/[\\/]/g, '_').replace(/\.\.+/g, '_').replace(/[\x00-\x1f]/g, '').slice(0, 120) || 'file';

app.get('/api/documents/export/zip', authMw, requirePerm('audit'), wrap(async (req, res) => {
  const docs = await store.listDocuments();
  const zip = new SimpleZip();
  let rowsHtml = '';
  const nowStr = new Date().toLocaleString('th-TH');

  // จำกัดขนาดรวมของไฟล์ที่แพ็ก กัน out-of-memory บน VPS ที่แชร์กับระบบอื่น (กัน DoS)
  // ไฟล์ที่เกินเพดานจะไม่ถูกใส่ แต่ยังแสดงในตารางพร้อมหมายเหตุ
  const MAX_PACK_BYTES = 200 * 1024 * 1024;
  let packedBytes = 0;

  for (const d of docs) {
    let attachmentsLinks = [];
    for (const a of d.attachments || []) {
      if (a.kind === 'url') {
        // อนุญาตเฉพาะลิงก์ http/https — กัน javascript:/data: และ escape ค่า
        const safeUrl = /^https?:\/\//i.test(a.url || '') ? a.url : '#';
        attachmentsLinks.push(`<a href="${escHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">🔗 ${escHtml(a.name || 'ลิงก์ภายนอก')}</a>`);
      } else if (a.storage) {
        try {
          if (packedBytes >= MAX_PACK_BYTES) {
            attachmentsLinks.push(`<span style="color:#70758C">⚠️ ไฟล์ใหญ่เกินขีดจำกัดชุดกู้ชีพ (${escHtml(a.name)}) — ดาวน์โหลดจากระบบโดยตรง</span>`);
            continue;
          }
          const buf = await store.readAttachmentData(a);
          if (buf) {
            packedBytes += buf.length;
            const zipPath = `files/${safeZipName(a.id + '_' + a.name)}`;
            zip.addFile(zipPath, buf);
            attachmentsLinks.push(`<a href="${escHtml(zipPath)}" download>${escHtml(a.name)}</a>`);
          } else {
            attachmentsLinks.push(`<span style="color:#70758C">⚠️ ไฟล์ขัดข้อง (${escHtml(a.name)})</span>`);
          }
        } catch (e) {
          console.error(`Failed to pack file ${a.name}:`, e);
          attachmentsLinks.push(`<span style="color:#70758C">⚠️ โหลดไม่สำเร็จ (${escHtml(a.name)})</span>`);
        }
      }
    }

    const typeLabel = escHtml(d.type);
    const statusClass = `badge badge-${escHtml(d.status)}`;
    const statusLabel = d.status === 'effective' ? 'ประกาศใช้' :
                        d.status === 'review' ? 'รอทบทวน' :
                        d.status === 'draft' ? 'ร่าง' : 'ยกเลิก';

    rowsHtml += `
      <tr>
        <td><span class="type-tag">${typeLabel}</span></td>
        <td style="font-family:monospace; font-weight:600;">${escHtml(d.no)}</td>
        <td><strong>${escHtml(d.th)}</strong></td>
        <td style="text-align:center;">${String(d.rev).padStart(2, '0')}</td>
        <td><span class="${statusClass}">${statusLabel}</span></td>
        <td>${escHtml(d.owner)}</td>
        <td><div style="display:flex; flex-direction:column; gap:4px;">${attachmentsLinks.join('')}</div></td>
      </tr>
    `;
  }
  
  const template = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ทะเบียนเอกสารคุณภาพห้องปฏิบัติการสำรองออฟไลน์ (QMS Emergency Kit)</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #EEEFF5;
      color: #181B2A;
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 24px;
    }
    h1 {
      font-size: 20px;
      color: #343E9B;
      margin-top: 0;
      margin-bottom: 4px;
    }
    p {
      color: #54596F;
      font-size: 13px;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #E0E2EC;
    }
    th {
      background-color: #F6F7FB;
      color: #70758C;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    tr:hover {
      background-color: #F6F7FB;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-effective { background-color: #E6F4EA; color: #137333; }
    .badge-review { background-color: #FEF7E0; color: #B06000; }
    .badge-draft { background-color: #F1F3F4; color: #3C4043; }
    .badge-obsolete { background-color: #FCE8E6; color: #C5221F; }
    .type-tag {
      background-color: #E8EAF6;
      color: #3F51B5;
      padding: 3px 6px;
      border-radius: 4px;
      font-weight: bold;
      font-family: monospace;
    }
    a {
      color: #343E9B;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ทะเบียนเอกสารคุณภาพห้องปฏิบัติการสำรองออฟไลน์ (QMS Emergency Kit)</h1>
    <p>สำรองข้อมูลเมื่อ: ${nowStr} | ประกอบด้วยเอกสารจัดเก็บทั้งหมดพร้อมไฟล์จริงสำหรับใช้งานออฟไลน์ยามฉุกเฉิน</p>
    <table>
      <thead>
        <tr>
          <th>ประเภท</th>
          <th>เลขที่เอกสาร</th>
          <th>ชื่อเอกสาร</th>
          <th style="text-align:center;">แก้ไขครั้งที่</th>
          <th>สถานะ</th>
          <th>ผู้รับผิดชอบ</th>
          <th>ไฟล์แนบออฟไลน์</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  zip.addFile('index.html', template);

  const zipBuffer = zip.toBuffer();
  // บันทึก log ก่อนส่ง response — ถ้าเขียน log พังจะได้ยังจับ error ได้ตามปกติ
  // (ห้ามทำ await หลัง res.send เพราะถ้า throw จะกลายเป็น unhandled rejection)
  await logAction(req.user, 'register:emergency-export');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="TUH-QMS-Emergency-Kit.zip"');
  res.send(zipBuffer);
}));


// ── เสิร์ฟหน้าเว็บที่ build แล้ว (production / โฮสต์) ─────────────
// dev ใช้ vite แยกบนพอร์ต 5173; แต่บนโฮสต์จะมีโฟลเดอร์ dist ให้เสิร์ฟจากที่นี่
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // ทุก path ที่ไม่ใช่ /api ให้ส่ง index.html (SPA)
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// error handler สุดท้าย — แปลง error ที่หลุดมาถึง Express (เช่น multer ปฏิเสธไฟล์)
// ให้เป็น JSON ที่อ่านง่าย แทนหน้า HTML error ยาว ๆ ของ Express
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  // multer ตอบเป็นภาษาอังกฤษล้วน ("File too large") ผู้ใช้อ่านแล้วไม่รู้ว่าต้องทำอะไรต่อ
  const MULTER_TH = {
    LIMIT_FILE_SIZE: `ไฟล์ใหญ่เกิน ${MAX_UPLOAD_LABEL} — กรุณาบีบอัดไฟล์หรือแยกเป็นหลายไฟล์`,
    LIMIT_FILE_COUNT: 'แนบไฟล์ได้ครั้งละไม่เกิน 10 ไฟล์',
    LIMIT_UNEXPECTED_FILE: 'ช่องอัปโหลดไฟล์ไม่ถูกต้อง',
  };
  res.status(400).json({ error: MULTER_TH[err?.code] || err?.message || 'คำขอไม่ถูกต้อง' });
});

// กันเซิร์ฟเวอร์ตายเงียบ ๆ จาก error ที่หลุดออกมานอก try/catch — log ไว้แล้วให้ทำงานต่อ
// (เดิมไม่มีตัวกัน ทำให้ 1 error หลัง res.send ทำให้ทั้ง process ตายและ restart)
process.on('unhandledRejection', (reason) => console.error('UnhandledRejection:', reason));
process.on('uncaughtException', (err) => console.error('UncaughtException:', err));

app.listen(PORT, () => console.log(`TUH QMS API on :${PORT} · data store: ${store.label}`));

// ── Simple ZIP Generator (No dependencies, store method) ──────
class SimpleZip {
  constructor() {
    this.files = [];
  }
  addFile(name, content) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    this.files.push({ name, buf });
  }
  toBuffer() {
    const buffers = [];
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const f of this.files) {
      const nameBuf = Buffer.from(f.name);
      const size = f.buf.length;
      const date = new Date();
      const timeVal = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xFFFF;
      const dateVal = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF;
      const crc = crc32(f.buf);

      const lh = Buffer.alloc(30 + nameBuf.length);
      lh.writeUInt32LE(0x04034b50, 0);
      lh.writeUInt16LE(10, 4);
      lh.writeUInt16LE(0x0800, 6); // general purpose bit 11 = ชื่อไฟล์เป็น UTF-8 (กันภาษาไทยเพี้ยนตอนแตกไฟล์)
      lh.writeUInt16LE(0, 8);
      lh.writeUInt16LE(timeVal, 10);
      lh.writeUInt16LE(dateVal, 12);
      lh.writeUInt32LE(crc, 14);
      lh.writeUInt32LE(size, 18);
      lh.writeUInt32LE(size, 22);
      lh.writeUInt16LE(nameBuf.length, 26);
      lh.writeUInt16LE(0, 28);
      nameBuf.copy(lh, 30);

      localHeaders.push(lh);
      localHeaders.push(f.buf);

      const ch = Buffer.alloc(46 + nameBuf.length);
      ch.writeUInt32LE(0x02014b50, 0);
      ch.writeUInt16LE(20, 4);
      ch.writeUInt16LE(10, 6);
      ch.writeUInt16LE(0x0800, 8); // general purpose bit 11 = UTF-8 (ให้ตรงกับ local header)
      ch.writeUInt16LE(0, 10);
      ch.writeUInt16LE(timeVal, 12);
      ch.writeUInt16LE(dateVal, 14);
      ch.writeUInt32LE(crc, 16);
      ch.writeUInt32LE(size, 20);
      ch.writeUInt32LE(size, 24);
      ch.writeUInt16LE(nameBuf.length, 28);
      ch.writeUInt16LE(0, 30);
      ch.writeUInt16LE(0, 32);
      ch.writeUInt16LE(0, 34);
      ch.writeUInt16LE(0, 36);
      ch.writeUInt32LE(0, 38);
      ch.writeUInt32LE(offset, 42);
      nameBuf.copy(ch, 46);

      centralHeaders.push(ch);
      offset += lh.length + size;
    }

    const localSize = offset;
    const centralBuf = Buffer.concat(centralHeaders);
    const centralSize = centralBuf.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.files.length, 8);
    eocd.writeUInt16LE(this.files.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(localSize, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, centralBuf, eocd]);
  }
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

