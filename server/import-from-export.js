/* นำเข้าข้อมูลที่ export ไว้จาก Supabase เข้าสู่ PostgreSQL (บน VPS)
   ใช้ครั้งเดียวตอนย้ายระบบ — รันซ้ำได้ (ของเดิมไม่ถูกเขียนทับ)

   วิธีใช้:
     DATABASE_URL=postgres://... \
     IMPORT_DIR=/path/to/backup \
     UPLOAD_DIR=/app/uploads \
     node server/import-from-export.js

   โครงสร้างโฟลเดอร์ IMPORT_DIR ที่รองรับ (ผลจากสคริปต์ export):
     app_users.json  documents.json  attachments.json  logs.json  files/
*/
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_DIR = process.env.IMPORT_DIR;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'data', 'uploads');

if (!process.env.DATABASE_URL) { console.error('❌ ต้องตั้ง DATABASE_URL'); process.exit(1); }
if (!IMPORT_DIR) { console.error('❌ ต้องตั้ง IMPORT_DIR (โฟลเดอร์ที่ export ไว้)'); process.exit(1); }

const readJson = (name) => {
  const p = path.join(IMPORT_DIR, name);
  if (!fs.existsSync(p)) { console.log(`  (ข้าม ${name} — ไม่พบไฟล์)`); return []; }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

// ชื่อไฟล์ตอน export ถูกแทน / ด้วย __ — แปลงกลับเพื่อเทียบกับ storage_path
const exportedName = (storagePath) => storagePath.replace(/[^A-Za-z0-9._/-]/g, '_').replace(/\//g, '__');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false } : false,
});

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  console.log('== นำเข้าผู้ใช้งาน ==');
  const users = readJson('app_users.json');
  let uOk = 0;
  for (const u of users) {
    const r = await pool.query(
      `insert into app_users (username, password_hash, name, role, cat, created_at)
       values ($1,$2,$3,$4,$5, coalesce($6, now()))
       on conflict (username) do nothing`,
      [u.username, u.password_hash, u.name, u.role, u.cat ?? null, u.created_at ?? null],
    );
    uOk += r.rowCount;
  }
  console.log(`  เพิ่มใหม่ ${uOk} / ทั้งหมด ${users.length} บัญชี (รหัสผ่านเดิมใช้ได้ตามปกติ)`);

  console.log('== นำเข้าเอกสาร ==');
  const docs = readJson('documents.json');
  let dOk = 0;
  for (const d of docs) {
    const r = await pool.query(
      `insert into documents (no, th, type, cat, rev, status, updated, owner, retention, files, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, coalesce($11, now()))
       on conflict (no) do nothing`,
      [d.no, d.th, d.type, d.cat, d.rev ?? 1, d.status ?? 'draft', d.updated ?? null,
       d.owner ?? null, d.retention ?? 5, JSON.stringify(d.files ?? []), d.created_at ?? null],
    );
    dOk += r.rowCount;
  }
  console.log(`  เพิ่มใหม่ ${dOk} / ทั้งหมด ${docs.length} เอกสาร`);

  console.log('== นำเข้าไฟล์แนบ (เมตาดาทา) ==');
  const atts = readJson('attachments.json');
  let aOk = 0;
  for (const a of atts) {
    const r = await pool.query(
      `insert into attachments (id, doc_no, kind, name, mime, size, url, storage_path, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8, coalesce($9, now()))
       on conflict (id) do nothing`,
      [a.id, a.doc_no, a.kind, a.name, a.mime ?? null, a.size ?? null,
       a.url ?? null, a.storage_path ?? null, a.created_at ?? null],
    );
    aOk += r.rowCount;
  }
  console.log(`  เพิ่มใหม่ ${aOk} / ทั้งหมด ${atts.length} รายการ`);

  console.log('== คัดลอกไฟล์จริงเข้าที่เก็บ ==');
  const filesDir = path.join(IMPORT_DIR, 'files');
  let fOk = 0, fMiss = 0;
  if (fs.existsSync(filesDir)) {
    for (const a of atts) {
      if (!a.storage_path) continue;                       // เป็นลิงก์ url ไม่มีไฟล์จริง
      if (/^r2:|^https?:\/\//i.test(a.storage_path)) continue;
      const src = path.join(filesDir, exportedName(a.storage_path));
      const dest = path.join(UPLOAD_DIR, a.storage_path);
      if (!fs.existsSync(src)) { console.log(`  ⚠️ ไม่พบไฟล์ ${a.name}`); fMiss++; continue; }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
      fOk++;
    }
  }
  console.log(`  คัดลอกแล้ว ${fOk} ไฟล์${fMiss ? ` · หาไม่เจอ ${fMiss} ไฟล์` : ''}`);

  console.log('== นำเข้าบันทึกกิจกรรม ==');
  const logs = readJson('logs.json');
  let lOk = 0;
  for (const l of logs) {
    const r = await pool.query(
      `insert into logs (id, ts, username, name, role, action, target, detail)
       values ($1, coalesce($2, now()),$3,$4,$5,$6,$7,$8)
       on conflict (id) do nothing`,
      [l.id, l.ts ?? null, l.username ?? null, l.name ?? null, l.role ?? null,
       l.action, l.target ?? null, l.detail ?? null],
    );
    lOk += r.rowCount;
  }
  console.log(`  เพิ่มใหม่ ${lOk} / ทั้งหมด ${logs.length} รายการ`);

  console.log('\n✅ นำเข้าข้อมูลเสร็จสมบูรณ์');
} catch (e) {
  console.error('\n❌ นำเข้าข้อมูลไม่สำเร็จ:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
