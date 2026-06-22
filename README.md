# ระบบทะเบียนเอกสารคุณภาพห้องปฏิบัติการ (TUH Lab QMS)

เว็บแอปจัดการเอกสารคุณภาพห้องปฏิบัติการเทคนิคการแพทย์ โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
สร้างจากดีไซน์ Claude Design แปลงเป็นเว็บแอป **fullstack**: frontend **Vite + React** + backend **Express API** + ฐานข้อมูล + อัปโหลดไฟล์จริง

## สถาปัตยกรรม
- **Frontend** (`src/`) — React (Vite) เรียก backend ผ่าน `/api` (proxy → :3001)
- **Backend** (`server/`) — Express + JWT auth (bcrypt) + อัปโหลดไฟล์ (multer)
- **ฐานข้อมูล** — เริ่มต้นใช้ **lowdb** (ไฟล์ JSON ฝั่งเซิร์ฟเวอร์ `server/data/`) ทำงานได้ทันที; สลับไป **Supabase** ได้โดยกรอกคีย์ใน `.env` (ดูด้านล่าง)
- ไฟล์จริง (Word/PDF) เก็บบนดิสก์เซิร์ฟเวอร์ (`server/data/uploads/`) — ใช้ Supabase Storage เมื่อต่อ Supabase

## การใช้งาน

```bash
npm install      # ติดตั้ง dependencies (ครั้งแรกครั้งเดียว)
npm run dev      # รันทั้ง frontend + backend พร้อมกัน → เปิด http://localhost:5173
npm run build    # build frontend สำหรับขึ้นจริง (ออกที่ dist/)
# แยกรัน: npm run dev:web (เว็บ) / npm run dev:server (API)
```

## ต่อ Supabase (ฐานข้อมูลคลาวด์ฟรี)
1. สมัคร/สร้างโปรเจกต์ที่ https://supabase.com (ฟรี: Postgres ~500MB + Storage ~1GB)
2. **SQL Editor** → วางเนื้อหาไฟล์ [`server/schema.supabase.sql`](server/schema.supabase.sql) → Run (สร้างตาราง + bucket `qms-files`)
3. **Project Settings → API** → คัดลอก `Project URL` และ `service_role key`
4. คัดลอก `.env.example` เป็น `.env` แล้วกรอก `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (คีย์ `sb_secret_…`), `JWT_SECRET`
5. รัน `npm run dev` ใหม่ — backend จะสลับมาใช้ Supabase อัตโนมัติ (ดูบรรทัด log `data store: Supabase …`)

Backend เลือก store เองใน [`server/store.js`](server/store.js): ถ้ามีคีย์ Supabase ใช้ [`store-supabase.js`](server/store-supabase.js) (Postgres + Storage) ไม่งั้นใช้ [`store-lowdb.js`](server/store-lowdb.js)

> ⚠️ `service_role`/`sb_secret` key ใช้เฉพาะฝั่ง backend เท่านั้น ห้ามใส่ใน frontend และห้าม commit `.env`

## Deploy ขึ้นออนไลน์ (Render — ฟรี)
แอปรันเป็น **บริการเดียว**: backend (Express) เสิร์ฟทั้ง API และหน้าเว็บที่ build แล้ว → ใช้โฮสต์ตัวเดียวจบ

ขั้นตอน:
1. นำโค้ดขึ้น GitHub (repo นี้ commit ไว้ให้แล้ว — เหลือ push):
   ```bash
   git remote add origin https://github.com/<ชื่อคุณ>/<ชื่อ-repo>.git
   git branch -M main
   git push -u origin main
   ```
   *(ไม่ถนัด command line ใช้แอป **GitHub Desktop** ลากโฟลเดอร์เข้าไป แล้วกด Publish ก็ได้)*
2. ไปที่ https://render.com → สมัคร/ล็อกอิน (ไม่ต้องใส่บัตร) → **New → Blueprint** → เลือก repo ที่เพิ่ง push
   Render จะอ่าน [`render.yaml`](render.yaml) ตั้งค่า build/start ให้อัตโนมัติ
3. Render จะถามค่า env 2 ตัว — กรอก:
   - `SUPABASE_URL` = `https://eyekndzyolctexjgvcxh.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = secret key (`sb_secret_…`)
   *(`JWT_SECRET` Render สุ่มให้เอง)*
4. กด **Apply / Create** → รอ build เสร็จ → ได้ลิงก์ `https://tuh-lab-qms.onrender.com` เปิดใช้งานได้เลย

> โน้ต: แพลนฟรีจะ "หลับ" เมื่อไม่มีคนใช้ ~15 นาที เปิดครั้งถัดไปจะตื่นช้า ~30–50 วินาที (ครั้งเดียว) — ปกติของฟรีทุกเจ้า

## โฟลว์การทำงาน
**เข้าสู่ระบบ (Login)** → **แดชบอร์ด** → **ทะเบียนเอกสาร** (กรองตามประเภท / หมวดงาน / สถานะ + ค้นหา) → **รายละเอียดเอกสาร** (header เอกสารควบคุม, ไฟล์แนบ PDF/Word/URL, ประวัติการแก้ไข, การดำเนินการ workflow)

