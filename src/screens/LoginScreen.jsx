import { useState } from 'react';
import { Button, Input, Alert } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { useNarrow } from '../hooks/useNarrow.js';

const seal = '/lab-seal.png';

/* Login — identity gate for the QMS. Split layout: a deep Institutional Indigo
   masthead panel (the hospital seal + system identity) beside a clean form.
   Restrained and institutional — no SaaS-hero gradient, glass, or coral fill.
   Authenticates against the API; session is cleared when the browser closes. */
export function LoginScreen({ onSubmit, initialError = '' }) {
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState(initialError);
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

  const Masthead = ({ compact }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 12 : 16 }}>
      <div style={{ width: compact ? 48 : 60, height: compact ? 48 : 60, borderRadius: '50%', background: 'var(--white)', display: 'grid', placeItems: 'center', boxShadow: compact ? 'var(--shadow-sm)' : 'var(--shadow-md)', border: compact ? '1px solid var(--border-subtle)' : 'none', flexShrink: 0 }}>
        <img src={seal} alt="ตราโรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ" style={{ width: compact ? 38 : 48, height: compact ? 38 : 48, objectFit: 'contain' }} />
      </div>
      {compact ? (
        <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.35 var(--font-display)', color: 'var(--text-primary)' }}>
          เอกสารคุณภาพห้องปฏิบัติการ<br />
          <span style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</span>
        </div>
      ) : (
        <div style={{ font: 'var(--fw-medium) var(--text-base)/1.45 var(--font-body)', color: 'rgba(255,255,255,.95)' }}>
          ห้องปฏิบัติการเทคนิคการแพทย์<br />โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.05fr 1fr', background: 'var(--surface-page)' }}>
      {/* Brand panel — deep institutional indigo, engraved-grid motif (no glass/blur) */}
      <div style={{
        display: narrow ? 'none' : 'flex', position: 'relative', color: 'var(--white)',
        background: 'linear-gradient(157deg, var(--brand-700) 0%, var(--brand-800) 52%, var(--brand-900) 100%)',
        padding: '56px 60px', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        <div aria-hidden style={{ position: 'absolute', top: -170, right: -170, width: 540, height: 540, borderRadius: '50%', border: '1px solid rgba(255,255,255,.10)', boxShadow: '0 0 0 64px rgba(255,255,255,.022)' }} />

        <div style={{ position: 'relative' }}><Masthead /></div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, font: 'var(--fw-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.14em', color: 'rgba(255,255,255,.80)', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-500)', flexShrink: 0 }} /> TUH · LAB · QMS
          </div>
          <div style={{ font: 'var(--fw-bold) var(--text-4xl)/1.12 var(--font-display)', color: 'var(--white)', marginBottom: 16, textWrap: 'balance', letterSpacing: '-0.015em' }}>
            ทะเบียนเอกสารคุณภาพ<br />ห้องปฏิบัติการ
          </div>
          <p style={{ font: 'var(--text-md)/1.7 var(--font-body)', color: 'rgba(255,255,255,.82)', maxWidth: 440 }}>
            จัดเก็บ ควบคุม และเผยแพร่เอกสารคุณภาพอย่างเป็นระบบ — ทุกฉบับมีเลขควบคุม สถานะ และร่องรอยการแก้ไข
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, font: 'var(--text-xs)/1.5 var(--font-body)', color: 'rgba(255,255,255,.74)', borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: 18 }}>
          <Icon name="CircleCheck" size={15} color="rgba(255,255,255,.72)" />
          ควบคุมเอกสารตามหลัก ISO 15189 · ทุกการเปลี่ยนแปลงตรวจสอบย้อนหลังได้
        </div>
      </div>

      {/* Form panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="qms-rise" style={{ width: '100%', maxWidth: 384 }}>
          {narrow && <div style={{ marginBottom: 28 }}><Masthead compact /></div>}

          <h1 style={{ font: 'var(--type-page-title)', color: 'var(--text-primary)', marginBottom: 6 }}>เข้าสู่ระบบ</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 26 }}>
            ระบุตัวตนเพื่อดำเนินการกับเอกสาร
          </p>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="danger" icon={<Icon name="AlertTriangle" size={18} color="var(--red-700)" />}>{error}</Alert>
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input label="ชื่อผู้ใช้งาน" name="username" autoComplete="username" autoFocus required
              value={user} onChange={(e) => { setUser(e.target.value); setError(''); }}
              prefix={<Icon name="User" size={16} color="var(--text-tertiary)" />} />
            <Input label="รหัสผ่าน" type="password" name="password" autoComplete="current-password" required
              value={pw} onChange={(e) => { setPw(e.target.value); setError(''); }}
              prefix={<Icon name="Lock" size={16} color="var(--text-tertiary)" />} />

            <Button type="submit" block size="lg" disabled={busy} iconRight={<Icon name="ArrowRight" size={18} color="var(--white)" />}>
              {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </Button>
          </form>

          {/* honest helpers — no remember-me (session-only), no dead reset link */}
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>
              <Icon name="LogOut" size={14} color="var(--text-tertiary)" />
              ระบบจะออกจากระบบอัตโนมัติเมื่อปิดเบราว์เซอร์
            </div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>
              ลืมรหัสผ่าน? <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>ติดต่อผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
