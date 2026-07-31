# TUH Lab QMS — บริการเดียวเสิร์ฟทั้งเว็บ (dist) และ API (Express)
# build:  docker compose build qms
# ขั้น builder ใช้ dev dependencies (vite) สร้าง dist แล้วขั้น runner เอาแต่ของที่จำเป็น

# ---------- deps (production only) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---------- builder (มี devDeps เพื่อ build ด้วย vite) ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads

RUN addgroup -g 1001 -S nodejs && adduser -S qms -u 1001

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --chown=qms:nodejs server        ./server
# server/index.js import ตารางสิทธิ์จาก src/auth/roles.js (ใช้ร่วมกับฝั่งเว็บ)
COPY --chown=qms:nodejs src/auth      ./src/auth
COPY package.json ./

# ไฟล์แนบเก็บที่นี่ (map เป็น docker volume — ข้อมูลไม่หายตอน rebuild)
RUN mkdir -p /app/uploads && chown -R qms:nodejs /app/uploads

USER qms
EXPOSE 3001
CMD ["node", "server/index.js"]
