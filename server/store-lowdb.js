/* Store implementation #1 — lowdb (ไฟล์ JSON ในเครื่อง) + ไฟล์แนบบนดิสก์.
   ใช้เป็นค่าเริ่มต้นเมื่อยังไม่ได้ตั้งค่า Supabase. */
import { JSONFilePreset } from 'lowdb/node';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_USERS, SEED_DOCS, newId } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = await JSONFilePreset(path.join(DATA_DIR, 'db.json'), {
  users: [], documents: [], attachments: [], logs: [],
});

// Seed on first run
let changed = false;
if (db.data.users.length === 0) {
  db.data.users = SEED_USERS.map((u) => ({
    username: u.username, passwordHash: bcrypt.hashSync(u.password, 8),
    name: u.name, role: u.role, createdAt: new Date().toISOString(),
  }));
  changed = true;
}
if (db.data.documents.length === 0) {
  db.data.documents = SEED_DOCS.map((d) => ({ ...d, createdAt: new Date().toISOString() }));
  changed = true;
}
if (changed) await db.write();

const withAtt = (doc) => ({ ...doc, attachments: db.data.attachments.filter((a) => a.docNo === doc.no) });

export const lowdbStore = {
  label: 'lowdb (ไฟล์ในเครื่อง)',

  async getUserByUsername(username) {
    return db.data.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
  },
  async listUsers() {
    return db.data.users.map((u) => ({ username: u.username, name: u.name, role: u.role, createdAt: u.createdAt }));
  },
  async createUser(u) {
    const row = { ...u, createdAt: new Date().toISOString() };
    db.data.users.push(row);
    await db.write();
    return { username: row.username, name: row.name, role: row.role, createdAt: row.createdAt };
  },
  async deleteUser(username) {
    db.data.users = db.data.users.filter((u) => u.username !== username);
    await db.write();
  },
  async countCreators() {
    return db.data.users.filter((u) => u.role === 'creator').length;
  },

  async listDocuments() {
    return db.data.documents.map(withAtt);
  },
  async getDocument(no) {
    const d = db.data.documents.find((x) => x.no === no);
    return d ? withAtt(d) : null;
  },
  async documentExists(no) {
    return db.data.documents.some((d) => d.no.toLowerCase() === no.toLowerCase());
  },
  async createDocument(doc, attachments) {
    const atts = attachments.map((a) => ({ id: newId(), createdAt: new Date().toISOString(), ...a }));
    db.data.documents.unshift(doc);
    db.data.attachments.push(...atts);
    await db.write();
    return withAtt(doc);
  },
  async updateDocument(no, patch) {
    const d = db.data.documents.find((x) => x.no === no);
    if (!d) return null;
    Object.assign(d, patch);
    await db.write();
    return withAtt(d);
  },
  async deleteDocument(no) {
    const atts = db.data.attachments.filter((a) => a.docNo === no);
    for (const a of atts) {
      if (a.storage) { try { fs.unlinkSync(path.join(UPLOAD_DIR, a.storage)); } catch { /* ignore */ } }
    }
    db.data.attachments = db.data.attachments.filter((a) => a.docNo !== no);
    db.data.documents = db.data.documents.filter((d) => d.no !== no);
    await db.write();
  },

  async getAttachment(id) {
    return db.data.attachments.find((a) => a.id === id) || null;
  },
  async readAttachmentData(att) {
    const filePath = path.join(UPLOAD_DIR, att.storage);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  },
  // บันทึกไฟล์ลงดิสก์ คืน storage ref
  async saveFile(file) {
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, safe), file.buffer);
    return safe;
  },

  async addLog(entry) {
    db.data.logs.unshift(entry);
    db.data.logs = db.data.logs.slice(0, 1000);
    await db.write();
  },
  async listLogs() {
    return db.data.logs;
  },
};
