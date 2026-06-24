/* ที่เก็บไฟล์บน Cloudflare R2 (S3-compatible) — เปิดใช้เมื่อกรอก R2_* ครบ.
   ออกแบบให้ "migration-safe": ไฟล์ที่เก็บผ่าน R2 จะมี ref ขึ้นต้นด้วย "r2:"
   ส่วนไฟล์เก่า (บนดิสก์/Supabase Storage) ไม่มี prefix → ระบบยังอ่านของเดิมได้
   ตั้งค่าใน .env:
     R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET */
import { newId } from './seed.js';

const PREFIX = 'r2:';
const BUCKET = process.env.R2_BUCKET;

export const R2_ENABLED = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET
);

// ref ของไฟล์นี้เก็บบน R2 หรือไม่
export const isR2Ref = (ref) => typeof ref === 'string' && ref.startsWith(PREFIX);

let _client; // S3 client (โหลดแบบ lazy เฉพาะตอนเปิดใช้ R2)
async function client() {
  if (_client) return _client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

// อัปโหลดไฟล์ → คืน ref ("r2:<key>")
export async function r2Upload(file) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0];
  const key = `${newId()}${ext}`;
  const c = await client();
  await c.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype,
  }));
  return PREFIX + key;
}

// ดาวน์โหลดไฟล์จาก ref → Buffer
export async function r2Download(ref) {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const c = await client();
  const res = await c.send(new GetObjectCommand({ Bucket: BUCKET, Key: ref.slice(PREFIX.length) }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ลบไฟล์ (รับได้หลาย ref — กรองเฉพาะของ R2)
export async function r2Delete(refs) {
  const keys = (Array.isArray(refs) ? refs : [refs]).filter(isR2Ref).map((r) => r.slice(PREFIX.length));
  if (!keys.length) return;
  const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
  const c = await client();
  await c.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
}
