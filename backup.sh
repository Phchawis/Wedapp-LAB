#!/bin/bash
# ════════════════════════════════════════════════════════════════
# TUH Lab QMS — สำรองข้อมูลรายวัน (ฐานข้อมูล + ไฟล์แนบ)
#
# เก็บไว้บน VPS 30 วัน และอัปโหลดขึ้น Google Drive ชุดเดียวกับ Masterlist
# ติดตั้งเป็น cron:  15 0 * * * /opt/labqms/backup.sh >> /var/log/labqms-backup.log 2>&1
#
# แยกไฟล์จาก backup.sh ของ Masterlist โดยตั้งใจ — ถ้าอันใดอันหนึ่งพัง อีกอันยังทำงาน
# ════════════════════════════════════════════════════════════════
set -uo pipefail

BACKUP_DIR="/var/backups/labqms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="${BACKUP_DIR}/labqms_db_${TIMESTAMP}.sql"
FILES_FILE="${BACKUP_DIR}/labqms_files_${TIMESTAMP}.tar.gz"

DB_CONTAINER="masterlist-db-1"          # Postgres ที่ใช้ร่วมกัน (คนละ database)
DB_USER="labqms"
DB_NAME="labqms"
UPLOADS_VOLUME="/var/lib/docker/volumes/labqms_labqms_uploads/_data"

# ปลายทาง Google Drive (ชุดเดียวกับ Masterlist)
WEBAPP_URL="https://script.google.com/macros/s/AKfycbw2bff6uuXa7v9iNff4vbRlL2R3GY14Rn1swrcLrom7xK1gAHKyLlGw7HGor8vPn_Rf/exec"
TOKEN="masterlist_backup_token_2026_xYz987"
JSON_FILE="/tmp/labqms_backup_payload.json"

# Apps Script รับ payload ได้ ~50MB และ base64 ทำให้ไฟล์ใหญ่ขึ้น ~33%
# จึงกำหนดเพดานไฟล์ต้นทางไว้ 35MB (≈47MB หลัง base64) เผื่อขอบไว้เล็กน้อย
# ทดสอบแล้วไฟล์ 20MB อัปโหลดผ่านจริง
# ⚠️ เมื่อไฟล์แนบเยอะขึ้น (หลักร้อย–พันเอกสาร) จะเกินเพดานนี้แน่นอน
#    ถึงตอนนั้นต้องเปลี่ยนไปใช้ rclone ไปยัง Google Drive/S3 แทนการยัด base64
MAX_UPLOAD_BYTES=$((35 * 1024 * 1024))

log() { echo "[$(date +'%F %T')] $*"; }

mkdir -p "$BACKUP_DIR"

# ── อัปโหลดขึ้น Google Drive (ข้ามถ้าไฟล์ใหญ่เกิน) ──
upload() {
  local path="$1" name="$2" size
  size=$(stat -c%s "$path" 2>/dev/null || echo 0)
  if [ "$size" -gt "$MAX_UPLOAD_BYTES" ]; then
    log "⚠️  ข้ามการอัปโหลด $name ($(numfmt --to=iec "$size")) — ใหญ่เกินขีดจำกัด เก็บไว้บน VPS เท่านั้น"
    log "    (ควรเปลี่ยนไปใช้ rclone/rsync ไปที่เก็บภายนอกเมื่อไฟล์แนบเยอะขึ้น)"
    return 0
  fi
  printf '{"token":"%s","filename":"%s","file":"%s"}' \
    "$TOKEN" "$name" "$(base64 -w 0 "$path")" > "$JSON_FILE"
  if curl -L -sS --max-time 300 -H "Content-Type: application/json" -d @"$JSON_FILE" "$WEBAPP_URL" >/dev/null; then
    log "✅ อัปโหลด $name ($(numfmt --to=iec "$size")) ขึ้น Google Drive แล้ว"
  else
    log "❌ อัปโหลด $name ไม่สำเร็จ — ไฟล์ยังอยู่บน VPS"
  fi
  rm -f "$JSON_FILE"
}

# ── 1) ฐานข้อมูล ──
DB_OK=0
FILES_OK=0
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" --clean --if-exists "$DB_NAME" > "$DB_FILE" 2>/dev/null; then
  gzip -f "$DB_FILE"
  log "✅ สำรองฐานข้อมูลแล้ว ($(numfmt --to=iec "$(stat -c%s "${DB_FILE}.gz")"))"
  DB_OK=1
  upload "${DB_FILE}.gz" "labqms_db_${TIMESTAMP}.sql.gz"
else
  log "❌ สำรองฐานข้อมูลไม่สำเร็จ"
  rm -f "$DB_FILE"
fi

# ── 2) ไฟล์แนบ ──
if [ -d "$UPLOADS_VOLUME" ]; then
  if tar -czf "$FILES_FILE" -C "$UPLOADS_VOLUME" . 2>/dev/null; then
    log "✅ สำรองไฟล์แนบแล้ว ($(numfmt --to=iec "$(stat -c%s "$FILES_FILE")") · $(find "$UPLOADS_VOLUME" -type f | wc -l) ไฟล์)"
    FILES_OK=1
    upload "$FILES_FILE" "labqms_files_${TIMESTAMP}.tar.gz"
  else
    log "❌ สำรองไฟล์แนบไม่สำเร็จ"
  fi
else
  log "❌ ไม่พบที่เก็บไฟล์แนบ: $UPLOADS_VOLUME"
fi

# ── 3) ลบไฟล์เก่าเกิน 30 วัน — เฉพาะเมื่อสำรองวันนี้สำเร็จทั้งคู่ ──
# (กันกรณีสำรองพังเงียบ ๆ แล้วไฟล์เก่าถูกลบจนไม่เหลือ backup เลย)
if [ "$DB_OK" = 1 ] && [ "$FILES_OK" = 1 ]; then
  find "$BACKUP_DIR" -type f -name "labqms_*" -mtime +30 -delete
  log "── เสร็จสิ้น (ลบ backup เก่าเกิน 30 วันแล้ว) ──"
else
  log "⚠️ สำรองวันนี้ไม่ครบ — ข้ามการลบ backup เก่า เพื่อความปลอดภัย"
fi
