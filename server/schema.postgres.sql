-- ════════════════════════════════════════════════════════════════
-- TUH Lab QMS — PostgreSQL schema (สำหรับ Postgres บน VPS)
-- ต่างจาก schema.supabase.sql ตรงที่ไม่มีส่วน Storage bucket
-- (ไฟล์แนบเก็บบนดิสก์ของเซิร์ฟเวอร์แทน Supabase Storage)
--
-- วิธีรัน:  psql "$DATABASE_URL" -f server/schema.postgres.sql
-- ════════════════════════════════════════════════════════════════

-- gen_random_uuid() มากับ pgcrypto (Postgres 13+ มี built-in ใน core แล้ว แต่เผื่อไว้)
create extension if not exists pgcrypto;

-- ผู้ใช้งานระบบ (เก็บ hash รหัสผ่าน — backend ทำ bcrypt ให้)
create table if not exists app_users (
  username      text primary key,
  password_hash text not null,
  name          text not null,
  role          text not null check (role in ('sysadmin','head_work','head_cat','med_tech','assistant','admin_staff','doc_manager')),
  cat           text,
  created_at    timestamptz not null default now(),
  -- true = ต้องตั้งรหัสผ่านใหม่ก่อนใช้งาน (ใช้กับบัญชีที่ผู้ดูแลสร้างให้พร้อมรหัสชั่วคราว)
  must_change_password boolean not null default false
);

-- เพิ่มคอลัมน์ให้ฐานข้อมูลที่สร้างไว้ก่อนหน้า (ปลอดภัยเมื่อรันซ้ำ)
alter table app_users add column if not exists must_change_password boolean not null default false;

-- อีเมลสำหรับส่งลิงก์ตั้งรหัสผ่านใหม่ (ว่างได้ = รีเซ็ตเองไม่ได้ ต้องให้ผู้ดูแลตั้งให้)
alter table app_users add column if not exists email text not null default '';
create unique index if not exists app_users_email_key on app_users (email) where email <> '';

-- คำขอตั้งรหัสผ่านใหม่ — เก็บเฉพาะค่าแฮชของ token ไม่เก็บตัวจริง
-- ถ้าฐานข้อมูลรั่ว คนอ่านก็เอา token ไปใช้ไม่ได้
create table if not exists password_resets (
  id           uuid primary key default gen_random_uuid(),
  username     text not null references app_users(username) on delete cascade on update cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  requested_ip text
);
create index if not exists password_resets_user_idx on password_resets (username, created_at desc);

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
  files      jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ไฟล์แนบ / ลิงก์ (ไฟล์จริงอยู่บนดิสก์: storage_path = ชื่อไฟล์ใน UPLOAD_DIR)
-- ข้อมูลควบคุมเอกสารตาม ISO 15189:2022 ข้อ 8.3 — ต้องระบุได้ว่าใครทบทวน ใครอนุมัติ
-- และเมื่อไรต้องทบทวนรอบถัดไป (เพิ่มทีหลัง จึงใช้ add column แทนการแก้ create table)
alter table documents add column if not exists reviewer    text;
alter table documents add column if not exists approver    text;
alter table documents add column if not exists next_review date;
alter table documents add column if not exists controlled  boolean not null default true;

create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  doc_no       text not null references documents(no) on delete cascade,
  kind         text not null,
  name         text not null,
  mime         text,
  size         integer,
  url          text,
  storage_path text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attachments_doc on attachments(doc_no);

-- ลายมือชื่ออิเล็กทรอนิกส์ (รับทราบ/ฝึกอบรม) — ต้องเก็บถาวรในฐานข้อมูล
-- (เดิมเคยเก็บในหน่วยความจำ ทำให้หายทุกครั้งที่ restart — ห้ามทำอีก)
create table if not exists acknowledgments (
  id        uuid primary key default gen_random_uuid(),
  doc_no    text not null references documents(no) on delete cascade,
  username  text not null,
  name      text,
  role      text,
  version   text not null,            -- เวอร์ชันเอกสารที่ลงนามรับทราบ
  ts        timestamptz not null default now(),
  unique (doc_no, username, version)  -- 1 คน รับทราบ 1 เวอร์ชัน ได้ครั้งเดียว
);
create index if not exists idx_ack_doc on acknowledgments(doc_no);

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
create index if not exists idx_logs_target on logs(target);
