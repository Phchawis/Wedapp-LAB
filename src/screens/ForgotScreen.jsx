import { useEffect, useState } from 'react';
import { Button, Card, Alert } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { api } from '../api.js';

const seal = '/lab-seal.png';

/* ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่

   ระบบนี้เป็นหน้าเดียว (SPA) ลิงก์ในอีเมลจึงเป็น /?reset=<token> แล้ว App.jsx
   ส่ง token เข้ามาที่นี่ ไม่ได้แยกเป็นคนละ URL เหมือนระบบทะเบียนเอกสารกลาง
   แต่ขั้นตอนที่ผู้ใช้เจอเหมือนกันทั้งสองระบบ */

const WRAP = {
  minHeight: '100dvh', display: 'grid', placeItems: 'start center',
  padding: 'clamp(24px,6vw,64px) clamp(16px,4vw,32px)', background: 'var(--surface-page, var(--slate-50))',
};

function Shell({ title, lead, children, onBack }) {
  return (
    <div style={WRAP}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 28 }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--white)', display: 'grid', placeItems: 'center', border: '1.5px solid var(--slate-100)', flexShrink: 0 }}>
            <img src={seal} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </span>
          <span style={{ lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ display: 'block', font: 'var(--fw-bold) var(--text-md)/1.3 var(--font-display)', color: 'var(--brand-900)' }}>ห้องปฏิบัติการเทคนิคการแพทย์</span>
            <span style={{ display: 'block', font: 'var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-tertiary)' }}>รพ.ธรรมศาสตร์เฉลิมพระเกียรติ</span>
          </span>
        </div>

        <h1 style={{ font: 'var(--fw-bold) var(--text-xl)/1.2 var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        {lead && <p style={{ font: 'var(--text-sm)/1.7 var(--font-body)', color: 'var(--text-secondary)', margin: '12px 0 0' }}>{lead}</p>}

        <div style={{ marginTop: 24 }}>{children}</div>

        <button
          type="button"
          onClick={onBack}
          style={{ marginTop: 26, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'var(--type-caption)', color: 'var(--text-tertiary)', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          ← กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

const INPUT = {
  width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--slate-300)', font: 'var(--text-base)/1.4 var(--font-body)',
  color: 'var(--text-primary)', background: 'var(--white)',
};
const LABEL = { display: 'flex', flexDirection: 'column', gap: 6, font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-secondary)' };

export function ForgotScreen({ resetToken, onBack, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenState, setTokenState] = useState(resetToken ? 'checking' : 'none');

  // ตรวจ token ก่อนแสดงฟอร์ม จะได้ไม่ให้ผู้ใช้พิมพ์รหัสใหม่เสียเปล่าแล้วค่อยบอกว่าหมดอายุ
  useEffect(() => {
    if (!resetToken) return;
    let alive = true;
    api.checkResetToken(resetToken)
      .then((r) => alive && setTokenState(r.valid ? 'valid' : 'invalid'))
      .catch(() => alive && setTokenState('invalid'));
    return () => { alive = false; };
  }, [resetToken]);

  const askLink = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.forgotPassword(new FormData(e.target).get('email'));
      setSent(true);
    } catch (ex) {
      setErr(ex.message || 'ส่งคำขอไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  const setNewPassword = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pw = fd.get('password') || '';
    if (pw.length < 8) { setErr('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร'); return; }
    if (pw !== fd.get('confirm')) { setErr('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'); return; }
    setErr(''); setBusy(true);
    try {
      await api.resetPassword(resetToken, pw);
      setDone(true);
    } catch (ex) {
      setErr(ex.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  if (resetToken) {
    if (tokenState === 'checking') return <Shell title="กำลังตรวจสอบลิงก์…" onBack={onBack}><span /></Shell>;
    if (tokenState === 'invalid') {
      return (
        <Shell title="ลิงก์ใช้ไม่ได้แล้ว" onBack={onBack}>
          <Alert tone="warning">ลิงก์นี้หมดอายุ ถูกใช้ไปแล้ว หรือไม่ถูกต้อง — กรุณาขอลิงก์ใหม่อีกครั้ง</Alert>
        </Shell>
      );
    }
    if (done) {
      return (
        <Shell title="ตั้งรหัสผ่านใหม่เรียบร้อย" onBack={onBack}>
          <Alert tone="success">เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</Alert>
          <div style={{ marginTop: 18 }}>
            <Button onClick={onDone} iconLeft={<Icon name="ArrowRight" size={16} color="var(--white)" />}>ไปหน้าเข้าสู่ระบบ</Button>
          </div>
        </Shell>
      );
    }
    return (
      <Shell title="ตั้งรหัสผ่านใหม่" lead="ตั้งรหัสผ่านที่ท่านจำได้ ความยาวอย่างน้อย 8 ตัวอักษร" onBack={onBack}>
        <form onSubmit={setNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={LABEL}>รหัสผ่านใหม่<input name="password" type="password" autoComplete="new-password" autoFocus style={INPUT} /></label>
          <label style={LABEL}>ยืนยันรหัสผ่านใหม่<input name="confirm" type="password" autoComplete="new-password" style={INPUT} /></label>
          {err && <Alert tone="danger">{err}</Alert>}
          <Button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}</Button>
        </form>
      </Shell>
    );
  }

  /* ข้อความยืนยันตั้งใจไม่บอกว่าอีเมลนี้มีในระบบหรือไม่
     ถ้าบอก คนนอกจะไล่เดาได้ว่าใครมีบัญชีในระบบบ้าง */
  if (sent) {
    return (
      <Shell title="ส่งลิงก์แล้ว" onBack={onBack}>
        <Alert tone="success">
          หากอีเมลนี้ผูกอยู่กับบัญชีในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปแล้ว — ลิงก์ใช้ได้ภายใน 30 นาที และใช้ได้ครั้งเดียว
        </Alert>
        <p style={{ font: 'var(--text-xs)/1.7 var(--font-body)', color: 'var(--text-tertiary)', marginTop: 14 }}>
          ไม่ได้รับอีเมล? ลองตรวจในกล่องจดหมายขยะก่อน — หากยังไม่พบ แปลว่าบัญชีของท่านอาจยังไม่ได้ผูกอีเมลไว้
          กรณีนี้ต้องติดต่อผู้ดูแลระบบเพื่อตั้งรหัสผ่านให้
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="ลืมรหัสผ่าน" lead="กรอกอีเมลที่ผูกไว้กับบัญชีของท่าน ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้" onBack={onBack}>
      <form onSubmit={askLink} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={LABEL}>อีเมลที่ผูกกับบัญชี<input name="email" type="email" required autoFocus autoComplete="email" placeholder="name@example.com" style={INPUT} /></label>
        {err && <Alert tone="danger">{err}</Alert>}
        <Button type="submit" disabled={busy}>{busy ? 'กำลังส่ง…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}</Button>
      </form>
    </Shell>
  );
}

export default ForgotScreen;
