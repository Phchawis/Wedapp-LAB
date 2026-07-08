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

/* LogScreen — audit trail: ใครทำอะไรเมื่อไหร่ (newest first). */
export function LogScreen({ logs }) {
  return (
    <div className="qms-rise" style={{ maxWidth: 980 }}>
      <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="History" size={16} color="var(--text-secondary)" /> บันทึกกิจกรรม ({logs.length})</span>}>
        {logs.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Icon name="FileSearch" size={28} color="var(--slate-300)" style={{ margin: '0 auto 10px' }} />
            <div style={{ font: 'var(--type-body)' }}>ยังไม่มีบันทึกกิจกรรม</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 168 }} />
              <col style={{ width: 200 }} />
              <col style={{ width: 200 }} />
              <col />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['เวลา', 'ผู้ใช้งาน', 'การกระทำ', 'รายการ'].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((e, i) => {
                const a = LOG_ACTIONS[e.action] || { th: e.action, icon: 'FileText', c: 'var(--slate-600)' };
                return (
                  <tr key={e.id} className="qms-rise-stagger" style={{ borderBottom: i === logs.length - 1 ? 'none' : '1px solid var(--border-subtle)', '--i': i }}>
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
        )}
      </Card>
    </div>
  );
}

export default LogScreen;
