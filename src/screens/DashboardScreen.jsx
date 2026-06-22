import { useState } from 'react';
import { Card, DocTypeTag, StatusBadge } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS } from '../data/taxonomy.js';

/* DashboardScreen — register overview: KPIs, type distribution, recent activity. */
export function DashboardScreen({ docs = QMS.DOCS, onOpen, onGoRegister }) {
  const Q = QMS;

  const total = docs.length;
  const eff = docs.filter((d) => d.status === 'effective').length;
  const rev = docs.filter((d) => d.status === 'review').length;
  const drafts = docs.filter((d) => d.status === 'draft').length;

  const Kpi = ({ icon, color, bg, value, label }) => {
    const [hov, setHov] = useState(false);
    return (
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
        flex: 1, position: 'relative', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', padding: '16px 18px', overflow: 'hidden',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, opacity: .85 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: bg, display: 'grid', placeItems: 'center', flexShrink: 0, transform: hov ? 'scale(1.06)' : 'none', transition: 'transform var(--dur-base) var(--ease-standard)' }}>
            <Icon name={icon} size={21} color={color} />
          </span>
          <div>
            <div style={{ font: 'var(--fw-bold) var(--text-3xl)/1 var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ font: 'var(--text-xs)/1.2 var(--font-body)', color: 'var(--text-tertiary)', marginTop: 3 }}>{label}</div>
          </div>
        </div>
      </div>
    );
  };

  // distribution by type
  const byType = Q.DOC_TYPES.map((t) => ({ ...t, n: docs.filter((d) => d.type === t.code).length })).filter((t) => t.n > 0);
  const maxN = Math.max(...byType.map((t) => t.n), 1);
  const recent = docs.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="qms-stagger" style={{ display: 'flex', gap: 16 }}>
        <Kpi icon="Files" color="var(--brand-700)" bg="var(--brand-50)" value={total} label="เอกสารทั้งหมด" />
        <Kpi icon="CircleCheck" color="var(--green-700)" bg="var(--green-100)" value={eff} label="ประกาศใช้" />
        <Kpi icon="Clock" color="var(--amber-700)" bg="var(--amber-100)" value={rev} label="รอทบทวน" />
        <Kpi icon="FilePen" color="var(--violet-700)" bg="var(--violet-100)" value={drafts} label="ฉบับร่าง" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20, alignItems: 'start' }}>
        {/* Type distribution */}
        <Card padding="md" header="จำนวนเอกสารตามประเภท">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byType.map((t) => (
              <div key={t.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 26, font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{t.code}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--slate-100)', overflow: 'hidden' }}>
                  <div style={{ width: (t.n / maxN * 100) + '%', height: '100%', background: 'var(--teal-600)', borderRadius: 'var(--radius-pill)' }} />
                </div>
                <span style={{ width: 20, textAlign: 'right', font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)' }}>{t.n}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card padding="none" header={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>ปรับปรุงล่าสุด</span><a href="#" onClick={(e) => { e.preventDefault(); onGoRegister(); }} style={{ font: 'var(--type-caption)', color: 'var(--text-link)' }}>ดูทั้งหมด</a></div>}>
          <div>
            {recent.map((d, i) => (
              <div key={d.no} onClick={() => onOpen(d)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i === recent.length - 1 ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--slate-50)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <DocTypeTag type={d.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.th}</div>
                  <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)' }}>{d.no} · {d.updated}</div>
                </div>
                <StatusBadge status={d.status} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardScreen;
