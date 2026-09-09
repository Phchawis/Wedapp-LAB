#!/bin/bash
# ════════════════════════════════════════════════════════════════
# TUH Lab QMS — สำรองข้อมูลรายวัน (ฐานข้อมูล + ไฟล์แนบ)
#
# cron:  15 0 * * * /opt/labqms/backup.sh >> /var/log/labqms-backup.log 2>&1
#
# แนวคิด (เปลี่ยนจากเดิมเมื่อ ก.ย. 2569):
#
#   เดิมทำสำเนา "ทั้งก้อน" ทุกคืนแล้วเก็บ 30 ชุด ซึ่งคัดลอกไฟล์เดิมซ้ำ 30 รอบ
#   โดยไม่ได้ประโยชน์ — ไฟล์แนบ 340MB กลายเป็น 10GB บน Drive ภายในเดือนเดียว
#   และเกินเพดาน Apps Script จนไม่เคยขึ้นไปถึง Drive เลย
#
#   ตอนนี้แยกตามธรรมชาติของข้อมูล:
#     ฐานข้อมูล  เล็กมาก (50KB) → เก็บหลายจุดแบบปู่-พ่อ-ลูก ย้อนได้ 5 ปี
#     ไฟล์แนบ   ใหญ่แต่แทบไม่เปลี่ยน → sync เฉพาะที่ต่าง ไม่คัดลอกซ้ำ
#                ไฟล์ที่ถูกลบ/แก้ ย้ายไปเก็บในโฟลเดอร์ลงวันที่ ไม่ทิ้งหาย
#
#   ผลคือใช้พื้นที่ ~1GB แทน 23GB และได้ประวัติยาวกว่าเดิม
#
# แยกไฟล์จาก backup.sh ของ Masterlist โดยตั้งใจ — ถ้าอันใดอันหนึ่งพัง อีกอันยังทำงาน
# ════════════════════════════════════════════════════════════════
set -uo pipefail

APP="labqms"
BACKUP_DIR="/var/backups/${APP}"
DB_CONTAINER="masterlist-db-1"          # Postgres ที่ใช้ร่วมกัน (คนละ database)
DB_USER="labqms"
DB_NAME="labqms"
UPLOADS_VOLUME="/var/lib/docker/volumes/labqms_labqms_uploads/_data"

REMOTE="gdrive:TUH-Backup/${APP}"
TODAY=$(date +%F)
STAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="${BACKUP_DIR}/${APP}_db_${STAMP}.sql"

log() { echo "[$(date +'%F %T')] $*"; }
FAILURES=()
fail() { FAILURES+=("$1"); log "❌ $1"; }

mkdir -p "$BACKUP_DIR"

# ── 1) ฐานข้อมูล ────────────────────────────────────────────────
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$DB_FILE" 2>/dev/null && [ -s "$DB_FILE" ]; then
  gzip -f "$DB_FILE"
  log "✅ สำรองฐานข้อมูลแล้ว ($(numfmt --to=iec "$(stat -c%s "${DB_FILE}.gz")"))"
  DB_OK=1
else
  rm -f "$DB_FILE"
  fail "สำรองฐานข้อมูลไม่สำเร็จ"
  DB_OK=0
fi

# ── 2) ตรวจว่าต่อ Google Drive ได้ก่อนค่อยทำงานต่อ ──────────────
if command -v rclone >/dev/null 2>&1 && rclone about gdrive: >/dev/null 2>&1; then
  DRIVE_OK=1
else
  DRIVE_OK=0
  fail "ต่อ Google Drive ไม่ได้ — สั่ง rclone config reconnect gdrive: เพื่อเชื่อมใหม่"
fi

# ── 3) ส่งฐานข้อมูลขึ้น Drive แบบปู่-พ่อ-ลูก ────────────────────
#     รายวัน เก็บ 30 วัน · รายสัปดาห์ (จันทร์) 12 สัปดาห์ · รายเดือน (วันที่ 1) 60 เดือน
#     ไฟล์เล็กมากจึงเก็บได้ยาวโดยแทบไม่กินพื้นที่ และตรงกับระยะจัดเก็บ 5 ปีที่ประกาศไว้
if [ "$DB_OK" = 1 ] && [ "$DRIVE_OK" = 1 ]; then
  if rclone copy "${DB_FILE}.gz" "${REMOTE}/db/daily/" --timeout 10m 2>/dev/null; then
    log "☁️  ฐานข้อมูล → Drive (รายวัน)"
    [ "$(date +%u)" = "1" ] && rclone copy "${DB_FILE}.gz" "${REMOTE}/db/weekly/" --timeout 10m 2>/dev/null && log "☁️  สำเนารายสัปดาห์"
    [ "$(date +%d)" = "01" ] && rclone copy "${DB_FILE}.gz" "${REMOTE}/db/monthly/" --timeout 10m 2>/dev/null && log "☁️  สำเนารายเดือน"

    rclone delete "${REMOTE}/db/daily/"   --min-age 30d  2>/dev/null
    rclone delete "${REMOTE}/db/weekly/"  --min-age 90d  2>/dev/null
    rclone delete "${REMOTE}/db/monthly/" --min-age 1825d 2>/dev/null
  else
    fail "อัปโหลดฐานข้อมูลขึ้น Drive ไม่สำเร็จ"
  fi
