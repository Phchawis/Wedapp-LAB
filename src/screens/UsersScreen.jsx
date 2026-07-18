import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, Input, Select, Button, IconButton } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { ROLES, ROLE_ORDER, can } from '../auth/users.js';
import { QMS } from '../data/taxonomy.js';
import { PermMatrix } from '../components/PermMatrix.jsx';

const ROLE_TONE = {
  sysadmin: { fg: 'var(--brand-700)', bg: 'var(--brand-50)' },
  head_work: { fg: 'var(--blue-700)', bg: 'var(--blue-100)' },
  head_cat: { fg: 'var(--teal-700)', bg: 'var(--teal-100)' },
  med_tech: { fg: 'var(--violet-700)', bg: 'var(--violet-100)' },
  assistant: { fg: 'var(--slate-600)', bg: 'var(--slate-100)' },
  admin_staff: { fg: 'var(--amber-700)', bg: 'var(--amber-100)' },
  doc_manager: { fg: 'var(--accent-700)', bg: 'var(--accent-100)' },
};

const catLabel = (code) => {
  const c = QMS.WORK_CATEGORIES.find((x) => x.code === code);
  return c ? `${c.code} · ${c.th}` : null;
};

function RoleBadge({ role }) {
  const t = ROLE_TONE[role] || ROLE_TONE.user;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: t.bg, color: t.fg, font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', whiteSpace: 'nowrap' }}>
      {ROLES[role]?.short || role}
    </span>
  );
}

