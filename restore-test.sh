#!/bin/bash
# ════════════════════════════════════════════════════════════════
# ทดสอบกู้คืน — Masterlist + Lab QMS
#
# cron:  30 3 1 * *  /opt/labqms/restore-test.sh >> /var/log/restore-test.log 2>&1
#
# ทำไมต้องมี: backup ที่ไม่เคยลองกู้ ไม่นับว่าเป็น backup
# เดือน ส.ค.–ก.ย. 2569 ระบบสำรองพังเงียบ 36 วันโดยไม่มีใครรู้ เพราะไม่เคยมีใครตรวจ
# สคริปต์นี้ตรวจให้เองทุกเดือน แล้วส่งอีเมลเมื่อมีปัญหา
#
# ตรวจ 3 ชั้น — แต่ละชั้นตอบคำถามคนละข้อ:
#   1. ไฟล์สำรองบนเครื่อง กู้กลับเป็นฐานข้อมูลที่ใช้งานได้จริงไหม
#   2. จำนวนข้อมูลที่กู้มา ตรงกับของจริงไหม (กู้ได้แต่ข้อมูลหายไปครึ่งก็ไม่มีประโยชน์)
#   3. สำเนาบน Google Drive ดึงกลับมาได้จริงไหม — ข้อนี้สำคัญที่สุด
#      เพราะกรณีฉุกเฉินจริง (เครื่องพัง/ถูกยึด) จะเหลือแค่สำเนาบน Drive เท่านั้น
#
# ทดสอบบนฐานข้อมูลชั่วคราวเสมอ ไม่แตะฐานข้อมูลที่ใช้งานจริง
# ════════════════════════════════════════════════════════════════
set -uo pipefail

DB_CONTAINER="masterlist-db-1"
PROBLEMS=()

hdr() { echo; echo "════════════════════════════════════════════════════════════"; echo " $*"; echo "════════════════════════════════════════════════════════════"; }
bad() { PROBLEMS+=("$1"); echo "  ❌ $1"; }

psql_admin() { docker exec "$DB_CONTAINER" psql -U masterlist -d postgres -q "$@"; }

# นับแถวทีละตารางแล้วต่อกันในเชลล์
# (เดิมต่อสตริงใน SQL ด้วย "/" ซึ่ง Postgres ตีความเป็นชื่อคอลัมน์ ทำให้คิวรีพังเงียบ
#  แล้วรายงานว่า "กู้คืนไม่สำเร็จ" ทั้งที่ไฟล์สำรองใช้ได้ปกติ — เจอตอนทดสอบจริง)
counts() {   # $1=user  $2=database  $3=รายชื่อตารางคั่นด้วยช่องว่าง
  local out="" t n
  for t in $3; do
    n=$(docker exec "$DB_CONTAINER" psql -U "$1" -d "$2" -Atc "select count(*) from $t" 2>/dev/null)
    [ -z "$n" ] && { echo ""; return; }
    out="${out}${out:+/}${n}"
  done
  echo "$out"
}