fi

# ── 4) ไฟล์แนบ — sync ไม่ใช่คัดลอกทั้งก้อน ─────────────────────
#     --backup-dir ทำให้ไฟล์ที่ถูกลบหรือแก้ ถูกย้ายไปเก็บในโฟลเดอร์ลงวันที่
#     แทนที่จะหายไปเลย — กันกรณีมีคนลบเอกสารผิดแล้วรู้ตัวทีหลัง
if [ "$DRIVE_OK" = 1 ]; then
  n=$(find "$UPLOADS_VOLUME" -type f 2>/dev/null | wc -l)
  # กันพลาดชั้นที่ 1: sync จะลบของปลายทางให้เหมือนต้นทาง
  # ถ้าวันไหน volume หลุด/ย้าย แล้วต้นทางกลายเป็นว่าง สำเนาบน Drive จะถูกลบเกลี้ยง
  # จึงไม่ยอม sync เมื่อต้นทางว่าง — ถือว่าผิดปกติเสมอ ระบบนี้ไม่มีทางมี 0 ไฟล์
  if [ ! -d "$UPLOADS_VOLUME" ] || [ "$n" -eq 0 ]; then
    fail "ต้นทางไฟล์แนบผิดปกติ ($n ไฟล์) — ไม่ซิงก์ เพื่อไม่ให้สำเนาบน Drive ถูกลบตาม"
  else
    # กันพลาดชั้นที่ 2: ถ้ารอบไหนจะลบเกิน 20 ไฟล์ ให้หยุดแล้วแจ้งเตือนแทน
    # ลบทีละไม่กี่ไฟล์เป็นเรื่องปกติ แต่ลบทีเป็นสิบแปลว่ามีอะไรผิด
    if rclone sync "$UPLOADS_VOLUME" "${REMOTE}/files/" \
         --backup-dir "${REMOTE}/files-replaced/${TODAY}" \
         --max-delete 20 \
         --transfers 4 --checkers 8 --timeout 30m 2>/dev/null; then
      log "☁️  ไฟล์แนบ → Drive แล้ว ($n ไฟล์ · ส่งเฉพาะที่เปลี่ยน)"
    else
      fail "ซิงก์ไฟล์แนบไม่สำเร็จ (อาจเพราะจะต้องลบไฟล์เกิน 20 รายการ — ตรวจสอบก่อน)"
    fi
  fi
fi

# ── 5) เก็บกวาดสำเนาบนเครื่อง ──────────────────────────────────
#     ลบเฉพาะเมื่อรอบนี้สำเร็จ — ถ้าสำรองพลาดแล้วยังลบของเก่า จะไม่เหลืออะไรเลย
if [ ${#FAILURES[@]} -eq 0 ]; then
  find "$BACKUP_DIR" -type f -name "${APP}_*" -mtime +30 -delete
  # ไฟล์ tar จากวิธีเดิมไม่ได้ใช้แล้ว ลบทิ้งเพื่อคืนพื้นที่
  find "$BACKUP_DIR" -type f -name "*_files_*.tar.gz" -mtime +7 -delete
  log "🧹 ลบสำเนาเก่าเกิน 30 วันบนเครื่องแล้ว"
else
  log "⏸  ข้ามการลบสำเนาเก่า เพราะรอบนี้มีข้อผิดพลาด"
fi

# ── 6) แจ้งเตือนเมื่อล้มเหลว ───────────────────────────────────
#     ที่ผ่านมา backup พังเงียบ 36 วันโดยไม่มีใครรู้ เพราะ cron ไม่บอกใคร
#     ส่งอีเมลผ่านตัวส่งเดียวกับที่ระบบใช้อยู่แล้ว (ไม่ต้องตั้งค่าเพิ่ม)
if [ ${#FAILURES[@]} -gt 0 ]; then
  BODY="ระบบสำรองข้อมูล Lab QMS ทำงานไม่สำเร็จ $(date +'%F %T')%0A%0A"
  for f in "${FAILURES[@]}"; do BODY="${BODY}- ${f}%0A"; done
  docker exec -e ALERT_TO="ahs.tuh.register@gmail.com" -e ALERT_BODY="$BODY" labqms-app node -e '
    const n = require("nodemailer");
    if (!process.env.SMTP_HOST) process.exit(0);
    n.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT,secure:false,
      auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})
     .sendMail({from:process.env.SMTP_FROM,to:process.env.ALERT_TO,
       subject:"⚠️ สำรองข้อมูล Lab QMS ล้มเหลว",
       text:decodeURIComponent(process.env.ALERT_BODY.replace(/%0A/g,"\n"))})
     .then(()=>console.log("ส่งอีเมลแจ้งเตือนแล้ว")).catch(e=>console.error("แจ้งเตือนไม่ได้:",e.message));
  ' 2>&1 | sed 's/^/    /'
  log "── เสร็จสิ้น · มีข้อผิดพลาด ${#FAILURES[@]} รายการ ──"
  exit 1
fi

log "── เสร็จสิ้น · ปกติทุกอย่าง ──"
