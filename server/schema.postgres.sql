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
  created_at    timestamptz not null default now()
);

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
