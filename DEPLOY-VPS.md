# ย้าย TUH Lab QMS จาก Render + Supabase → VPS เดียวกับ Masterlist

คู่มือนี้พาทำทีละขั้น **คัดลอกคำสั่งไปวางได้เลย** ทุกคำสั่งรันบน VPS ผ่าน SSH
(ยกเว้นขั้นที่ระบุว่าทำบนเครื่องตัวเอง)

> **ระบบ Masterlist จะไม่ได้รับผลกระทบ** — เราสร้าง database ใหม่แยกในเครื่อง Postgres เดิม
> ไม่แตะ container / volume / ข้อมูลของ Masterlist เลย

---

## ✅ ก่อนเริ่ม — เตรียม 2 อย่าง

1. **โดเมนใหม่** — เข้า [duckdns.org](https://www.duckdns.org) สร้างชื่อใหม่ (เช่น `tuhlabqms`)
   ชี้ไปที่ IP ของ VPS: `188.166.181.243`
2. **ไฟล์ข้อมูลสำรอง** — โฟลเดอร์ `tuh-lab-qms-backup-2026-07-30` บนเครื่องคุณ

---

## ขั้นที่ 1 — อัปโหลดโค้ดขึ้น VPS

รัน **บนเครื่องตัวเอง** (Terminal):

```bash
rsync -av --exclude node_modules --exclude dist --exclude .git --exclude server/data \
  "/Users/gpharkchawisp/Documents/Wedapp ระบบจัดการเอกสาร LAB/" \
  root@188.166.181.243:/opt/labqms/
```

อัปโหลดไฟล์ข้อมูลสำรองด้วย:

```bash
rsync -av "/Users/gpharkchawisp/Documents/tuh-lab-qms-backup-2026-07-30/" \
  root@188.166.181.243:/opt/labqms-backup/
```

---

## ขั้นที่ 2 — สร้าง database ใหม่ (ไม่กระทบ Masterlist)

SSH เข้า VPS แล้วหาชื่อ container ของ Postgres ก่อน:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}" | grep -i postgres
```

สมมติชื่อ `masterlist-db-1` (ถ้าไม่ใช่ ให้เปลี่ยนในคำสั่งถัดไป) — สร้าง user + database ใหม่:

```bash
docker exec -it masterlist-db-1 psql -U masterlist -d postgres
```

ในหน้าต่าง psql พิมพ์ (⚠️ เปลี่ยน `รหัสผ่านที่ตั้งเอง` เป็นรหัสจริง):

```sql
CREATE USER labqms WITH PASSWORD 'รหัสผ่านที่ตั้งเอง';
CREATE DATABASE labqms OWNER labqms;
\q
```

สร้างตาราง:

```bash
docker exec -i masterlist-db-1 psql -U labqms -d labqms < /opt/labqms/server/schema.postgres.sql
```

---

## ขั้นที่ 3 — ตั้งค่า .env

```bash
cd /opt/labqms
cp .env.vps.example .env
```

หาชื่อเครือข่าย docker ของ Masterlist:

```bash
docker network ls | grep -iE "masterlist|webapp"
```

ดูค่า `SSO_SHARED_SECRET` เดิมของ Masterlist (ต้องใช้ค่าเดียวกัน):

```bash
grep SSO_SHARED_SECRET /opt/masterlist/.env
```

สร้าง JWT secret ใหม่:

```bash
openssl rand -base64 32
```

แล้วแก้ไฟล์ `.env` (`nano /opt/labqms/.env`) ให้ครบทั้ง 4 ค่า:

| ตัวแปร | ใส่อะไร |
|--------|---------|
| `DATABASE_URL` | `postgres://labqms:รหัสผ่านที่ตั้งเอง@db:5432/labqms` |
| `JWT_SECRET` | ค่าที่ได้จาก `openssl rand -base64 32` |
| `SSO_SHARED_SECRET` | ค่าเดียวกับของ Masterlist |
| `MASTERLIST_NETWORK` | ชื่อเครือข่ายที่หาได้ |

> ถ้าชื่อ service ของ Postgres ใน compose ของ Masterlist ไม่ใช่ `db`
> ให้แก้ host ใน `DATABASE_URL` ให้ตรง

---

## ขั้นที่ 4 — รันแอป

```bash
cd /opt/labqms
docker compose -f docker-compose.vps.yml up -d --build
```

ดูว่าขึ้นปกติไหม:

```bash
docker logs labqms-app --tail 20
```

ควรเห็น: `TUH QMS API on :3001 · data store: PostgreSQL (ไฟล์บนดิสก์)`

---

## ขั้นที่ 5 — นำเข้าข้อมูลเดิม

```bash
cd /opt/labqms
docker compose -f docker-compose.vps.yml run --rm --user root \
  -v /opt/labqms-backup:/backup:ro \
  -e IMPORT_DIR=/backup \
  qms sh -c "node server/import-from-export.js && chown -R 1001:1001 /app/uploads"
```

