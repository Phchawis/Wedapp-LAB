import { useState } from 'react';
import { Avatar, IconButton } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS } from '../data/taxonomy.js';
import { ROLES, can } from '../auth/users.js';
import { useNarrow } from '../hooks/useNarrow.js';

const seal = '/lab-seal.png';

/* AppShell — horizontal top-bar chrome wrapping every signed-in screen (primary nav row +
   หน่วยงาน/หมวดงาน sub-nav row), collapsing into a dropdown panel below var(--nav-collapse). */
const thaiToday = () => new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

export function AppShell({ view, onNav, cat, onCat, onLogout, user, eyebrow, title, subtitle, actions, children, docCount }) {
  const Q = QMS;
  const registerCount = docCount != null ? docCount : Q.DOCS.length;
  const narrow = useNarrow(900);
  const [open, setOpen] = useState(false);

  // ปักหมวดงานที่กำลังเลือกอยู่ไว้หน้าสุดของแถบ — ไม่ต้องเลื่อนหาในแถบยาว
  const otherCats = Q.WORK_CATEGORIES.filter((c) => c.code !== 'LAB');
  const activeCatCode = view === 'register' && otherCats.some((c) => c.code === cat) ? cat : null;
  const orderedCats = activeCatCode
    ? [otherCats.find((c) => c.code === activeCatCode), ...otherCats.filter((c) => c.code !== activeCatCode)]
    : otherCats;

  const navItems = [
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'แดชบอร์ด' },
    { id: 'register', icon: 'FolderClosed', label: 'ทะเบียนเอกสาร', count: registerCount },
    can(user.role, 'viewUsers') && { id: 'users', icon: 'UserCog', label: 'จัดการผู้ใช้งาน' },
    can(user.role, 'audit') && { id: 'log', icon: 'History', label: 'บันทึกกิจกรรม' },
    { id: 'help', icon: 'HelpCircle', label: 'คู่มือการใช้งาน' },
  ].filter(Boolean);

  const NavPill = ({ id, icon, label, count }) => {
    const active = view === id;
    return (
      <button onClick={() => { onNav(id); setOpen(false); }} style={{
        display: 'flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap',
        padding: '10px 18px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        background: active ? 'var(--brand-700)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        font: (active ? 'var(--fw-semibold) ' : 'var(--fw-medium) ') + 'var(--text-base)/1 var(--font-body)',
        transition: 'background var(--dur-fast) var(--ease-standard)',
      }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--slate-100)'; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        <Icon name={icon} size={18} color={active ? '#fff' : 'var(--text-tertiary)'} />
        {label}
        {count != null && <span style={{ font: 'var(--fw-bold) var(--text-xs)/1 var(--font-mono)', color: active ? 'rgba(255,255,255,.85)' : 'var(--text-tertiary)' }}>{count}</span>}
      </button>
    );
  };

  const NavRow = ({ vertical = false }) => (
    <nav style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: vertical ? 3 : 2, flexWrap: vertical ? 'nowrap' : 'wrap' }}>
      {navItems.map((n) => <NavPill key={n.id} {...n} />)}
    </nav>
  );

  const CatChip = ({ code, th, active, onClick, icon }) => (
    <button onClick={onClick} title={th} style={{
      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap',
      padding: '8px 15px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
      border: '1px solid ' + (active ? 'var(--brand-700)' : 'var(--border-default)'),
      background: active ? 'var(--brand-700)' : 'var(--white)',
      color: active ? '#fff' : 'var(--text-secondary)',
      font: (active ? 'var(--fw-semibold) ' : 'var(--fw-medium) ') + 'var(--text-sm)/1 var(--font-body)',
      transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
    }}>
      {icon ? <Icon name={icon} size={15} color={active ? '#fff' : 'var(--brand-600)'} /> : <span style={{ font: 'var(--fw-bold) var(--text-xs)/1 var(--font-mono)', opacity: active ? 1 : .7 }}>{code}</span>}
      {th}
    </button>
  );

  const CatRow = ({ vertical = false }) => (
    <div style={vertical
      ? { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }
      : { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
    }>
      <CatChip code="LAB" th="งานห้องปฏิบัติการเทคนิคการแพทย์" icon="FlaskConical"
        active={cat === 'LAB' && view === 'register'} onClick={() => { onCat('LAB'); setOpen(false); }} />
      {orderedCats.map((c, i) => {
        const chip = <CatChip code={c.code} th={c.th} active={cat === c.code && view === 'register'} onClick={() => { onCat(c.code); setOpen(false); }} />;
        // ในโหมดแนวตั้ง คั่นหมวดที่ถูกปักไว้หน้าสุด (จากการเลือกอยู่) ออกจากรายการที่เหลือด้วยเส้นบาง
        if (vertical && activeCatCode && i === 1) {
          return <div key={c.code} style={{ paddingTop: 6, marginTop: 4, borderTop: '1px solid var(--border-subtle)' }}>{chip}</div>;
        }
        return <div key={c.code}>{chip}</div>;
      })}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-page)' }}>
      {/* Top chrome — sticky across both rows */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--white)', borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Row 1 — masthead + primary nav + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '0 var(--page-gutter)', height: 76 }}>
          <div
            role="button" tabIndex={0}
            onClick={() => onNav('dashboard')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNav('dashboard'); } }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexShrink: 0 }}
          >
            <img src={seal} alt="ตรา รพธ." style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
            {!narrow && (
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ font: 'var(--fw-bold) var(--text-sm)/1.25 var(--font-display)', color: 'var(--brand-900)' }}>ห้องปฏิบัติการเทคนิคการแพทย์</div>
                <div style={{ font: 'var(--text-xs)/1.25 var(--font-body)', color: 'var(--text-tertiary)' }}>รพ.ธรรมศาสตร์เฉลิมพระเกียรติ</div>
              </div>
            )}
          </div>

          {!narrow && <div style={{ flex: 1, overflow: 'hidden' }}><NavRow /></div>}
          {narrow && <div style={{ flex: 1 }} />}

          {!narrow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Avatar name={user.name} size="md" />
              <div style={{ lineHeight: 1.3, maxWidth: 160 }}>
                <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.25 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ font: 'var(--text-xs)/1.25 var(--font-body)', color: 'var(--text-tertiary)' }}>{ROLES[user.role]?.short || user.role}</div>
              </div>
              <IconButton label="ออกจากระบบ" variant="ghost" onClick={onLogout}>
                <Icon name="LogOut" size={18} color="var(--text-tertiary)" />
              </IconButton>
            </div>
          )}

          {narrow && (
            <IconButton label={open ? 'ปิดเมนู' : 'เปิดเมนู'} onClick={() => setOpen((v) => !v)} variant="ghost">
              <Icon name={open ? 'X' : 'Menu'} size={22} color="var(--text-secondary)" />
            </IconButton>
          )}
        </div>

        {/* Row 2 — หน่วยงาน / หมวดงาน sub-nav (desktop only; folded into dropdown on narrow) */}
        {!narrow && (
          <div style={{ padding: '10px var(--page-gutter)', borderTop: '1px solid var(--border-subtle)' }}>
            <CatRow />
          </div>
        )}
      </div>

      {/* Narrow dropdown panel — nav + หน่วยงาน/หมวดงาน + user, stacked vertically */}
      {narrow && open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, top: 76, background: 'rgba(24,27,42,0.4)', backdropFilter: 'blur(1.5px)', zIndex: 18 }} />
          <div style={{
            position: 'fixed', top: 76, left: 0, right: 0, zIndex: 19, maxHeight: 'calc(100vh - 76px)', overflowY: 'auto',
            background: 'var(--white)', borderBottom: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)',
            padding: '14px var(--page-gutter) 18px', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <NavRow vertical />
            <div>
              <div style={{ font: 'var(--text-2xs)/1 var(--font-body)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>หน่วยงาน / หมวดงาน</div>
              <CatRow vertical />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
              <Avatar name={user.name} size="sm" />
              <div style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                <div style={{ font: 'var(--fw-semibold) var(--text-xs)/1.2 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ font: 'var(--text-2xs)/1.2 var(--font-body)', color: 'var(--text-tertiary)' }}>{ROLES[user.role]?.th || user.role} · {ROLES[user.role]?.short || ''}</div>
              </div>
              <button onClick={onLogout} title="ออกจากระบบ" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)' }}>
                <Icon name="LogOut" size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Page header */}
      <header style={{ flexShrink: 0, background: 'var(--white)', borderBottom: '1px solid var(--border-subtle)', padding: '26px var(--page-gutter) 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.12em', color: 'var(--brand-700)', marginBottom: 10 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-500)', flexShrink: 0 }} />
                {eyebrow}
              </div>
            )}
            <h1 style={{ font: 'var(--type-page-title)', color: 'var(--text-primary)', margin: 0, textWrap: 'balance' }}>{title}</h1>
            {subtitle && <p style={{ marginTop: 6, font: 'var(--type-body)', color: 'var(--text-secondary)', maxWidth: 640 }}>{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
            {!narrow && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: 'var(--text-xs)/1.4 var(--font-body)', color: 'var(--text-tertiary)' }}>ณ วันที่ {thaiToday()}</div>
                <div style={{ font: 'var(--fw-medium) var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '.04em' }}>มาตรฐาน ISO 15189:2022</div>
              </div>
            )}
            {actions}
          </div>
        </div>
      </header>
      <main style={{ flex: 1, padding: 'var(--page-gutter)' }}>{children}</main>
    </div>
  );
}

export default AppShell;
