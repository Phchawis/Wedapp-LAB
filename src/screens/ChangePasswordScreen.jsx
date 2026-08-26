import { useState } from 'react';
import { Button, Card, Alert, Input } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { api } from '../api.js';

const seal = '/lab-seal.png';

/* หน้าบังคับตั้งรหัสผ่านใหม่ — แสดงเมื่อบัญชียังใช้ "รหัสผ่านชั่วคราว"
   ที่ผู้ดูแลตั้งให้ (เช่น บัญชีที่สร้างพร้อมกันทั้งหน่วยงาน)

   เหตุผล: รหัสชั่วคราวชุดเดียวกันทั้งหน่วยงานทำให้ใครก็สวมรอยกันได้
   ซึ่งขัดกับข้อกำหนดลายมือชื่ออิเล็กทรอนิกส์ตาม ISO 15189
   ระบบจึงบังคับให้ตั้งรหัสของตัวเองก่อน แล้วจึงใช้งานได้ */
export function ChangePasswordScreen({ user, onDone, onLogout }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
    if (next !== confirm) return setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
    if (next === current) return setError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านชั่วคราว');
    setBusy(true);
    try {
      await api.changeOwnPassword(current, next);
      onDone();
    } catch (err) {
      setError(err?.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--surface-page)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div className="qms-rise" style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{
            width: 62, height: 62, borderRadius: '50%', background: 'var(--white)',
            border: '1.5px solid var(--brand-100)', boxShadow: 'var(--shadow-sm)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px',
          }}>
            <img src={seal} alt="ตราโรงพยาบาล" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          </span>
          <h1 style={{ font: 'var(--fw-bold) var(--text-xl)/1.25 var(--font-display)', color: 'var(--text-primary)' }}>
            ตั้งรหัสผ่านของคุณ
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginTop: 6 }}>
            สวัสดี {user?.name} — บัญชีนี้ยังใช้รหัสผ่านชั่วคราวอยู่
          </p>
        </div>

        <Card padding="md">
          <Alert tone="warning" title="ต้องตั้งรหัสผ่านใหม่ก่อนใช้งาน" icon={<Icon name="ShieldAlert" size={18} color="var(--amber-700)" />}>
            รหัสชั่วคราวใช้ร่วมกันทั้งหน่วยงาน หากไม่เปลี่ยน ผู้อื่นอาจเข้าใช้บัญชีของคุณและลงนามรับทราบเอกสารแทนได้
          </Alert>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <Input
              label="รหัสผ่านชั่วคราว (รหัสที่ได้รับ)"
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <Input
              label="รหัสผ่านใหม่"
              type="password"
              required
              autoComplete="new-password"
              hint="อย่างน้อย 8 ตัวอักษร"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <Input
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && (
              <div role="alert" style={{ font: 'var(--type-ui)', color: 'var(--red-700)' }}>{error}</div>
            )}

            <Button type="submit" block disabled={busy} iconRight={<Icon name="ArrowRight" size={17} color="#fff" />}>
              {busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
            </Button>
          </form>

          <button
            type="button"
            onClick={onLogout}
            style={{
              marginTop: 14, width: '100%', border: 'none', background: 'transparent',
              cursor: 'pointer', font: 'var(--type-caption)', color: 'var(--text-tertiary)',
            }}
          >
            ออกจากระบบ
          </button>
        </Card>
      </div>
    </div>
  );
}

export default ChangePasswordScreen;
