/* เลือก data store ตามการตั้งค่า (เรียงตามลำดับความสำคัญ):
   - ถ้ามี DATABASE_URL → ใช้ PostgreSQL (บน VPS) + ไฟล์แนบบนดิสก์
   - ถ้ามี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → ใช้ Supabase
   - ไม่งั้น → ใช้ lowdb (ไฟล์ในเครื่อง) */
let store;

if (process.env.DATABASE_URL) {
  const { createPostgresStore } = await import('./store-postgres.js');
  store = await createPostgresStore();
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createSupabaseStore } = await import('./store-supabase.js');
  store = await createSupabaseStore();
} else if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOWDB !== '1') {
  // fail-closed: บน production ถ้าไม่ได้ตั้งฐานข้อมูล ห้ามตกไปใช้ lowdb เงียบ ๆ
  // เพราะ lowdb จะ seed บัญชีรหัสผ่านตัวอย่าง (sysadmin/sysadmin123) ซึ่งเป็นช่องโหว่ร้ายแรง
  // ถ้าจงใจใช้ lowdb บน production จริง ให้ตั้ง ALLOW_LOWDB=1
  throw new Error(
    'ไม่พบ DATABASE_URL หรือ SUPABASE_* บน production — ปฏิเสธการเริ่มระบบด้วย lowdb ' +
    '(ตั้ง DATABASE_URL ให้ถูกต้อง หรือ ALLOW_LOWDB=1 ถ้าตั้งใจ)',
  );
} else {
  const { lowdbStore } = await import('./store-lowdb.js');
  store = lowdbStore;
}

export { store };