ควรเห็นสรุป: ผู้ใช้ 4 · เอกสาร 2 · ไฟล์แนบ 2 · บันทึกกิจกรรม 298

> สคริปต์นี้รันซ้ำได้ปลอดภัย — ของที่มีอยู่แล้วจะไม่ถูกเขียนทับ

---

## ขั้นที่ 6 — ตั้งค่า HTTPS (Caddy)

แก้ Caddyfile ของ Masterlist:

```bash
nano /opt/masterlist/Caddyfile
```

**เพิ่มต่อท้าย** (อย่าลบของเดิม) — เปลี่ยน `tuhlabqms.duckdns.org` เป็นโดเมนคุณ:

```
tuhlabqms.duckdns.org {
	reverse_proxy labqms-app:3001
	encode gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
	}
}
```

โหลด Caddy ใหม่ (ไม่ทำให้ Masterlist ดับ):

```bash
docker exec $(docker ps -qf "ancestor=caddy:2-alpine") caddy reload --config /etc/caddy/Caddyfile
```

รอสักครู่ให้ออกใบรับรอง HTTPS แล้วเปิดเว็บทดสอบ:

```bash
curl -I https://tuhlabqms.duckdns.org
```

---

## ขั้นที่ 7 — เพิ่มเข้าระบบสำรองข้อมูลรายวัน

แก้สคริปต์ backup เดิม:

```bash
nano /opt/masterlist/backup.sh
```

**เพิ่มต่อท้าย** (ก่อนบรรทัดอัปโหลดขึ้น Google Drive ถ้ามี):

```bash
# ── TUH Lab QMS ──
docker exec masterlist-db-1 pg_dump -U labqms labqms | gzip \
  > /var/backups/masterlist/labqms_db_$(date +%Y%m%d_%H%M%S).sql.gz

docker run --rm -v labqms_labqms_uploads:/data:ro -v /var/backups/masterlist:/backup alpine \
  tar czf /backup/labqms_files_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

> ตรวจชื่อ volume จริงด้วย `docker volume ls | grep labqms` แล้วแก้ให้ตรง

ทดสอบ:

```bash
bash /opt/masterlist/backup.sh && ls -lh /var/backups/masterlist | tail -5
```

---

## ขั้นที่ 8 — ให้ Masterlist ชี้มาที่ระบบใหม่ (ลิงก์ SSO)

ระบบ Masterlist มีปุ่มพาไป "งานเทคนิคการแพทย์" ซึ่งยังชี้ไป Render อยู่ — ต้องเปลี่ยนเป็นโดเมนใหม่

```bash
nano /opt/masterlist/.env
```

เพิ่มบรรทัดนี้ (เปลี่ยนเป็นโดเมนคุณ):

```
NEXT_PUBLIC_MEDTECH_URL=https://tuhlabqms.duckdns.org
```

ค่านี้ถูกฝังตอน build จึงต้อง **build ใหม่**:

```bash
cd /opt/masterlist
docker compose up -d --build app
```

ทดสอบ: เข้า Masterlist → กด "งานห้องปฏิบัติการเทคนิคการแพทย์"
ต้องเด้งไปโดเมนใหม่และ **เข้าสู่ระบบอัตโนมัติ** (ถ้าไม่ auto-login ให้ตรวจว่า `SSO_SHARED_SECRET` สองระบบตรงกัน)

---

## ขั้นที่ 9 — ปิด Render (ทำหลังใช้งานจริงได้ 2–3 วัน)

1. เข้า [dashboard.render.com](https://dashboard.render.com) → บริการ `tuh-lab-qms` → **Suspend**
2. อย่าเพิ่งลบ — เผื่อต้องย้อนกลับ
3. เมื่อมั่นใจแล้วค่อยลบทั้ง Render และโปรเจกต์ Supabase

---

## 🔄 ถ้าต้องย้อนกลับ (rollback)

ระบบเดิมบน Render + Supabase ยังอยู่ครบ ไม่ได้ถูกแตะเลย — แค่เปิด Render กลับมาก็ใช้งานได้ทันที

---

## 🩺 แก้ปัญหาเบื้องต้น

| อาการ | ตรวจอะไร |
|------|----------|
| `labqms-app` ไม่ขึ้น | `docker logs labqms-app --tail 50` |
| ต่อฐานข้อมูลไม่ได้ | ชื่อ host ใน `DATABASE_URL` ตรงกับ service ของ Postgres ไหม · เครือข่ายถูกไหม |
| เว็บเปิดไม่ได้ (HTTPS) | โดเมน DuckDNS ชี้ IP ถูกไหม · `docker logs` ของ Caddy |
| SSO จาก Masterlist ไม่ทำงาน | `SSO_SHARED_SECRET` สองระบบตรงกันเป๊ะไหม |
| ไฟล์แนบเปิดไม่ได้ | `docker exec labqms-app ls -la /app/uploads` |
