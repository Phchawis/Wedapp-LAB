#!/bin/bash
# สร้าง PDF จาก sop-print.html ด้วย Chrome + paged.js
#
# ทำสองรอบเพราะ counter(pages) ของ paged.js คืนค่า 0 เมื่อหัวกระดาษเป็นธาตุจริง
# รอบแรกนับจำนวนหน้า รอบสองแทนตัวเลขจริงลงไป — ตัวเลขอยู่ในขอบกระดาษ
# จึงไม่ทำให้เนื้อหาไหลใหม่ จำนวนหน้าสองรอบเท่ากันเสมอ
set -euo pipefail
cd "$(dirname "$0")"

SRC="sop-print.html"
BUILD="sop-build.html"
OUT="${1:-sop.pdf}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

render() {   # $1=html  $2=pdf
  "$CHROME" --headless --disable-gpu --no-sandbox --allow-file-access-from-files \
    --run-all-compositor-stages-before-draw --virtual-time-budget=30000 \
    --no-pdf-header-footer --print-to-pdf="$PWD/$2" "file://$PWD/$1" 2>/dev/null
}

count() { python3 -c "from pypdf import PdfReader; print(len(PdfReader('$1').pages))"; }

# รอบที่ 1 — นับหน้า
sed 's/__TOTALPAGES__/99/' "$SRC" > "$BUILD"
render "$BUILD" ".pass1.pdf"
N=$(count ".pass1.pdf")
echo "รอบที่ 1: $N หน้า"

# รอบที่ 2 — ใส่จำนวนหน้าจริง
sed "s/__TOTALPAGES__/$N/" "$SRC" > "$BUILD"
render "$BUILD" "$OUT"
M=$(count "$OUT")
echo "รอบที่ 2: $M หน้า → $OUT"

[ "$N" = "$M" ] || echo "⚠️  จำนวนหน้าสองรอบไม่ตรงกัน ($N vs $M) — ตรวจท้ายเอกสาร"
rm -f ".pass1.pdf" "$BUILD"
