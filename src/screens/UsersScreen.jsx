import { useState } from 'react';
import { Card, Input, Select, Button, IconButton } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { ROLES, ROLE_ORDER } from '../auth/users.js';

const ROLE_TONE = {
  creator: { fg: 'var(--brand-700)', bg: 'var(--brand-50)' },
  admin: { fg: 'var(--blue-700)', bg: 'var(--blue-100)' },
  user: { fg: 'var(--slate-600)', bg: 'var(--slate-100)' },
};

// ตารางสิทธิ์ ทำได้/ทำไม่ได้ ของแต่ละระดับ
const PERM_ROWS = [
  { label: 'ดู / ดาวน์โหลด / พิมพ์เอกสาร', creator: true, admin: true, user: true },
  { label: 'นำเข้า (ลงทะเบียน) เอกสาร', creator: true, admin: true, user: false },
  { label: 'ลบเอกสาร', creator: true, admin: true, user: false },
  { label: 'แก้ไข / Workflow เอกสาร (ประกาศใช้/แก้ไข/ยกเลิก)', creator: true, admin: true, user: false },
  { label: 'เพิ่ม / ลบ ผู้ใช้งาน', creator: true, admin: true, user: false },
  { label: 'ดูบันทึกกิจกรรม', creator: true, admin: true, user: false },
  { label: 'แก้ไข WebApp (โค้ด/โครงสร้าง/ตั้งค่าระบบ)', creator: true, admin: false, user: false },
];

function Mark({ on }) {
  return on
    ? <span style={{ color: 'var(--green-700)', font: 'var(--fw-bold) var(--text-md)/1 var(--font-body)' }}>✓</span>
    : <span style={{ color: 'var(--slate-300)', font: 'var(--fw-bold) var(--text-md)/1 var(--font-body)' }}>✕</span>;
}

function RoleBadge({ role }) {
  const t = ROLE_TONE[role] || ROLE_TONE.user;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: t.bg, color: t.fg, font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', whiteSpace: 'nowrap' }}>
      {ROLES[role]?.short || role}
    </span>
  );
}

/* UsersScreen — manage application accounts (เพิ่ม/ลบ ผู้ใช้งาน).
   - Admin may create admin/user accounts; Creator may create any role.
   - Cannot delete yourself or the last remaining Creator. */
export function UsersScreen({ users, currentUser, onAdd, onDelete }) {
  const isCreator = currentUser.role === 'creator';
  const assignableRoles = isCreator ? ROLE_ORDER : ['admin', 'user'];

  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'user' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uname = form.username.trim();
  const duplicate = uname && users.some((u) => u.username.toLowerCase() === uname.toLowerCase());
  const errors = {
    username: !uname ? 'กรุณาระบุชื่อผู้ใช้งาน' : duplicate ? 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' : '',
    password: form.password.length < 6 ? 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' : '',
    name: !form.name.trim() ? 'กรุณาระบุชื่อ-นามสกุล' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  const creatorCount = users.filter((u) => u.role === 'creator').length;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError('');
    if (!valid) return;
    setBusy(true);
    try {
      await onAdd({ username: uname, password: form.password, name: form.name.trim(), role: form.role });
      setForm({ username: '', password: '', name: '', role: 'user' });
      setTouched(false);
    } catch (err) {
      setSubmitError(err.message || 'เพิ่มผู้ใช้งานไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const canDelete = (u) => {
    if (u.username === currentUser.username) return false; // ห้ามลบตัวเอง
    if (u.role === 'creator' && creatorCount <= 1) return false; // ต้องเหลือ Creator อย่างน้อย 1
    return true;
  };

  return (
    <div className="qms-rise" style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
      {/* User list */}
      <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Files" size={16} color="var(--text-secondary)" /> ผู้ใช้งานทั้งหมด ({users.length})</span>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['ชื่อ-นามสกุล', 'ชื่อผู้ใช้งาน', 'สิทธิ์', ''].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.username} style={{ borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>
                  {u.name}
                  {u.username === currentUser.username && <span style={{ marginLeft: 8, font: 'var(--text-2xs) var(--font-body)', color: 'var(--text-tertiary)' }}>(คุณ)</span>}
                </td>
                <td style={{ padding: '12px 16px', font: 'var(--text-sm)/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>{u.username}</td>
                <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <IconButton label="ลบผู้ใช้งาน" variant="ghost" disabled={!canDelete(u)} onClick={() => canDelete(u) && onDelete(u.username)}>
                    <Icon name="Ban" size={16} color={canDelete(u) ? 'var(--red-600)' : 'var(--slate-300)'} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Add user form */}
      <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Plus" size={16} color="var(--text-secondary)" /> เพิ่มผู้ใช้งานใหม่</span>}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="ชื่อ-นามสกุล" required placeholder="เช่น ทนพ. สมชาย ใจดี"
            value={form.name} onChange={(e) => set('name', e.target.value)} error={touched ? errors.name : undefined} />
          <Input label="ชื่อผู้ใช้งาน" required placeholder="เช่น somchai.j"
            value={form.username} onChange={(e) => set('username', e.target.value)} error={touched ? errors.username : undefined}
            prefix={<Icon name="User" size={16} color="var(--text-tertiary)" />} />
          <Input label="รหัสผ่าน" required type="password" placeholder="อย่างน้อย 6 ตัวอักษร"
            value={form.password} onChange={(e) => set('password', e.target.value)} error={touched ? errors.password : undefined}
            prefix={<Icon name="Lock" size={16} color="var(--text-tertiary)" />} />
          <Select label="ระดับสิทธิ์" value={form.role} onChange={(e) => set('role', e.target.value)}
            options={assignableRoles.map((r) => ({ value: r, label: ROLES[r].short }))} />
          {submitError && <div style={{ font: 'var(--type-caption)', color: 'var(--red-600)' }}>{submitError}</div>}
          <Button type="submit" block disabled={busy} iconLeft={<Icon name="Check" size={16} color="#fff" />}>{busy ? 'กำลังเพิ่ม…' : 'เพิ่มผู้ใช้งาน'}</Button>
          {!isCreator && (
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>
              * Admin สร้างได้เฉพาะระดับ Admin และ User
            </div>
          )}
        </form>
      </Card>
    </div>

    {/* ตารางสิทธิ์ ทำได้/ทำไม่ได้ ของแต่ละระดับ */}
    <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="UserCog" size={16} color="var(--text-secondary)" /> สิทธิ์การใช้งานแต่ละระดับ</span>}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
            {['ความสามารถ', 'Creator', 'Admin', 'User'].map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', width: i === 0 ? 'auto' : 110 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERM_ROWS.map((r, i) => (
            <tr key={i} style={{ borderBottom: i === PERM_ROWS.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '11px 16px', font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{r.label}</td>
              <td style={{ padding: '11px 16px', textAlign: 'center' }}><Mark on={r.creator} /></td>
              <td style={{ padding: '11px 16px', textAlign: 'center' }}><Mark on={r.admin} /></td>
              <td style={{ padding: '11px 16px', textAlign: 'center' }}><Mark on={r.user} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
    </div>
  );
}

export default UsersScreen;