// แถวแก้ไขชื่อ/สิทธิ์/หมวดงาน — ขยายแทรกใต้แถวผู้ใช้งานที่กำลังแก้ไข
function EditRow({ user, assignableRoles, onCancel, onSave }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [cat, setCat] = useState(user.cat || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('กรุณาระบุชื่อ-นามสกุล'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({ name: name.trim(), role, cat: cat || null });
    } catch (e) {
      setError(e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr style={{ background: 'var(--brand-50)' }}>
      <td colSpan={5} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input label="ชื่อ-นามสกุล" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <Select label="ระดับสิทธิ์" value={role} onChange={(e) => setRole(e.target.value)}
              options={assignableRoles.map((r) => ({ value: r, label: ROLES[r].short }))} />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <Select label="หมวดงานสังกัด" placeholder="— ไม่ระบุ —" value={cat} onChange={(e) => setCat(e.target.value)}
              options={QMS.WORK_CATEGORIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.th}` }))} />
          </div>
          <Button size="sm" disabled={busy} onClick={save} iconLeft={<Icon name="Check" size={15} color="#fff" />}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
          <Button size="sm" variant="secondary" onClick={onCancel}>ยกเลิก</Button>
        </div>
        {error && <div style={{ marginTop: 8, font: 'var(--type-caption)', color: 'var(--red-600)' }}>{error}</div>}
      </td>
    </tr>
  );
}

// แถวตั้งรหัสผ่านใหม่
function PasswordRow({ username, onCancel, onSave }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    if (password.length < 6) { setError('รหัสผ่านอย่างน้อย 6 ตัวอักษร'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave(password);
      setDone(true);
    } catch (e) {
      setError(e.message || 'ตั้งรหัสผ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr style={{ background: 'var(--brand-50)' }}>
      <td colSpan={5} style={{ padding: '14px 16px' }}>
        {done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="CircleCheck" size={17} color="var(--green-700)" />
            <span style={{ font: 'var(--type-ui)', color: 'var(--text-primary)' }}>ตั้งรหัสผ่านใหม่ให้ @{username} แล้ว — แจ้งรหัสผ่านนี้ให้ผู้ใช้งาน</span>
            <Button size="sm" variant="secondary" onClick={onCancel}>ปิด</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <Input label={`รหัสผ่านใหม่ของ @${username}`} type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร" prefix={<Icon name="Lock" size={16} color="var(--text-tertiary)" />} />
            </div>
            <Button size="sm" disabled={busy} onClick={save} iconLeft={<Icon name="Check" size={15} color="#fff" />}>{busy ? 'กำลังตั้ง…' : 'ตั้งรหัสผ่าน'}</Button>
            <Button size="sm" variant="secondary" onClick={onCancel}>ยกเลิก</Button>
          </div>
        )}
        {error && <div style={{ marginTop: 8, font: 'var(--type-caption)', color: 'var(--red-600)' }}>{error}</div>}
      </td>
    </tr>
  );
}

// ป็อปอัปเพิ่มผู้ใช้งานใหม่ กึ่งกลางจอ พื้นหลังเบลอ — เหมือนป็อปอัปลงทะเบียนเอกสาร
function AddUserModal({ users, assignableRoles, onAdd, onCancel }) {
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'med_tech', cat: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  const uname = form.username.trim();
  const duplicate = uname && users.some((u) => u.username.toLowerCase() === uname.toLowerCase());
  const errors = {
    username: !uname ? 'กรุณาระบุชื่อผู้ใช้งาน' : duplicate ? 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' : '',
    password: form.password.length < 6 ? 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' : '',
    name: !form.name.trim() ? 'กรุณาระบุชื่อ-นามสกุล' : '',
    cat: !form.cat ? 'กรุณาเลือกหมวดงานสังกัด' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError('');
    if (!valid) return;
    setBusy(true);
    try {
      await onAdd({ username: uname, password: form.password, name: form.name.trim(), role: form.role, cat: form.cat });
      onCancel();
    } catch (err) {
      setSubmitError(err.message || 'เพิ่มผู้ใช้งานไม่สำเร็จ');
      setBusy(false);
    }
  };

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(24, 27, 42, 0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto',
      }}
    >
      <form
        role="dialog" aria-modal="true" aria-label="เพิ่มผู้ใช้งานใหม่"
        onSubmit={submit} className="qms-rise"
        style={{
          background: 'var(--surface-page)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          width: '100%', maxWidth: 480, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '22px 26px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--white)', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.12em', color: 'var(--brand-700)', marginBottom: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-500)', flexShrink: 0 }} />
              NEW ACCOUNT
            </div>
            <h2 style={{ font: 'var(--type-card-title)', color: 'var(--text-primary)', margin: 0 }}>เพิ่มผู้ใช้งานใหม่</h2>
          </div>
          <IconButton label="ปิด" variant="ghost" onClick={onCancel}>
            <Icon name="X" size={18} color="var(--text-tertiary)" />
          </IconButton>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <Select label="หมวดงานสังกัด" required placeholder="— เลือกหมวดงาน —" value={form.cat}
            onChange={(e) => set('cat', e.target.value)} hint={touched ? errors.cat : undefined}
            options={QMS.WORK_CATEGORIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.th}` }))} />
          {submitError && <div style={{ font: 'var(--type-caption)', color: 'var(--red-600)' }}>{submitError}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 26px', borderTop: '1px solid var(--border-subtle)', background: 'var(--white)', flexShrink: 0 }}>
          <Button type="submit" disabled={busy} iconLeft={<Icon name="Check" size={16} color="#fff" />}>{busy ? 'กำลังเพิ่ม…' : 'เพิ่มผู้ใช้งาน'}</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>ยกเลิก</Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/* UsersScreen — manage application accounts (เพิ่ม/แก้ไข/ตั้งรหัสผ่านใหม่/ลบ ผู้ใช้งาน).
   - ผู้มีสิทธิ์ manage (SysAdmin) เท่านั้นที่เพิ่ม/แก้ไข/ลบได้ — เลือกได้ทุกระดับสิทธิ์
   - ผู้มีเฉพาะ viewUsers (เช่น Head Work) เห็นหน้านี้แบบอ่านอย่างเดียว ไม่มีปุ่มแก้ไข/ลบ/เพิ่ม
   - ห้ามลบตัวเองหรือลด/ลบ SysAdmin คนสุดท้าย */
export function UsersScreen({ users, currentUser, onAdd, onEdit, onResetPassword, onDelete }) {
  const canManage = can(currentUser.role, 'manage');
  const assignableRoles = ROLE_ORDER;

  const [showAdd, setShowAdd] = useState(false);
  // แถวที่กำลังขยายแก้ไขอยู่ — { username, mode: 'edit' | 'password' } หรือ null
  const [expanded, setExpanded] = useState(null);

  const sysadminCount = users.filter((u) => u.role === 'sysadmin').length;

  const canDeleteUser = (u) => {
    if (u.username === currentUser.username) return false; // ห้ามลบตัวเอง
    if (u.role === 'sysadmin' && sysadminCount <= 1) return false; // ต้องเหลือ SysAdmin อย่างน้อย 1
    return true;
  };

  const toggle = (username, mode) => {
    setExpanded((cur) => (cur && cur.username === username && cur.mode === mode ? null : { username, mode }));
  };

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* User list */}
      <Card padding="none" header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Files" size={16} color="var(--text-secondary)" /> ผู้ใช้งานทั้งหมด ({users.length})</span>
          {canManage && (
            <Button size="sm" onClick={() => setShowAdd(true)} iconLeft={<Icon name="Plus" size={15} color="#fff" />}>เพิ่มผู้ใช้งาน</Button>
          )}
        </div>
      }>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['ชื่อ-นามสกุล', 'ชื่อผู้ใช้งาน', 'สิทธิ์', 'หมวดงานสังกัด', canManage ? '' : null].filter((h) => h !== null).map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const isExpanded = expanded && expanded.username === u.username;
              return (
                <Fragment key={u.username}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : (i === users.length - 1 ? 'none' : '1px solid var(--border-subtle)') }}>
                    <td style={{ padding: '12px 16px', font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>
                      {u.name}
                      {u.username === currentUser.username && <span style={{ marginLeft: 8, font: 'var(--text-2xs) var(--font-body)', color: 'var(--text-tertiary)' }}>(คุณ)</span>}
                    </td>
                    <td style={{ padding: '12px 16px', font: 'var(--text-sm)/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>{u.username}</td>
                    <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                    <td style={{ padding: '12px 16px', font: 'var(--text-sm)/1.3 var(--font-body)', color: u.cat ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{catLabel(u.cat) || '—'}</td>
                    {canManage && (
                      <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <IconButton label="แก้ไขชื่อ/สิทธิ์/หมวดงาน" variant="ghost" onClick={() => toggle(u.username, 'edit')}>
                          <Icon name="PencilLine" size={16} color="var(--text-tertiary)" />
                        </IconButton>
                        <IconButton label="ตั้งรหัสผ่านใหม่" variant="ghost" onClick={() => toggle(u.username, 'password')}>
                          <Icon name="Lock" size={16} color="var(--text-tertiary)" />
                        </IconButton>
                        <IconButton label="ลบผู้ใช้งาน" variant="ghost" disabled={!canDeleteUser(u)} onClick={() => canDeleteUser(u) && onDelete(u.username)}>
                          <Icon name="Ban" size={16} color={canDeleteUser(u) ? 'var(--red-600)' : 'var(--slate-300)'} />
                        </IconButton>
                      </td>
                    )}
                  </tr>
                  {isExpanded && expanded.mode === 'edit' && (
                    <EditRow
                      user={u}
                      assignableRoles={assignableRoles}
                      onCancel={() => setExpanded(null)}
                      onSave={async (patch) => { await onEdit(u.username, patch); setExpanded(null); }}
                    />
                  )}
                  {isExpanded && expanded.mode === 'password' && (
                    <PasswordRow
                      username={u.username}
                      onCancel={() => setExpanded(null)}
                      onSave={(password) => onResetPassword(u.username, password)}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      {!canManage && (
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>
          * บทบาทของคุณดูรายชื่อผู้ใช้งานได้อย่างเดียว — เพิ่ม/แก้ไข/ลบทำได้เฉพาะ SysAdmin
        </div>
      )}

      {/* ตารางสิทธิ์ ทำได้/ทำไม่ได้ ของแต่ละระดับ */}
      <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="UserCog" size={16} color="var(--text-secondary)" /> สิทธิ์การใช้งานแต่ละระดับ</span>}>
        <PermMatrix />
      </Card>

      {showAdd && (
        <AddUserModal users={users} assignableRoles={assignableRoles} onAdd={onAdd} onCancel={() => setShowAdd(false)} />
      )}
    </div>
  );
}

export default UsersScreen;
