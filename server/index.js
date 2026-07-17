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
// เชื่อถือ token ที่เซ็นมาจากระบบ Masterlist (ฝ่ายสหเวชศาสตร์) เท่านั้น — คนละ secret กับ JWT_SECRET
// เพื่อไม่ให้ secret รั่วจากฝั่งหนึ่งปลอมเซสชันของอีกฝั่งได้โดยตรง
const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET || '';

const PERMISSIONS = {
  creator: ['users:manage', 'docs:create', 'docs:delete', 'docs:edit', 'docs:view', 'docs:export'],
  admin: ['users:manage', 'docs:create', 'docs:delete', 'docs:edit', 'docs:view', 'docs:export'],
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

// In-memory training acknowledgments storage
let acknowledgments = [
  { id: 'ack-1', docNo: 'QM-CMTL-001', username: 'admin', name: 'ผู้ดูแลระบบ', role: 'admin', ts: '2026-06-23T08:12:00.000Z', version: '4' },
  { id: 'ack-2', docNo: 'QM-CMTL-001', username: 'user', name: 'ผู้ใช้งานทั่วไป', role: 'user', ts: '2026-06-24T09:45:00.000Z', version: '4' },
  { id: 'ack-3', docNo: 'SOP-IMM-014', username: 'user', name: 'ผู้ใช้งานทั่วไป', role: 'user', ts: '2026-06-25T11:20:00.000Z', version: '2' },
];

// ── Documents ────────────────────────────────────────────────
app.get('/api/documents', authMw, wrap(async (req, res) => {
  res.json(await store.listDocuments());
}));

app.get('/api/documents/:no/history', authMw, wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });

  const history = [];
  const totalRevs = doc.rev || 1;
  const originalUpdated = new Date(doc.updated);
  
  for (let r = 1; r <= totalRevs; r++) {
    const revOffsetYears = totalRevs - r;
    const revDate = new Date(originalUpdated);
    revDate.setFullYear(revDate.getFullYear() - revOffsetYears);
    
    let title = doc.th;
    if (r < totalRevs) {
      title = `${doc.th} (ฉบับแก้ไขร่างครั้งที่ ${r})`;
    }
    
    history.push({
      no: doc.no,
      rev: r,
      th: title,
      type: doc.type,
      cat: doc.cat,
      status: r === totalRevs ? doc.status : 'obsolete',
      updated: revDate.toISOString().slice(0, 10),
      owner: doc.owner,
      retention: doc.retention,
      files: doc.files,
      content: `คู่มือระเบียบการปฏิบัติตามมาตรฐานห้องแล็บ TUH\nรหัสควบคุม: ${doc.no}\n\nครั้งที่แก้ไข: revision ${r}\nผู้รับผิดชอบงาน: ${doc.owner}\nวันที่จัดเก็บ: ${revDate.toISOString().slice(0, 10)}\n\nรายละเอียดระเบียบข้อกำหนด:\n1. เจ้าหน้าที่ทุกคนต้องปฏิบัติตามขั้นตอน ISO 15189 อย่างเคร่งครัด\n${
        r >= 2 ? '2. การนำเข้าสิ่งส่งตรวจจากภายนอกต้องลงบันทึกในเอกสารควบคุมทุกครั้ง\n' : ''
      }${
        r >= 3 ? '3. ต้องตรวจสอบความผิดปกติของตัวตรวจวิเคราะห์ก่อนเริ่มรันงานแล็บทุกเช้า\n' : ''
      }${
        r >= 4 ? '4. อัปเดตแนวทางการรายงานผลวิกฤตด่วนแก่แพทย์ผู้รับผิดชอบภายใน 15 นาที\n' : ''
      }\nจบเอกสารควบคุมฉบับราชการโรงพยาบาลธรรมศาสตร์`
    });
  }
  
  res.json(history.reverse());
}));

