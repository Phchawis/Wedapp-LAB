import { useState } from 'react';
import { Button, Card, Alert } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { ROLES } from '../auth/roles.js';
import { QMS } from '../data/taxonomy.js';
import { api } from '../api.js';

/* บัญชีของฉัน — ให้เจ้าหน้าที่ทุกคนตั้งอีเมลของตัวเองได้

   ที่ต้องมีหน้านี้เพราะอีเมลใช้รับลิงก์ตั้งรหัสผ่านใหม่ ถ้าให้เฉพาะผู้ดูแลกรอกให้
   ก็กลับไปเป็นปัญหาเดิมคือทุกอย่างต้องผ่านคนคนเดียว
   (หน้าจัดการผู้ใช้งานเปิดให้เฉพาะผู้มีสิทธิ์ เจ้าหน้าที่ทั่วไปเข้าไม่ได้) */

const LABEL = { font: 'var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em' };
const VALUE = { font: 'var(--fw-medium) var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-primary)' };
const INPUT = {
  width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--slate-300)', font: 'var(--text-base)/1.4 var(--font-body)',
  color: 'var(--text-primary)', background: 'var(--white)',
};

export function AccountScreen({ user }) {
  const [email, setEmail] = useState(user.email || '');
  const [saved, setSaved] = useState(user.email || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const catObj = QMS.WORK_CATEGORIES.find((c) => c.code === user.cat);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await api.updateMyEmail(email.trim());
      setSaved(res.email || '');
      setEmail(res.email || '');
      setMsg({ ok: true, text: res.email ? 'บันทึกอีเมลแล้ว' : 'ลบอีเมลออกแล้ว' });
    } catch (ex) {
      setMsg({ ok: false, text: ex.message || 'บันทึกไม่สำเร็จ' });
    } finally { setBusy(false); }
  };

  const info = [
    ['ชื่อ-นามสกุล', user.name],
    ['ชื่อผู้ใช้งาน', user.username],
    ['ระดับสิทธิ์', ROLES[user.role]?.th || user.role],
    ['หมวดงานสังกัด', catObj ? `${catObj.code} · ${catObj.th}` : '— ไม่ระบุ —'],
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="User" size={16} color="var(--text-secondary)" /> ข้อมูลบัญชี</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {info.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={LABEL}>{k}</span>
                <span style={VALUE}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ flex: '1 1 340px', minWidth: 0 }}>
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="KeyRound" size={16} color="var(--text-secondary)" /> อีเมลกู้คืนรหัสผ่าน</span>}>
          {/* บอกสถานะให้ชัด — คนที่ยังไม่มีอีเมลจะไม่รู้ตัวจนกระทั่งลืมรหัสแล้วรีเซ็ตไม่ได้ */}
          <div style={{ marginBottom: 16 }}>
            <Alert tone={saved ? 'info' : 'warning'}>
              {saved
                ? 'ถ้าลืมรหัสผ่าน ระบบจะส่งลิงก์ตั้งรหัสใหม่ไปที่อีเมลนี้'
                : 'ยังไม่มีอีเมล — หากลืมรหัสผ่านจะต้องติดต่อผู้ดูแลระบบ ใส่อีเมลไว้เพื่อรีเซ็ตเองได้'}
            </Alert>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={LABEL}>อีเมล</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น name@tu.ac.th" autoComplete="email" style={INPUT} />
            </label>
            {msg && <Alert tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
            <div>
              <Button type="submit" disabled={busy || email.trim() === saved}>
                {busy ? 'กำลังบันทึก…' : 'บันทึกอีเมล'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AccountScreen;
