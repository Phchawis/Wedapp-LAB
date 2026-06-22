/* เลือก data store ตามการตั้งค่า:
   - ถ้ามี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → ใช้ Supabase
   - ไม่งั้น → ใช้ lowdb (ไฟล์ในเครื่อง) */
let store;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createSupabaseStore } = await import('./store-supabase.js');
  store = await createSupabaseStore();
} else {
  const { lowdbStore } = await import('./store-lowdb.js');
  store = lowdbStore;
}

export { store };
