-- ════════════════════════════════════════════════════════════════
-- TUH Lab QMS — Supabase schema
-- รันสคริปต์นี้ใน Supabase Dashboard → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════

-- ผู้ใช้งานระบบ (เก็บ hash รหัสผ่าน — backend ทำ bcrypt ให้)
-- role: 7 ระดับสิทธิ์เทียบเท่าระบบ Masterlist (ดู src/auth/roles.js)
create table if not exists app_users (
  username     text primary key,
  password_hash text not null,
  name         text not null,
  role         text not null check (role in ('sysadmin','head_work','head_cat','med_tech','assistant','admin_staff','doc_manager')),
  created_at   timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- MANUAL MIGRATION — รันด้วยตัวเองใน Supabase SQL Editor ตอนพร้อม deploy โค้ดเวอร์ชันสิทธิ์ 7 ระดับ
-- (ห้ามรันอัตโนมัติ — ต้อง sync กับตอน deploy โค้ดใหม่พอดี ไม่งั้นบัญชีเดิมจะใช้งานไม่ได้ชั่วคราว)
-- ════════════════════════════════════════════════════════════════
-- begin;
-- alter table app_users drop constraint app_users_role_check;
-- alter table app_users add constraint app_users_role_check
--   check (role in ('sysadmin','head_work','head_cat','med_tech','assistant','admin_staff','doc_manager'));
-- update app_users set role = 'sysadmin'  where role = 'creator';
-- update app_users set role = 'head_work' where role = 'admin';
-- update app_users set role = 'med_tech'  where role = 'user';
-- commit;

-- เอกสารคุณภาพ
create table if not exists documents (
  no         text primary key,
  th         text not null,
  type       text not null,
  cat        text not null,
  rev        integer not null default 1,
  status     text not null default 'draft',
  updated    date,
  owner      text,
  retention  integer not null default 5,
  files      jsonb not null default '[]',   -- ชนิดไฟล์แนบ (เช่น ["pdf","url"]) ไว้โชว์ชิป
  created_at timestamptz not null default now()
);

-- ไฟล์แนบ / ลิงก์ (ไฟล์จริงเก็บใน Supabase Storage, แถวนี้เก็บเมตาดาทา)
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  doc_no       text not null references documents(no) on delete cascade,
  kind         text not null,            -- pdf | word | other | url
  name         text not null,
  mime         text,
  size         integer,
  url          text,                     -- สำหรับ kind = 'url'
  storage_path text,                     -- path ใน Storage bucket สำหรับไฟล์จริง
  created_at   timestamptz not null default now()
);
create index if not exists idx_attachments_doc on attachments(doc_no);

-- บันทึกกิจกรรม (audit log)
create table if not exists logs (
  id       uuid primary key default gen_random_uuid(),
  ts       timestamptz not null default now(),
  username text,
  name     text,
  role     text,
  action   text not null,
  target   text,
  detail   text
);
create index if not exists idx_logs_ts on logs(ts desc);

-- ════════════════════════════════════════════════════════════════
-- Storage bucket สำหรับไฟล์ Word/PDF
--   Dashboard → Storage → New bucket → ชื่อ "qms-files" → Private
-- (หรือรันใน SQL Editor:)
insert into storage.buckets (id, name, public)
values ('qms-files', 'qms-files', false)
on conflict (id) do nothing;

-- หมายเหตุความปลอดภัย:
-- backend เชื่อมต่อด้วย service_role key (ฝั่งเซิร์ฟเวอร์เท่านั้น) ซึ่งข้าม RLS
-- และบังคับสิทธิ์ 3 ระดับเองในโค้ด จึงไม่ต้องตั้ง RLS policy สำหรับสถาปัตยกรรมนี้
-- ⚠️ ห้ามนำ service_role key ไปไว้ฝั่ง frontend เด็ดขาด