> หน้า Login กดปุ่ม "เข้าสู่ระบบ" ได้เลย — เป็นการจำลอง ยังไม่มีระบบยืนยันตัวตนจริง

## โครงสร้างโปรเจกต์
```
index.html              จุดเริ่มต้น HTML
src/
  main.jsx              entry — mount React + โหลด CSS
  App.jsx               orchestrator — สลับหน้าจอ (state machine)
  styles/
    tokens.css          design tokens (สี/ตัวอักษร/ระยะ/เงา) + ฟอนต์
    base.css            reset + animation
  data/taxonomy.js      ประเภทเอกสาร 9 ชนิด, หมวดงาน, สถานะ, ข้อมูลตัวอย่าง
  components/
    Icon.jsx            ตัวห่อ lucide-react (เรียกไอคอนตามชื่อ)
    FileChip.jsx        ป้ายไฟล์แนบ + FILE_META
    ds/                 design system 11 ชิ้น (Button, Card, Input, Tabs, ...)
  hooks/useNarrow.js    helper responsive
  screens/             5 หน้าจอ (Login, AppShell, Dashboard, Register, DocDetail)
public/lab-seal.png    ตราโรงพยาบาล
```

## ระบบผู้ใช้งานและสิทธิ์ (3 ระดับ)
ล็อกอินด้วยชื่อผู้ใช้งาน/รหัสผ่าน (ตรวจสอบกับรายชื่อผู้ใช้ที่เก็บใน `localStorage`)

| ระดับ | ดู/ดาวน์โหลด/พิมพ์ | นำเข้า(ลงทะเบียน)/ลบเอกสาร | แก้ไข workflow | เพิ่ม/ลบผู้ใช้งาน |
|---|:---:|:---:|:---:|:---:|
| **Creator** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ❌ | ✅ |
| **User** | ✅ | ❌ | ❌ | ❌ |

**บัญชีทดลอง:** `creator/creator123` · `admin/admin123` · `user/user123`

> ⚠️ ต้นแบบเท่านั้น — รหัสผ่านเก็บแบบ plaintext ใน `localStorage` ไม่เหมาะกับการใช้งานจริง ระบบจริงต้องยืนยันตัวตน + แฮชรหัสผ่านที่ฝั่งเซิร์ฟเวอร์

## ฟีเจอร์
- **ลงทะเบียนเอกสาร** (Creator/Admin) — ฟอร์มสร้างเอกสารใหม่ เลขที่เอกสารรูปแบบ **ประเภท-เลขเอกสาร(4หลัก)-รหัสเอกสาร(5หลัก)** เช่น `SP-0014-00123` (ตรวจไม่ให้ซ้ำ), เลือกระยะเวลาจัดเก็บ (2/5/10 ปี), รูปแบบไฟล์แนบ
- **จัดการผู้ใช้งาน** (Creator/Admin เท่านั้น) — เพิ่ม/ลบผู้ใช้ กำหนดระดับสิทธิ์ (Admin สร้างได้เฉพาะ Admin/User, ลบตัวเอง/Creator คนสุดท้ายไม่ได้)
- **บันทึกกิจกรรม / Audit log** (Creator/Admin เท่านั้น) — บันทึกว่าใครทำอะไรเมื่อไหร่ (เข้า/ออกระบบ, ลงทะเบียน/ประกาศใช้/แก้ไข/ยกเลิก/ลบเอกสาร, เพิ่ม/ลบผู้ใช้)
- **Workflow ในหน้ารายละเอียด** (Creator) — "ประกาศใช้ / บันทึกแก้ไข (เพิ่มเวอร์ชัน) / ยกเลิกการใช้งาน"
- **ลบเอกสาร** (Creator/Admin) — ลบออกจากทะเบียนพร้อมยืนยัน
- **ดาวน์โหลด / พิมพ์** (ทุกระดับ) — ดาวน์โหลดสรุปเอกสารเป็นไฟล์ และสั่งพิมพ์
- **บันทึกข้อมูลถาวร** — เก็บใน `localStorage`: ทะเบียนเอกสาร (`tuh-qms-docs-v1`), ผู้ใช้งาน (`tuh-qms-users-v1`), บันทึกกิจกรรม (`tuh-qms-log-v1`)

## หมายเหตุ
- ยังเป็นการจำลอง — ไม่มีการเชื่อมต่อฐานข้อมูลฝั่งเซิร์ฟเวอร์, ยืนยันตัวตน, หรืออัปโหลดไฟล์จริง (ข้อมูลเก็บเฉพาะในเบราว์เซอร์เครื่องนั้น)
- ชื่อผู้รับผิดชอบและเลขเอกสารเป็นข้อมูลตัวอย่าง
- ฟอนต์ (Anuphan / Sarabun / IBM Plex Mono) โหลดจาก Google Fonts — ต้องต่ออินเทอร์เน็ตตอนรัน หากต้องการใช้ออฟไลน์ให้ self-host ฟอนต์เอง
