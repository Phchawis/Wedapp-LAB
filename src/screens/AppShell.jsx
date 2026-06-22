import { Avatar } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS } from '../data/taxonomy.js';
import { ROLES, can } from '../auth/users.js';

const seal = '/lab-seal.png';

/* AppShell — sidebar + topbar chrome wrapping every signed-in screen. */
export function AppShell({ view, onNav, cat, onCat, onLogout, user, title, subtitle, actions, children, docCount }) {
  const Q = QMS;
  const registerCount = docCount != null ? docCount : Q.DOCS.length;

  const NavItem = ({ id, icon, label, count }) => {
    const active = view === id;
    return (
      <button onClick={() => onNav(id)} style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
        padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
        background: active ? 'var(--teal-50)' : 'transparent',
        color: active ? 'var(--teal-800)' : 'var(--text-secondary)',
        font: (active ? 'var(--fw-semibold) ' : 'var(--fw-medium) ') + 'var(--text-sm)/1 var(--font-body)',
        transition: 'background var(--dur-fast)',
      }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--slate-100)'; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        <Icon name={icon} size={17} color={active ? 'var(--teal-700)' : 'var(--text-tertiary)'} />
        <span style={{ flex: 1 }}>{label}</span>
        {count != null && <span style={{ font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-mono)', color: active ? 'var(--teal-700)' : 'var(--text-tertiary)' }}>{count}</span>}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0, background: 'var(--white)',
        borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--brand-50)', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid var(--brand-100)' }}>
            <img src={seal} alt="ตรา รพธ." style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.2 var(--font-display)', color: 'var(--text-primary)' }}>ห้องปฏิบัติการเทคนิคการแพทย์</div>
            <div style={{ font: 'var(--text-2xs)/1.2 var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '.02em' }}>TUH · เทคนิคการแพทย์</div>
          </div>
        </div>

        <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1 }}>
          <NavItem id="dashboard" icon="LayoutDashboard" label="แดชบอร์ด" />
          <NavItem id="register" icon="FolderClosed" label="ทะเบียนเอกสาร" count={registerCount} />
          {can(user.role, 'users:manage') && <NavItem id="users" icon="UserCog" label="จัดการผู้ใช้งาน" />}
          {can(user.role, 'users:manage') && <NavItem id="log" icon="History" label="บันทึกกิจกรรม" />}

          <button onClick={() => onCat('LAB')} title="งานห้องปฏิบัติการเทคนิคการแพทย์" style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
            padding: '9px 12px', marginTop: 6, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: (cat === 'LAB' && view === 'register') ? 'var(--brand-700)' : 'var(--brand-50)',
            color: (cat === 'LAB' && view === 'register') ? '#fff' : 'var(--brand-700)',
            font: 'var(--fw-semibold) var(--text-sm)/1.2 var(--font-body)',
            transition: 'background var(--dur-fast)',
          }}>
            <Icon name="FlaskConical" size={17} color={(cat === 'LAB' && view === 'register') ? '#fff' : 'var(--brand-600)'} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>งานห้องปฏิบัติการเทคนิคการแพทย์</span>
          </button>

          <div style={{ font: 'var(--text-2xs)/1 var(--font-body)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '14px 12px 6px' }}>หมวดงาน</div>
          {Q.WORK_CATEGORIES.map((c) => {
            const active = cat === c.code && view === 'register';
            return (
              <button key={c.code} onClick={() => onCat(c.code)} title={c.th} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                background: active ? 'var(--brand-50)' : 'transparent',
                color: active ? 'var(--brand-800)' : 'var(--text-secondary)',
                font: (active ? 'var(--fw-semibold) ' : 'var(--fw-regular) ') + 'var(--text-xs)/1.3 var(--font-body)',
              }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--slate-100)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', width: 38, flexShrink: 0 }}>{c.code}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.th}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={user.name} size="sm" />
          <div style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
            <div style={{ font: 'var(--fw-semibold) var(--text-xs)/1.2 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ font: 'var(--text-2xs)/1.2 var(--font-body)', color: 'var(--text-tertiary)' }}>{ROLES[user.role]?.th || user.role} · {ROLES[user.role]?.short || ''}</div>
          </div>
          <button onClick={onLogout} title="ออกจากระบบ" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)' }}>
            <Icon name="LogOut" size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: 'var(--topbar-height)', flexShrink: 0, background: 'var(--white)',
          borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center',
          gap: 16, padding: '0 var(--page-gutter)', position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: 'var(--fw-bold) var(--text-lg)/1.1 var(--font-display)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle && <div style={{ font: 'var(--text-2xs)/1.2 var(--font-body)', color: 'var(--text-tertiary)' }}>{subtitle}</div>}
          </div>
          <div style={{ flex: 1 }} />
          {actions}
        </header>
        <main style={{ flex: 1, padding: 'var(--page-gutter)', overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
