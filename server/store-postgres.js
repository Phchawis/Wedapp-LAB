/* Store implementation #3 — PostgreSQL (บน VPS) + ไฟล์แนบบนดิสก์.
   เปิดใช้เมื่อมี DATABASE_URL ใน .env

   ต่างจาก store-supabase ตรงที่:
     - คุย Postgres ตรงผ่าน pg (ไม่ผ่าน PostgREST)
     - ไฟล์จริงเก็บบนดิสก์ที่ UPLOAD_DIR (ค่าเริ่มต้น server/data/uploads)
       เหมือน lowdb store — ยังรองรับ R2 ถ้าตั้งค่าไว้
   shape ของข้อมูลที่คืนออกไปเหมือนอีกสอง store ทุกประการ */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newId, SEED_USERS, SEED_DOCS } from './seed.js';
import { R2_ENABLED, isR2Ref, r2Upload, r2Download, r2Delete } from './r2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'data', 'uploads');

/* updated เป็นคอลัมน์ DATE — pg คืนเป็น Date object ที่ตั้งเวลาเที่ยงคืน "ตามโซนเวลาเครื่อง"
   ถ้าแปลงด้วย toISOString() (UTC) วันที่จะเพี้ยนถอยไป 1 วันในโซนเวลาไทย (+07)
   จึงอ่านค่าจากส่วนประกอบ local แทน เพื่อให้ได้ 'YYYY-MM-DD' ตรงกับที่บันทึกไว้จริง */
const dateOnly = (v) => {
  if (!(v instanceof Date)) return v;
  const p = (n) => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
};

// map row (snake_case) ↔ object (camelCase) ให้ shape ตรงกับ store อื่น
const docFromRow = (r) => ({
  no: r.no, th: r.th, type: r.type, cat: r.cat, rev: r.rev, status: r.status,
  updated: dateOnly(r.updated),
  owner: r.owner, retention: r.retention, files: r.files || [], createdAt: r.created_at,
});
const attFromRow = (r) => ({
  id: r.id, docNo: r.doc_no, kind: r.kind, name: r.name, mime: r.mime,
  size: r.size, url: r.url, storage: r.storage_path, createdAt: r.created_at,
});

