/* Store implementation #2 — Supabase (Postgres + Storage).
   เปิดใช้เมื่อมี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env
   ใช้ service_role key (ฝั่งเซิร์ฟเวอร์เท่านั้น — ข้าม RLS) */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { newId, SEED_USERS, SEED_DOCS } from './seed.js';
import { R2_ENABLED, isR2Ref, r2Upload, r2Download, r2Delete } from './r2.js';

const BUCKET = process.env.SUPABASE_BUCKET || 'qms-files';

// map row (snake_case) ↔ object (camelCase) ให้ shape ตรงกับ lowdb store
const docFromRow = (r) => ({
  no: r.no, th: r.th, type: r.type, cat: r.cat, rev: r.rev, status: r.status,
  updated: r.updated, owner: r.owner, retention: r.retention, files: r.files || [], createdAt: r.created_at,
});
const attFromRow = (r) => ({
  id: r.id, docNo: r.doc_no, kind: r.kind, name: r.name, mime: r.mime,
  size: r.size, url: r.url, storage: r.storage_path, createdAt: r.created_at,
});

export async function createSupabaseStore() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const must = (error) => { if (error) throw new Error(error.message); };

  // ใส่ข้อมูลตั้งต้นถ้าตารางยังว่าง (บัญชีผู้ใช้ + เอกสารตัวอย่าง)
  {
    const { count: uCount, error: uErr } = await sb.from('app_users').select('username', { count: 'exact', head: true });
    must(uErr);
    if (!uCount) {
      const { error } = await sb.from('app_users').insert(SEED_USERS.map((u) => ({
        username: u.username, password_hash: bcrypt.hashSync(u.password, 8), name: u.name, role: u.role, cat: u.cat || null,
      })));
      must(error);
    }
    const { count: dCount, error: dErr } = await sb.from('documents').select('no', { count: 'exact', head: true });
    must(dErr);
    if (!dCount) {
      const { error } = await sb.from('documents').insert(SEED_DOCS.map((d) => ({
        no: d.no, th: d.th, type: d.type, cat: d.cat, rev: d.rev, status: d.status,
        updated: d.updated, owner: d.owner, retention: d.retention, files: d.files,
      })));
      must(error);
    }
  }

  const attsFor = async (nos) => {
    const { data, error } = await sb.from('attachments').select('*').in('doc_no', nos);
    must(error);
    return (data || []).map(attFromRow);
  };
  const withAtt = async (doc) => ({ ...doc, attachments: await attsFor([doc.no]) });

  return {
    label: 'Supabase (Postgres + Storage)',

    async getUserByUsername(username) {
      const { data, error } = await sb.from('app_users').select('*').ilike('username', username.trim()).maybeSingle();
      must(error);
      if (!data) return null;
      return { username: data.username, passwordHash: data.password_hash, name: data.name, role: data.role, cat: data.cat || null };
    },
    async listUsers() {
      const { data, error } = await sb.from('app_users').select('username,name,role,cat,created_at').order('created_at');
      must(error);
      return (data || []).map((u) => ({ username: u.username, name: u.name, role: u.role, cat: u.cat || null, createdAt: u.created_at }));
    },
    async createUser(u) {
      const { data, error } = await sb.from('app_users')
        .insert({ username: u.username, password_hash: u.passwordHash, name: u.name, role: u.role, cat: u.cat || null })
        .select().single();
      must(error);
      return { username: data.username, name: data.name, role: data.role, cat: data.cat || null, createdAt: data.created_at };
    },
    async updateUser(username, patch) {
      const row = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.role !== undefined) row.role = patch.role;
      if (patch.cat !== undefined) row.cat = patch.cat;
      const { data, error } = await sb.from('app_users').update(row).eq('username', username).select().single();
      must(error);
      return { username: data.username, name: data.name, role: data.role, cat: data.cat || null, createdAt: data.created_at };
    },
    async resetUserPassword(username, passwordHash) {
      const { error } = await sb.from('app_users').update({ password_hash: passwordHash }).eq('username', username);
      must(error);
    },
    async deleteUser(username) {
      const { error } = await sb.from('app_users').delete().eq('username', username);
      must(error);
    },
    async countSysadmins() {
      const { count, error } = await sb.from('app_users').select('username', { count: 'exact', head: true }).eq('role', 'sysadmin');
      must(error);
      return count || 0;
    },

    async listDocuments() {
      const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false });
      must(error);
      const docs = (data || []).map(docFromRow);
      if (docs.length === 0) return [];
      const allAtts = await attsFor(docs.map((d) => d.no));
      return docs.map((d) => ({ ...d, attachments: allAtts.filter((a) => a.docNo === d.no) }));
    },
    async getDocument(no) {
      const { data, error } = await sb.from('documents').select('*').eq('no', no).maybeSingle();
      must(error);
      if (!data) return null;
      const doc = await withAtt(docFromRow(data));
      const { data: logs } = await sb.from('logs').select('ts,action,name').eq('target', no).order('ts', { ascending: false });
      doc.history = (logs || []).map((l) => ({ ts: l.ts, action: l.action, by: l.name }));
      return doc;
    },
    async documentExists(no) {
      const { data, error } = await sb.from('documents').select('no').ilike('no', no).maybeSingle();
      must(error);
      return !!data;
    },
    async createDocument(doc, attachments) {
      const { error: de } = await sb.from('documents').insert({
        no: doc.no, th: doc.th, type: doc.type, cat: doc.cat, rev: doc.rev, status: doc.status,
        updated: doc.updated || null, owner: doc.owner, retention: doc.retention, files: doc.files,
      });
      must(de);
      if (attachments.length) {
        const rows = attachments.map((a) => ({
          doc_no: doc.no, kind: a.kind, name: a.name, mime: a.mime || null,
          size: a.size || null, url: a.url || null, storage_path: a.storage || null,
        }));
        const { error: ae } = await sb.from('attachments').insert(rows);
        must(ae);
      }
      return this.getDocument(doc.no);
    },
    async updateDocument(no, patch) {
      const row = {};
      if (patch.status != null) row.status = patch.status;
      if (patch.rev != null) row.rev = patch.rev;
      if (patch.updated != null) row.updated = patch.updated;
      if (patch.files != null) row.files = patch.files;
      const { data, error } = await sb.from('documents').update(row).eq('no', no).select().maybeSingle();
      must(error);
      return data ? withAtt(docFromRow(data)) : null;
    },
    async deleteDocument(no) {
      const atts = await attsFor([no]);
      const paths = atts.filter((a) => a.storage).map((a) => a.storage);
      // แยกลบ: ไฟล์ R2 ผ่าน r2Delete, ไฟล์เดิมผ่าน Supabase Storage
      const r2Paths = paths.filter(isR2Ref);
      const sbPaths = paths.filter((p) => !isR2Ref(p));
      if (r2Paths.length) await r2Delete(r2Paths);
      if (sbPaths.length) await sb.storage.from(BUCKET).remove(sbPaths);
      // attachments ลบอัตโนมัติด้วย ON DELETE CASCADE
      const { error } = await sb.from('documents').delete().eq('no', no);
      must(error);
    },

    async getAttachment(id) {
      const { data, error } = await sb.from('attachments').select('*').eq('id', id).maybeSingle();
      must(error);
      return data ? attFromRow(data) : null;
    },
    // แทนที่ไฟล์แนบเดิมด้วยไฟล์ใหม่ (อัปเดตเวอร์ชัน) — ลบไฟล์เก่าใน Storage ด้วย
    async updateAttachment(id, patch) {
      const { data: cur } = await sb.from('attachments').select('storage_path').eq('id', id).maybeSingle();
      const row = {};
      if (patch.name != null) row.name = patch.name;
      if (patch.kind != null) row.kind = patch.kind;
      if (patch.mime != null) row.mime = patch.mime;
      if (patch.size != null) row.size = patch.size;
      if (patch.storage != null) row.storage_path = patch.storage;
      const { data, error } = await sb.from('attachments').update(row).eq('id', id).select().maybeSingle();
      must(error);
      // ลบไฟล์เก่า — เลือกช่องทางตามชนิด ref (R2 หรือ Supabase Storage)
      if (patch.storage && cur?.storage_path && cur.storage_path !== patch.storage) {
        if (isR2Ref(cur.storage_path)) await r2Delete(cur.storage_path);
        else await sb.storage.from(BUCKET).remove([cur.storage_path]);
      }
      return data ? attFromRow(data) : null;
    },
    async readAttachmentData(att) {
      // ไฟล์ที่เก็บบน R2 → อ่านจาก R2; ของเก่าบน Supabase Storage → อ่านแบบเดิม
      if (isR2Ref(att.storage)) return r2Download(att.storage);
      // retry ครั้งหนึ่งเผื่อ read-after-write ของ Storage ยังไม่พร้อม
      for (let i = 0; i < 2; i++) {
        const { data, error } = await sb.storage.from(BUCKET).download(att.storage);
        if (!error && data) return Buffer.from(await data.arrayBuffer());
        if (i === 0) await new Promise((r) => setTimeout(r, 400));
      }
      return null;
    },
    async saveFile(file) {
      // ถ้าตั้งค่า R2 ครบ → เก็บไฟล์ใหม่บน R2 (ความจุเยอะกว่า)
      if (R2_ENABLED) return r2Upload(file);
      const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0];
      const key = `${newId()}${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(key, file.buffer, {
        contentType: file.mimetype, upsert: false,
      });
      must(error);
      return key;
    },

    async addLog(entry) {
      const { error } = await sb.from('logs').insert({
        ts: entry.ts, username: entry.username, name: entry.name, role: entry.role,
        action: entry.action, target: entry.target, detail: entry.detail,
      });
      must(error);
    },
    async listLogs() {
      const { data, error } = await sb.from('logs').select('*').order('ts', { ascending: false }).limit(1000);
      must(error);
      return (data || []).map((l) => ({ id: l.id, ts: l.ts, username: l.username, name: l.name, role: l.role, action: l.action, target: l.target, detail: l.detail }));
    },
  };
}