app.get('/api/documents/:no/acknowledgments', authMw, wrap(async (req, res) => {
  const filtered = acknowledgments.filter((ack) => ack.docNo === req.params.no);
  res.json(filtered);
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

  const exists = acknowledgments.some(
    (ack) => ack.docNo === req.params.no && ack.username === req.user.username && ack.version === String(doc.rev)
  );
  if (exists) {
    return res.status(400).json({ error: 'คุณได้ลงชื่อรับทราบเอกสารเวอร์ชันปัจจุบันเรียบร้อยแล้ว' });
  }

  const newAck = {
    id: `ack-${Date.now()}`,
    docNo: req.params.no,
    username: req.user.username,
    name: req.user.name,
    role: req.user.role,
    ts: new Date().toISOString(),
    version: String(doc.rev),
  };

  acknowledgments.unshift(newAck);
  await logAction(req.user, 'doc:acknowledge', req.params.no);

  res.status(201).json(acknowledgments.filter((ack) => ack.docNo === req.params.no));
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

// อัปเดตไฟล์แนบเป็นเวอร์ชันใหม่ — แทนที่ไฟล์เดิม + เพิ่มเลขแก้ไข (rev) + บันทึกประวัติ
// สิทธิ์: Creator อัปเดตได้ทุกชนิด; Admin/User อัปเดตได้เฉพาะไฟล์ Excel
app.post('/api/documents/:no/attachments/:id/version', authMw, upload.single('file'), wrap(async (req, res) => {
  const doc = await store.getDocument(req.params.no);
  if (!doc) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
  const att = (doc.attachments || []).find((a) => a.id === req.params.id);
  if (!att) return res.status(404).json({ error: 'ไม่พบไฟล์แนบ' });
  if (att.kind === 'url') return res.status(400).json({ error: 'อัปเดตได้เฉพาะไฟล์ที่อัปโหลด ไม่ใช่ลิงก์' });
  if (!req.file) return res.status(400).json({ error: 'กรุณาแนบไฟล์ใหม่' });

  const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const newKind = kindFromFile(name, req.file.mimetype);
  // ตรวจสิทธิ์ตามบทบาท — ไม่ใช่ Creator ต้องเป็น Excel ทั้งไฟล์เดิมและไฟล์ใหม่
  if (req.user.role !== 'creator' && (att.kind !== 'excel' || newKind !== 'excel')) {
    return res.status(403).json({ error: 'บทบาทของคุณอัปเดตได้เฉพาะไฟล์ Excel เท่านั้น' });
  }

  const storage = await store.saveFile(req.file);
  await store.updateAttachment(att.id, {
    name, kind: newKind, mime: req.file.mimetype, size: req.file.size, storage,
  });

  // เพิ่มเลขแก้ไข + ปรับวันที่ + ปรับชุดชนิดไฟล์ของเอกสาร
  const fresh = await store.getDocument(req.params.no);
  const kinds = [...new Set((fresh.attachments || []).map((a) => a.kind))];
  await store.updateDocument(req.params.no, { rev: (doc.rev || 1) + 1, updated: new Date().toISOString().slice(0, 10), files: kinds });
  await logAction(req.user, 'doc:file-update', req.params.no);
  res.json(await store.getDocument(req.params.no));
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

// ── Emergency Kit Export (ZIP) ───────────────────────────────
app.get('/api/documents/export/zip', authMw, requirePerm('docs:export'), wrap(async (req, res) => {
  const docs = await store.listDocuments();
  const zip = new SimpleZip();
  let rowsHtml = '';
  const nowStr = new Date().toLocaleString('th-TH');
  
  for (const d of docs) {
    let attachmentsLinks = [];
    for (const a of d.attachments || []) {
      if (a.kind === 'url') {
        attachmentsLinks.push(`<a href="${a.url}" target="_blank" rel="noopener noreferrer">🔗 ลิงก์ภายนอก</a>`);
      } else if (a.storage) {
        try {
          const buf = await store.readAttachmentData(a);
          if (buf) {
            const zipPath = `files/${a.id}_${a.name}`;
            zip.addFile(zipPath, buf);
            attachmentsLinks.push(`<a href="${zipPath}" download>${a.name}</a>`);
          } else {
            attachmentsLinks.push(`<span style="color:#70758C">⚠️ ไฟล์ขัดข้อง (${a.name})</span>`);
          }
        } catch (e) {
          console.error(`Failed to pack file ${a.name}:`, e);
          attachmentsLinks.push(`<span style="color:#70758C">⚠️ โหลดไม่สำเร็จ (${a.name})</span>`);
        }
      }
    }
    
    const typeLabel = d.type;
    const statusClass = `badge badge-${d.status}`;
    const statusLabel = d.status === 'effective' ? 'ประกาศใช้' :
                        d.status === 'review' ? 'รอทบทวน' :
                        d.status === 'draft' ? 'ร่าง' : 'ยกเลิก';
                        
    rowsHtml += `
      <tr>
        <td><span class="type-tag">${typeLabel}</span></td>
        <td style="font-family:monospace; font-weight:600;">${d.no}</td>
        <td><strong>${d.th}</strong></td>
        <td style="text-align:center;">${String(d.rev).padStart(2, '0')}</td>
        <td><span class="${statusClass}">${statusLabel}</span></td>
        <td>${d.owner}</td>
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
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="TUH-QMS-Emergency-Kit.zip"');
  res.send(zipBuffer);
  
  await logAction(req.user, 'register:emergency-export');
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
      lh.writeUInt16LE(0, 6);
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
      ch.writeUInt16LE(0, 8);
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