export async function createPostgresStore() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // Postgres ในเครือข่ายเดียวกัน (docker) ไม่ต้องใช้ TLS; ถ้าต่อข้ามเน็ตให้ตั้ง PGSSL=1
    ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PGPOOL_MAX || 10),
  });
  const q = (text, params) => pool.query(text, params);

  /* ใส่ข้อมูลตั้งต้นถ้าตารางยังว่าง (บัญชีผู้ใช้ + เอกสารตัวอย่าง)
     ⚠️ บัญชีตัวอย่างใช้รหัสผ่านที่รู้กันทั่วไป — ห้ามให้สร้างบนระบบใช้งานจริง
     จึงข้ามการ seed เมื่อ NODE_ENV=production เว้นแต่ตั้ง ALLOW_SEED=1 อย่างจงใจ */
  const allowSeed = process.env.ALLOW_SEED === '1' || process.env.NODE_ENV !== 'production';
  if (allowSeed) {
    const { rows: [u] } = await q('select count(*)::int as n from app_users');
    if (!u.n) {
      for (const s of SEED_USERS) {
        await q(
          `insert into app_users (username, password_hash, name, role, cat)
           values ($1,$2,$3,$4,$5) on conflict (username) do nothing`,
          [s.username, bcrypt.hashSync(s.password, 8), s.name, s.role, s.cat || null],
        );
      }
    }
    const { rows: [d] } = await q('select count(*)::int as n from documents');
    if (!d.n) {
      for (const s of SEED_DOCS) {
        await q(
          `insert into documents (no, th, type, cat, rev, status, updated, owner, retention, files)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (no) do nothing`,
          [s.no, s.th, s.type, s.cat, s.rev, s.status, s.updated || null, s.owner, s.retention, JSON.stringify(s.files || [])],
        );
      }
    }
  }

  const attsFor = async (nos) => {
    const { rows } = await q('select * from attachments where doc_no = any($1::text[])', [nos]);
    return rows.map(attFromRow);
  };
  const withAtt = async (doc) => ({ ...doc, attachments: await attsFor([doc.no]) });

  // ลบไฟล์จริง — แยกช่องทางตามชนิด ref (R2 หรือดิสก์)
  const removeFiles = async (paths) => {
    const list = paths.filter(Boolean);
    if (!list.length) return;
    const r2Paths = list.filter(isR2Ref);
    if (r2Paths.length) await r2Delete(r2Paths);
    for (const p of list.filter((x) => !isR2Ref(x))) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, p)); } catch { /* ไฟล์หายไปแล้ว — ข้าม */ }
    }
  };

  return {
    label: `PostgreSQL (${R2_ENABLED ? 'ไฟล์บน R2' : 'ไฟล์บนดิสก์'})`,

    async getUserByUsername(username) {
      const { rows } = await q('select * from app_users where lower(username) = lower($1)', [username.trim()]);
      if (!rows[0]) return null;
      const r = rows[0];
      return { username: r.username, passwordHash: r.password_hash, name: r.name, role: r.role, cat: r.cat, createdAt: r.created_at };
    },
    async listUsers() {
      const { rows } = await q('select username, name, role, cat, created_at from app_users order by created_at');
      return rows.map((r) => ({ username: r.username, name: r.name, role: r.role, cat: r.cat || null, createdAt: r.created_at }));
    },
    async createUser(u) {
      const { rows } = await q(
        `insert into app_users (username, password_hash, name, role, cat)
         values ($1,$2,$3,$4,$5) returning username, name, role, cat, created_at`,
        [u.username, u.passwordHash, u.name, u.role, u.cat || null],
      );
      const r = rows[0];
      return { username: r.username, name: r.name, role: r.role, cat: r.cat || null, createdAt: r.created_at };
    },
    async updateUser(username, patch) {
      const sets = [];
      const vals = [];
      const put = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
      // รองรับการเปลี่ยน username ด้วย (เดิมตกหล่น ทำให้เปลี่ยนชื่อผู้ใช้ล้มเหลวเงียบ ๆ)
      if (patch.username != null && patch.username !== username) put('username', patch.username);
      if (patch.name != null) put('name', patch.name);
      if (patch.role != null) put('role', patch.role);
      if (patch.cat !== undefined) put('cat', patch.cat);
      if (patch.passwordHash != null) put('password_hash', patch.passwordHash);
      // เทียบ username แบบไม่สนตัวพิมพ์ ให้ตรงกับ getUserByUsername (กันแก้/ลบไม่โดนเพราะพิมพ์ต่างเคส)
      if (!sets.length) {
        const { rows } = await q('select username, name, role, cat, created_at from app_users where lower(username) = lower($1)', [username]);
        return rows[0] ? { username: rows[0].username, name: rows[0].name, role: rows[0].role, cat: rows[0].cat || null, createdAt: rows[0].created_at } : null;
      }
      vals.push(username);
      const { rows } = await q(
        `update app_users set ${sets.join(', ')} where lower(username) = lower($${vals.length}) returning username, name, role, cat, created_at`,
        vals,
      );
      const r = rows[0];
      return r ? { username: r.username, name: r.name, role: r.role, cat: r.cat || null, createdAt: r.created_at } : null;
    },
    async resetUserPassword(username, passwordHash) {
      await q('update app_users set password_hash = $1 where lower(username) = lower($2)', [passwordHash, username]);
    },
    async deleteUser(username) {
      await q('delete from app_users where lower(username) = lower($1)', [username]);
    },
    async countSysadmins() {
      const { rows } = await q(`select count(*)::int as n from app_users where role = 'sysadmin'`);
      return rows[0].n;
    },

    async listDocuments() {
      const { rows } = await q('select * from documents order by created_at desc');
      const docs = rows.map(docFromRow);
      if (!docs.length) return [];
      const allAtts = await attsFor(docs.map((d) => d.no));
      return docs.map((d) => ({ ...d, attachments: allAtts.filter((a) => a.docNo === d.no) }));
    },
    async getDocument(no) {
      const { rows } = await q('select * from documents where no = $1', [no]);
      if (!rows[0]) return null;
      const doc = await withAtt(docFromRow(rows[0]));
      const { rows: logs } = await q('select ts, action, name from logs where target = $1 order by ts desc limit 200', [no]);
      doc.history = logs.map((l) => ({ ts: l.ts, action: l.action, by: l.name }));
      return doc;
    },
    async documentExists(no) {
      const { rows } = await q('select 1 from documents where lower(no) = lower($1) limit 1', [no]);
      return rows.length > 0;
    },
    async createDocument(doc, attachments) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(
          `insert into documents (no, th, type, cat, rev, status, updated, owner, retention, files)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [doc.no, doc.th, doc.type, doc.cat, doc.rev, doc.status, doc.updated || null, doc.owner, doc.retention, JSON.stringify(doc.files || [])],
        );
        for (const a of attachments) {
          await client.query(
            `insert into attachments (doc_no, kind, name, mime, size, url, storage_path)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [doc.no, a.kind, a.name, a.mime || null, a.size || null, a.url || null, a.storage || null],
          );
        }
        await client.query('commit');
      } catch (e) {
        await client.query('rollback');
        throw e;
      } finally {
        client.release();
      }
      return this.getDocument(doc.no);
    },
    async updateDocument(no, patch) {
      const sets = [];
      const vals = [];
      const put = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
      if (patch.status != null) put('status', patch.status);
      if (patch.rev != null) put('rev', patch.rev);
      if (patch.updated != null) put('updated', patch.updated);
      if (patch.files != null) put('files', JSON.stringify(patch.files));
      if (!sets.length) return this.getDocument(no);
      vals.push(no);
      const { rows } = await q(`update documents set ${sets.join(', ')} where no = $${vals.length} returning *`, vals);
      return rows[0] ? withAtt(docFromRow(rows[0])) : null;
    },
    async deleteDocument(no) {
      const atts = await attsFor([no]);
      // ลบ record ในฐานข้อมูลก่อน (attachments ลบตามด้วย ON DELETE CASCADE)
      // ค่อยลบไฟล์จริงหลังลบสำเร็จ — ถ้าลบ DB พลาด ไฟล์จะยังอยู่ (record ไม่ชี้ไฟล์ที่หาย)
      await q('delete from documents where no = $1', [no]);
      await removeFiles(atts.map((a) => a.storage));
    },

    async getAttachment(id) {
      // id ต้องเป็น UUID — ถ้าไม่ใช่ให้คืน null (404) แทนที่จะให้ Postgres โยน error เป็น 500
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))) return null;
      const { rows } = await q('select * from attachments where id = $1', [id]);
      return rows[0] ? attFromRow(rows[0]) : null;
    },
    // แทนที่ไฟล์แนบเดิมด้วยไฟล์ใหม่ (อัปเดตเวอร์ชัน) — ลบไฟล์เก่าทิ้งด้วย
    async updateAttachment(id, patch) {
      const { rows: cur } = await q('select storage_path from attachments where id = $1', [id]);
      const sets = [];
      const vals = [];
      const put = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
      if (patch.name != null) put('name', patch.name);
      if (patch.kind != null) put('kind', patch.kind);
      if (patch.mime != null) put('mime', patch.mime);
      if (patch.size != null) put('size', patch.size);
      if (patch.storage != null) put('storage_path', patch.storage);
      if (!sets.length) return this.getAttachment(id);
      vals.push(id);
      const { rows } = await q(`update attachments set ${sets.join(', ')} where id = $${vals.length} returning *`, vals);
      const old = cur[0]?.storage_path;
      if (patch.storage && old && old !== patch.storage) await removeFiles([old]);
      return rows[0] ? attFromRow(rows[0]) : null;
    },
    async readAttachmentData(att) {
      if (isR2Ref(att.storage)) return r2Download(att.storage);
      const filePath = path.join(UPLOAD_DIR, att.storage);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath);
    },
    // บันทึกไฟล์ — ถ้าตั้งค่า R2 ครบ เก็บบน R2, ไม่งั้นเก็บลงดิสก์
    async saveFile(file) {
      if (R2_ENABLED) return r2Upload(file);
      const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0];
      const key = `${newId()}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, key), file.buffer);
      return key;
    },

    // ── ลายมือชื่อรับทราบ (เก็บถาวรใน DB) ──
    async listAcknowledgments(docNo) {
      const { rows } = await q('select * from acknowledgments where doc_no = $1 order by ts desc', [docNo]);
      return rows.map((a) => ({ id: a.id, docNo: a.doc_no, username: a.username, name: a.name, role: a.role, ts: a.ts, version: a.version }));
    },
    async hasAcknowledged(docNo, username, version) {
      const { rows } = await q(
        'select 1 from acknowledgments where doc_no = $1 and username = $2 and version = $3 limit 1',
        [docNo, username, String(version)],
      );
      return rows.length > 0;
    },
    async addAcknowledgment(entry) {
      // on conflict do nothing กันการกดซ้ำเร็ว ๆ (race) ไม่ให้เกิดแถวซ้ำ
      const { rows } = await q(
        `insert into acknowledgments (doc_no, username, name, role, version, ts)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (doc_no, username, version) do nothing
         returning id`,
        [entry.docNo, entry.username, entry.name, entry.role, String(entry.version), entry.ts],
      );
      return rows.length > 0; // true = เพิ่มใหม่, false = มีอยู่แล้ว
    },

    async addLog(entry) {
      await q(
        `insert into logs (ts, username, name, role, action, target, detail)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [entry.ts, entry.username, entry.name, entry.role, entry.action, entry.target, entry.detail],
      );
    },
    async listLogs() {
      const { rows } = await q('select * from logs order by ts desc limit 1000');
      return rows.map((l) => ({
        id: l.id, ts: l.ts, username: l.username, name: l.name, role: l.role,
        action: l.action, target: l.target, detail: l.detail,
      }));
    },
  };
}