test_app() {  # $1=ชื่อระบบ  $2=dbuser  $3=dbname  $4=backup dir  $5=pattern  $6=ตารางที่นับ  $7=remote
  local app="$1" user="$2" db="$3" dir="$4" pat="$5" sql="$6" remote="$7"
  local test_db="${db}_restoretest"

  hdr "ทดสอบกู้คืน: $app · $(date +'%F %T')"

  local latest
  latest=$(ls -t "$dir"/$pat 2>/dev/null | head -1)
  if [ -z "$latest" ]; then bad "$app — ไม่พบไฟล์สำรองใน $dir"; return; fi

  echo "  ไฟล์ที่ทดสอบ : $(basename "$latest")"
  echo "  ขนาด        : $(numfmt --to=iec "$(stat -c%s "$latest")")"
  echo "  สร้างเมื่อ    : $(date -r "$latest" +'%F %T')"

  # เตือนถ้าไฟล์เก่าเกิน 2 วัน — แปลว่า cron ไม่ได้ทำงาน
  local age=$(( ( $(date +%s) - $(date -r "$latest" +%s) ) / 86400 ))
  [ "$age" -gt 2 ] && bad "$app — ไฟล์สำรองล่าสุดเก่า $age วัน (ควรไม่เกิน 1 วัน)"

  # ── ชั้นที่ 1+2: กู้ลงฐานข้อมูลชั่วคราวแล้วเทียบจำนวนแถว ──
  local src dst
  src=$(counts "$user" "$db" "$sql")
  psql_admin -c "DROP DATABASE IF EXISTS $test_db;" >/dev/null 2>&1
  psql_admin -c "CREATE DATABASE $test_db OWNER $user;" >/dev/null 2>&1
  gunzip -c "$latest" | docker exec -i "$DB_CONTAINER" psql -q -U "$user" -d "$test_db" >/dev/null 2>&1
  dst=$(counts "$user" "$test_db" "$sql")
  psql_admin -c "DROP DATABASE IF EXISTS $test_db;" >/dev/null 2>&1

  if [ -z "$dst" ]; then
    bad "$app — กู้คืนฐานข้อมูลไม่สำเร็จ (ไฟล์อาจเสียหาย)"
  elif [ "$src" = "$dst" ]; then
    echo "  ✅ กู้คืนได้ครบถ้วน — ข้อมูลตรงกับของจริง ($src)"
  else
    bad "$app — กู้คืนได้แต่ข้อมูลไม่ตรง (ของจริง $src · ที่กู้มา $dst)"
  fi

  # ── ชั้นที่ 3: สำเนาบน Drive ดึงกลับได้จริงไหม ──
  if ! rclone about gdrive: >/dev/null 2>&1; then
    bad "$app — ต่อ Google Drive ไม่ได้ (สั่ง rclone config reconnect gdrive:)"
    return
  fi

  local n_remote n_local
  n_remote=$(rclone lsf "${remote}/files/" 2>/dev/null | wc -l)
  echo "  ไฟล์แนบบน Drive : $n_remote"
  [ "$n_remote" -eq 0 ] && bad "$app — ไม่มีไฟล์แนบบน Drive เลย"

  # ดึงไฟล์จริงกลับมาหนึ่งไฟล์แล้วเทียบขนาด — พิสูจน์ว่าดึงคืนได้จริง ไม่ใช่แค่มีชื่ออยู่
  local sample tmp
  sample=$(rclone lsf "${remote}/db/daily/" 2>/dev/null | tail -1)
  if [ -n "$sample" ]; then
    tmp=$(mktemp -d)
    if rclone copy "${remote}/db/daily/${sample}" "$tmp/" --timeout 5m 2>/dev/null && [ -s "$tmp/$sample" ]; then
      if gunzip -t "$tmp/$sample" 2>/dev/null; then
        echo "  ✅ ดึงไฟล์จาก Drive กลับมาได้และไฟล์ไม่เสียหาย ($sample)"
      else
        bad "$app — ไฟล์บน Drive ดึงกลับมาได้แต่เสียหาย"
      fi
    else
      bad "$app — ดึงไฟล์จาก Drive กลับมาไม่ได้"
    fi
    rm -rf "$tmp"
  else
    bad "$app — ไม่มีสำเนาฐานข้อมูลบน Drive"
  fi
}

test_app "ทะเบียนเอกสารคุณภาพ (Masterlist)" masterlist masterlist \
  /var/backups/masterlist 'masterlist_db_*.sql.gz' \
  '"Document" "User" "Attachment" "KpiIndicator"' \
  gdrive:TUH-Backup/masterlist

test_app "ห้องปฏิบัติการเทคนิคการแพทย์ (Lab QMS)" labqms labqms \
  /var/backups/labqms 'labqms_db_*.sql.gz' \
  'documents app_users attachments acknowledgments' \
  gdrive:TUH-Backup/labqms

