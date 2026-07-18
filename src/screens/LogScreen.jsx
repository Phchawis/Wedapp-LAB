import { useMemo, useState } from 'react';
import { Card } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { ROLES } from '../auth/users.js';
import { LOG_ACTIONS } from '../auth/activityLog.js';

function formatTs(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* LogScreen — audit trail: ใครทำอะไรเมื่อไหร่ (newest first).
   กรองตามชนิดการกระทำได้ (client-side — ทะเบียนระดับแล็บเดียว ไม่ต้องแบ่งหน้า). */
export function LogScreen({ logs }) {
  const [action, setAction] = useState('all');

  const counts = useMemo(() => {
    const c = {};
    for (const e of logs) c[e.action] = (c[e.action] || 0) + 1;
    return c;
  }, [logs]);

  const presentActions = useMemo(
    () => Object.keys(LOG_ACTIONS).filter((code) => counts[code] > 0),
    [counts]
  );

  // สรุปภาพรวม — เติมพื้นที่ฝั่งขวาด้วยข้อมูลที่มีประโยชน์ แทนที่จะปล่อยว่าง
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return logs.filter((e) => (e.ts || '').startsWith(today)).length;
  }, [logs]);

  const topUsers = useMemo(() => {
    const byUser = {};
    for (const e of logs) {
      const key = e.username;
      if (!byUser[key]) byUser[key] = { name: e.name, username: e.username, role: e.role, n: 0 };
      byUser[key].n += 1;
    }
    return Object.values(byUser).sort((a, b) => b.n - a.n).slice(0, 4);
  }, [logs]);

  const topActions = useMemo(
    () => presentActions.map((code) => ({ code, n: counts[code] })).sort((a, b) => b.n - a.n).slice(0, 5),
    [presentActions, counts]
  );
  const maxActionCount = Math.max(...topActions.map((a) => a.n), 1);

  const filtered = action === 'all' ? logs : logs.filter((e) => e.action === action);

  const Chip = ({ code, label, count, active }) => (
    <button
      type="button"
      onClick={() => setAction(code)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px',
        borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: '1px solid ' + (active ? 'var(--brand-700)' : 'var(--border-default)'),
        background: active ? 'var(--brand-700)' : 'var(--white)',
        color: active ? '#fff' : 'var(--text-secondary)',
        font: 'var(--fw-medium) var(--text-xs)/1 var(--font-body)',
      }}
    >
      {label}
      <span style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', opacity: active ? 1 : .7 }}>{count}</span>
    </button>
  );

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          <Chip code="all" label="ทั้งหมด" count={logs.length} active={action === 'all'} />
          {presentActions.map((code) => (
            <Chip key={code} code={code} label={LOG_ACTIONS[code].th} count={counts[code]} active={action === code} />
          ))}
        </div>

        <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="History" size={16} color="var(--text-secondary)" /> บันทึกกิจกรรม ({filtered.length}{action !== 'all' ? ` จาก ${logs.length}` : ''})</span>}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Icon name="FileSearch" size={28} color="var(--slate-300)" style={{ margin: '0 auto 10px' }} />
              <div style={{ font: 'var(--type-body)' }}>{logs.length === 0 ? 'ยังไม่มีบันทึกกิจกรรม' : 'ไม่พบบันทึกที่ตรงกับตัวกรองนี้'}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 680 }}>
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '27%' }} />
                  <col style={{ width: '27%' }} />
                  <col style={{ width: '28%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['เวลา', 'ผู้ใช้งาน', 'การกระทำ', 'รายการ'].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => {
                    const a = LOG_ACTIONS[e.action] || { th: e.action, icon: 'FileText', c: 'var(--slate-600)' };
                    return (
                      <tr key={e.id} className="qms-rise-stagger" style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border-subtle)', '--i': i }}>
                        <td style={{ padding: '11px 16px', font: 'var(--text-2xs)/1.4 var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatTs(e.ts)}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                          <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)' }}>{e.username} · {ROLES[e.role]?.short || e.role}</div>
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: 'var(--fw-medium) var(--text-sm)/1.2 var(--font-body)', color: a.c }}>
                            <Icon name={a.icon} size={15} color={a.c} /> {a.th}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', font: 'var(--text-sm)/1.3 var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.target || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* สรุปภาพรวม — เติมความกว้างฝั่งขวาด้วยข้อมูลที่มีประโยชน์ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding="md">
          <div style={{ font: 'var(--fw-bold) var(--text-3xl)/1 var(--font-display)', color: 'var(--brand-700)' }}>{todayCount}</div>
          <div style={{ marginTop: 6, font: 'var(--fw-medium) var(--text-sm)/1.2 var(--font-body)', color: 'var(--text-secondary)' }}>กิจกรรมวันนี้</div>
        </Card>

        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="TrendingUp" size={15} color="var(--text-secondary)" /> การกระทำยอดนิยม</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topActions.map((a, i) => {
              const meta = LOG_ACTIONS[a.code] || { th: a.code, c: 'var(--slate-600)' };
              return (
                <div key={a.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--text-xs)/1.3 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>{meta.th}</span>
                    <span style={{ font: 'var(--fw-bold) var(--font-mono)', color: 'var(--text-primary)' }}>{a.n}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--slate-100)', overflow: 'hidden' }}>
                    <div className="qms-grow" style={{ '--i': i, height: '100%', width: `${(a.n / maxActionCount) * 100}%`, background: meta.c, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Users" size={15} color="var(--text-secondary)" /> ผู้ใช้งานที่มีกิจกรรมมากที่สุด</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topUsers.map((u) => (
              <div key={u.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                  <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)' }}>{ROLES[u.role]?.short || u.role}</div>
                </div>
                <div style={{ font: 'var(--fw-bold) var(--text-sm)/1 var(--font-mono)', color: 'var(--brand-700)', flexShrink: 0 }}>{u.n}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default LogScreen;
