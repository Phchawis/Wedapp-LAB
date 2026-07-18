import { Fragment, useState } from 'react';
import { Card, Input, Select, Button, IconButton } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { ROLES, ROLE_ORDER, can } from '../auth/users.js';
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

function RoleBadge({ role }) {
  const t = ROLE_TONE[role] || ROLE_TONE.user;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: t.bg, color: t.fg, font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', whiteSpace: 'nowrap' }}>
      {ROLES[role]?.short || role}
    </span>
  );
}

// แถวแก้ไขชื่อ/สิทธิ์ — ขยายแทรกใต้แถวผู้ใช้งานที่กำลังแก้ไข
function EditRow({ user, assignableRoles, onCancel, onSave }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('กรุณาระบุชื่อ-นามสกุล'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({ name: name.trim(), role });
    } catch (e) {
      setError(e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr style={{ background: 'var(--brand-50)' }}>
      <td colSpan={4} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <Input label="ชื่อ-นามสกุล" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ flex: '0 1 180px' }}>
            <Select label="ระดับสิทธิ์" value={role} onChange={(e) => setRole(e.target.value)}
              options={assignableRoles.map((r) => ({ value: r, label: ROLES[r].short }))} />
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
      <td colSpan={4} style={{ padding: '14px 16px' }}>
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

/* UsersScreen — manage application accounts (เพิ่ม/แก้ไข/ตั้งรหัสผ่านใหม่/ลบ ผู้ใช้งาน).
   - ผู้มีสิทธิ์ manage (SysAdmin) เท่านั้นที่เพิ่ม/แก้ไข/ลบได้ — เลือกได้ทุกระดับสิทธิ์
   - ผู้มีเฉพาะ viewUsers (เช่น Head Work) เห็นหน้านี้แบบอ่านอย่างเดียว ไม่มีปุ่มแก้ไข/ลบ/เพิ่ม
   - ห้ามลบตัวเองหรือลด/ลบ SysAdmin คนสุดท้าย */
export function UsersScreen({ users, currentUser, onAdd, onEdit, onResetPassword, onDelete }) {
  const canManage = can(currentUser.role, 'manage');
  const assignableRoles = ROLE_ORDER;

  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'med_tech' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // แถวที่กำลังขยายแก้ไขอยู่ — { username, mode: 'edit' | 'password' } หรือ null
  const [expanded, setExpanded] = useState(null);

  const uname = form.username.trim();
  const duplicate = uname && users.some((u) => u.username.toLowerCase() === uname.toLowerCase());
  const errors = {
    username: !uname ? 'กรุณาระบุชื่อผู้ใช้งาน' : duplicate ? 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' : '',
    password: form.password.length < 6 ? 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' : '',
    name: !form.name.trim() ? 'กรุณาระบุชื่อ-นามสกุล' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  const sysadminCount = users.filter((u) => u.role === 'sysadmin').length;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError('');
    if (!valid) return;
    setBusy(true);
    try {
      await onAdd({ username: uname, password: form.password, name: form.name.trim(), role: form.role });
      setForm({ username: '', password: '', name: '', role: 'med_tech' });
      setTouched(false);
    } catch (err) {
      setSubmitError(err.message || 'เพิ่มผู้ใช้งานไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const canDeleteUser = (u) => {
    if (u.username === currentUser.username) return false; // ห้ามลบตัวเอง
    if (u.role === 'sysadmin' && sysadminCount <= 1) return false; // ต้องเหลือ SysAdmin อย่างน้อย 1
    return true;
  };

  const toggle = (username, mode) => {
    setExpanded((cur) => (cur && cur.username === username && cur.mode === mode ? null : { username, mode }));
  };

  return (
    <div className="qms-rise" style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={canManage ? { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' } : undefined}>
      {/* User list */}
      <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Files" size={16} color="var(--text-secondary)" /> ผู้ใช้งานทั้งหมด ({users.length})</span>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['ชื่อ-นามสกุล', 'ชื่อผู้ใช้งาน', 'สิทธิ์', canManage ? '' : null].filter((h) => h !== null).map((h, i) => (
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
                    {canManage && (
                      <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <IconButton label="แก้ไขชื่อ/สิทธิ์" variant="ghost" onClick={() => toggle(u.username, 'edit')}>
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

      {/* Add user form — เฉพาะผู้มีสิทธิ์ manage เท่านั้น */}
      {canManage && (
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
          </form>
        </Card>
      )}
    </div>

    {!canManage && (
      <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>
        * บทบาทของคุณดูรายชื่อผู้ใช้งานได้อย่างเดียว — เพิ่ม/แก้ไข/ลบทำได้เฉพาะ SysAdmin
      </div>
    )}

    {/* ตารางสิทธิ์ ทำได้/ทำไม่ได้ ของแต่ละระดับ */}
    <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="UserCog" size={16} color="var(--text-secondary)" /> สิทธิ์การใช้งานแต่ละระดับ</span>}>
      <PermMatrix />
    </Card>
    </div>
  );
}

export default UsersScreen;