# ── เก็บผลทดสอบเป็นบันทึกบน Drive ──
#    log บนเครื่องอย่างเดียวไม่พอ เพราะกรณีที่ต้องใช้จริงคือ "เครื่องพัง"
#    ผู้ตรวจขอดูหลักฐานว่าทดสอบกู้คืนสม่ำเสมอ — ต้องหยิบมาได้แม้เครื่องไม่อยู่แล้ว
save_evidence() {
  local f="/tmp/restore-test-$(date +%Y%m).txt"
  { echo "ผลทดสอบกู้คืนข้อมูล · $(date +'%F %T')"
    echo "ระบบ: ทะเบียนเอกสารคุณภาพ (Masterlist) + ห้องปฏิบัติการเทคนิคการแพทย์ (Lab QMS)"
    echo
    if [ ${#PROBLEMS[@]} -eq 0 ]; then
      echo "ผลการทดสอบ: ผ่านทั้งหมด"
      echo "- กู้คืนฐานข้อมูลได้ครบถ้วน ข้อมูลตรงกับของจริง"
      echo "- ดึงไฟล์สำรองจาก Google Drive กลับมาได้และไฟล์ไม่เสียหาย"
    else
      echo "ผลการทดสอบ: พบปัญหา ${#PROBLEMS[@]} รายการ"
      for p in "${PROBLEMS[@]}"; do echo "- $p"; done
    fi
    echo
    echo "ทดสอบโดยระบบอัตโนมัติ · /opt/labqms/restore-test.sh"
  } > "$f"
  rclone copy "$f" gdrive:TUH-Backup/restore-tests/ --timeout 5m 2>/dev/null \
    && echo "  📄 เก็บผลทดสอบขึ้น Drive แล้ว ($(basename "$f"))" \
    || echo "  ⚠️  เก็บผลทดสอบขึ้น Drive ไม่สำเร็จ"
  rm -f "$f"
  # เก็บผลย้อนหลัง 5 ปี ให้ตรงกับระยะจัดเก็บที่ประกาศไว้ในทะเบียนเอกสาร
  rclone delete gdrive:TUH-Backup/restore-tests/ --min-age 1825d 2>/dev/null
}
save_evidence

hdr "สรุปผล"
if [ ${#PROBLEMS[@]} -eq 0 ]; then
  echo "  ✅ ทุกระบบกู้คืนได้ครบถ้วน และสำเนาบน Google Drive ใช้งานได้จริง"
  echo
  exit 0
fi

echo "  พบปัญหา ${#PROBLEMS[@]} รายการ:"
for p in "${PROBLEMS[@]}"; do echo "    · $p"; done
echo

BODY="ผลทดสอบกู้คืนข้อมูลประจำเดือน $(date +'%F %T')%0A%0Aพบปัญหา ${#PROBLEMS[@]} รายการ:%0A"
for p in "${PROBLEMS[@]}"; do BODY="${BODY}- ${p}%0A"; done
BODY="${BODY}%0Aกรุณาตรวจสอบก่อนที่จะต้องใช้สำรองจริง"
docker exec -e ALERT_TO="ahs.tuh.register@gmail.com" -e ALERT_BODY="$BODY" labqms-app node -e '
  const n = require("nodemailer");
  if (!process.env.SMTP_HOST) process.exit(0);
  n.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT,secure:false,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})
   .sendMail({from:process.env.SMTP_FROM,to:process.env.ALERT_TO,
     subject:"⚠️ ทดสอบกู้คืนข้อมูลพบปัญหา",
     text:decodeURIComponent(process.env.ALERT_BODY.replace(/%0A/g,"\n"))})
   .then(()=>console.log("  ส่งอีเมลแจ้งเตือนแล้ว")).catch(e=>console.error("  แจ้งเตือนไม่ได้:",e.message));
' 2>&1
exit 1
