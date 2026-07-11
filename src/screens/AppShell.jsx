import { useState } from 'react';
import { Avatar, IconButton } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS } from '../data/taxonomy.js';
import { ROLES, can } from '../auth/users.js';
import { useNarrow } from '../hooks/useNarrow.js';

const seal = '/lab-seal.png';

/* AppShell — sidebar + topbar chrome wrapping every signed-in screen.
   Responsive drawer: Collapses into a toggleable slide-out panel on viewport width < 900px. */
export function AppShell({ view, onNav, cat, onCat, onLogout, user, title, subtitle, actions, children, docCount }) {
  const Q = QMS;
  const registerCount = docCount != null ? docCount : Q.DOCS.length;
  const narrow = useNarrow(900);
  const [open, setOpen] = useState(false);

  const NavItem = ({ id, icon, label, count }) => {
    const active = view === id;
    return (
      <button onClick={() => { onNav(id); setOpen(false); }} style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
        padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
        background: active ? 'var(--brand-50)' : 'transparent',
        color: active ? 'var(--brand-800)' : 'var(--text-secondary)',
        font: (active ? 'var(--fw-semibold) ' : 'var(--fw-medium) ') + 'var(--text-sm)/1 var(--font-body)',
        transition: 'background var(--dur-fast) var(--ease-standard)',
      }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--slate-100)'; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        <Icon name={icon} size={17} color={active ? 'var(--brand-700)' : 'var(--text-tertiary)'} />
        <span style={{ flex: 1 }}>{label}</span>
        {count != null && <span style={{ font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-mono)', color: active ? 'var(--brand-700)' : 'var(--text-tertiary)' }}>{count}</span>}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      {/* Backdrop overlay for drawer in narrow viewports */}
      {narrow && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(24, 27, 42, 0.4)',
            backdropFilter: 'blur(1.5px)',
            zIndex: 90,
            transition: 'opacity var(--dur-base) var(--ease-out)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        flexShrink: 0,
        background: 'var(--white)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: narrow ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: narrow ? 100 : 1,
        transform: narrow ? (open ? 'none' : 'translateX(-100%)') : 'none',
        transition: 'transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
        boxShadow: narrow && open ? 'var(--shadow-lg)' : 'none',
      }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNav('dashboard')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNav('dashboard'); } }}
          className="sidebar-logo-header"
        >
          <div className="logo-box-modern">
            <img src={seal} alt="ตรา รพธ." />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div className="logo-text-title">
              ห้องปฏิบัติการ<br />เทคนิคการแพทย์
            </div>
            <div className="logo-text-subtitle">
              รพ.ธรรมศาสตร์เฉลิมพระเกียรติ
            </div>
          </div>
        </div>


        <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1 }}>
          <NavItem id="dashboard" icon="LayoutDashboard" label="แดชบอร์ด" />
          <NavItem id="register" icon="FolderClosed" label="ทะเบียนเอกสาร" count={registerCount} />
          {can(user.role, 'users:manage') && <NavItem id="users" icon="UserCog" label="จัดการผู้ใช้งาน" />}
          {can(user.role, 'users:manage') && <NavItem id="log" icon="History" label="บันทึกกิจกรรม" />}
          <NavItem id="help" icon="HelpCircle" label="คู่มือการใช้งาน" />

          <div style={{ font: 'var(--text-2xs)/1 var(--font-body)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '14px 12px 6px' }}>หน่วยงาน</div>
          <button onClick={() => { onCat('LAB'); setOpen(false); }} title="งานห้องปฏิบัติการเทคนิคการแพทย์" style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
            padding: '9px 12px', marginTop: 6, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: (cat === 'LAB' && view === 'register') ? 'var(--brand-700)' : 'var(--brand-50)',
            color: (cat === 'LAB' && view === 'register') ? '#fff' : 'var(--brand-700)',
            font: 'var(--fw-semibold) var(--text-sm)/1.2 var(--font-body)',
            transition: 'background var(--dur-fast) var(--ease-standard)',
          }}>
            <Icon name="FlaskConical" size={17} color={(cat === 'LAB' && view === 'register') ? '#fff' : 'var(--brand-600)'} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>งานห้องปฏิบัติการเทคนิคการแพทย์</span>
          </button>

          <button onClick={() => { onCat('BB'); setOpen(false); }} title="งานธนาคารโลหิต" style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
            padding: '9px 12px', marginTop: 6, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: (cat === 'BB' && view === 'register') ? 'var(--brand-700)' : 'var(--brand-50)',
            color: (cat === 'BB' && view === 'register') ? '#fff' : 'var(--brand-700)',
            font: 'var(--fw-semibold) var(--text-sm)/1.2 var(--font-body)',
            transition: 'background var(--dur-fast) var(--ease-standard)',
          }}>
            <Icon name="Droplet" size={17} color={(cat === 'BB' && view === 'register') ? '#fff' : 'var(--brand-600)'} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>งานธนาคารโลหิต</span>
          </button>

          <button onClick={() => { onCat('MB'); setOpen(false); }} title="งานจุลชีววิทยา" style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
            padding: '9px 12px', marginTop: 6, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: (cat === 'MB' && view === 'register') ? 'var(--brand-700)' : 'var(--brand-50)',
            color: (cat === 'MB' && view === 'register') ? '#fff' : 'var(--brand-700)',
            font: 'var(--fw-semibold) var(--text-sm)/1.2 var(--font-body)',
            transition: 'background var(--dur-fast) var(--ease-standard)',
          }}>
            <Icon name="Microscope" size={17} color={(cat === 'MB' && view === 'register') ? '#fff' : 'var(--brand-600)'} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>งานจุลชีววิทยา</span>
          </button>

          {!['BB', 'MB'].includes(cat) && (
            <>
              <div style={{ font: 'var(--text-2xs)/1 var(--font-body)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '14px 12px 6px' }}>หมวดงาน</div>
              {Q.WORK_CATEGORIES.filter(c => !['LAB', 'BB', 'MB'].includes(c.code)).map((c) => {
                const active = cat === c.code && view === 'register';
                return (
                  <button key={c.code} onClick={() => { onCat(c.code); setOpen(false); }} title={c.th} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                    padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    background: active ? 'var(--brand-50)' : 'transparent',
                    color: active ? 'var(--brand-800)' : 'var(--text-secondary)',
                    font: (active ? 'var(--fw-semibold) ' : 'var(--fw-regular) ') + 'var(--text-xs)/1.3 var(--font-body)',
                    transition: 'background var(--dur-fast) var(--ease-standard)',
                  }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--slate-100)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', width: 38, flexShrink: 0 }}>{c.code}</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.th}</span>
                  </button>
                );
              })}
            </>
          )}
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

      {/* Main content area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: 'var(--topbar-height)', flexShrink: 0, background: 'var(--white)',
          borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center',
          gap: 16, padding: '0 var(--page-gutter)', position: 'sticky', top: 0, zIndex: 5,
        }}>
          {narrow && (
            <IconButton label="เปิดเมนู" onClick={() => setOpen(true)} variant="ghost">
              <Icon name="Menu" size={20} color="var(--text-secondary)" />
            </IconButton>
          )}
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
