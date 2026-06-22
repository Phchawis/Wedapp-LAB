import { useState } from 'react';
import { Button, Input, Alert } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { useNarrow } from '../hooks/useNarrow.js';

const seal = '/lab-seal.png';

/* Login — identity gate for the QMS. Split: indigo gradient brand panel
   with the hospital seal, clean form card. Authenticates against the API. */
export function LoginScreen({ onSubmit }) {
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const narrow = useNarrow(860);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit(user, pw);
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.05fr 1fr', background: 'var(--surface-page)' }}>
      {/* Brand panel */}
      <div style={{
        display: narrow ? 'none' : 'flex', position: 'relative', background: 'var(--grad-hero)', color: '#fff',
        padding: '56px 60px', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,135,110,.34), transparent 62%)', filter: 'blur(8px)' }} />
        <div style={{ position: 'absolute', bottom: '-25%', left: '-12%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,108,214,.30), transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '46px 46px', maskImage: 'radial-gradient(120% 90% at 30% 20%, #000, transparent 75%)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 8px 24px -6px rgba(0,0,0,.35)', flexShrink: 0 }}>
            <img src={seal} alt="ตราโรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          </div>
          <div style={{ font: 'var(--fw-medium) var(--text-base)/1.45 var(--font-body)', opacity: .95 }}>
            ห้องปฏิบัติการเทคนิคการแพทย์<br />โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)', font: 'var(--fw-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 18, backdropFilter: 'blur(4px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F2876E' }} /> Lab Quality Document System
          </div>
          <h1 style={{ font: 'var(--fw-bold) var(--text-4xl)/1.1 var(--font-display)', color: '#fff', marginBottom: 16, textWrap: 'balance', letterSpacing: '-0.01em' }}>
            ทะเบียนเอกสารคุณภาพ<br />ห้องปฏิบัติการ
          </h1>
          <p style={{ font: 'var(--text-md)/1.7 var(--font-body)', color: 'rgba(255,255,255,.84)', maxWidth: 430 }}>
            ระบบจัดเก็บ ควบคุม และเผยแพร่เอกสารคุณภาพห้องปฏิบัติการเทคนิคการแพทย์
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['9 ประเภทเอกสาร', 'ควบคุมเวอร์ชันอัตโนมัติ'].map((t) => (
            <span key={t} style={{ font: 'var(--text-xs)/1 var(--font-body)', color: 'rgba(255,255,255,.9)', padding: '7px 13px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 384 }}>
          {narrow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
                <img src={seal} alt="ตรา รพธ." style={{ width: 38, height: 38, objectFit: 'contain' }} />
              </div>
              <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.35 var(--font-display)', color: 'var(--text-primary)' }}>
                เอกสารคุณภาพห้องปฏิบัติการ<br /><span style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)' }}>โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</span>
              </div>
            </div>
          )}
          <h2 style={{ font: 'var(--type-page-title)', marginBottom: 6 }}>เข้าสู่ระบบ</h2>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 28 }}>
            ระบุตัวตนเพื่อดำเนินการกับเอกสาร
          </p>
          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="danger" icon={<Icon name="AlertTriangle" size={18} color="var(--red-700)" />}>{error}</Alert>
            </div>
          )}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input label="ชื่อผู้ใช้งาน" value={user} onChange={(e) => { setUser(e.target.value); setError(''); }}
              prefix={<Icon name="User" size={16} color="var(--text-tertiary)" />} />
            <Input label="รหัสผ่าน" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(''); }}
              prefix={<Icon name="Lock" size={16} color="var(--text-tertiary)" />} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: 'var(--type-caption)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand-700)' }} /> จดจำการเข้าสู่ระบบ
              </label>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-link)' }}>ลืมรหัสผ่าน?</a>
            </div>
            <Button type="submit" block size="lg" disabled={busy} style={{ boxShadow: 'var(--glow-brand)' }} iconRight={<Icon name="ArrowRight" size={18} color="#fff" />}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
