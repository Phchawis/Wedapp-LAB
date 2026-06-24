import { useState } from 'react';
import { DocTypeTag, StatusBadge, IconButton, Tabs, Input } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { FileChip } from '../components/FileChip.jsx';
import { QMS } from '../data/taxonomy.js';

/* RegisterScreen — the document register table with type / status / search filters. */
export function RegisterScreen({ docs = QMS.DOCS, cat, onOpen }) {
  const Q = QMS;

  const [type, setType] = useState('all');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const LAB = { code: 'LAB', th: 'งานห้องปฏิบัติการเทคนิคการแพทย์' };
  const isLab = cat === 'LAB';
  const catObj = isLab ? LAB : Q.WORK_CATEGORIES.find((c) => c.code === cat);

  let rows = docs.slice();
  if (cat && !isLab) rows = rows.filter((d) => d.cat === cat);
  if (type !== 'all') rows = rows.filter((d) => d.type === type);
  if (tab !== 'all') rows = rows.filter((d) => d.status === tab);
  if (q.trim()) rows = rows.filter((d) => (d.no + d.th).toLowerCase().includes(q.trim().toLowerCase()));

  const base = (cat && !isLab) ? docs.filter((d) => d.cat === cat) : docs;
  const count = (s) => base.filter((d) => d.status === s).length;

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)' }}>
      {catObj && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ font: 'var(--fw-bold) var(--text-xs)/1 var(--font-mono)', color: '#fff', background: 'var(--brand-700)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>{catObj.code}</span>
          <span style={{ font: 'var(--type-section)', color: 'var(--text-primary)' }}>{catObj.th}</span>
        </div>
      )}

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
        {[{ code: 'all', th: 'ทุกประเภท' }].concat(Q.DOC_TYPES).map((t) => {
          const active = type === t.code;
          return (
            <button key={t.code} onClick={() => setType(t.code)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px',
              borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              border: '1px solid ' + (active ? 'var(--brand-700)' : 'var(--border-default)'),
              background: active ? 'var(--brand-700)' : 'var(--white)',
              color: active ? '#fff' : 'var(--text-secondary)',
              font: 'var(--fw-medium) var(--text-xs)/1 var(--font-body)',
            }}>
              {t.code !== 'all' && <span style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', opacity: active ? 1 : .8 }}>{t.code}</span>}
              {t.th}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'all', label: 'ทั้งหมด', count: base.length },
          { value: 'effective', label: 'ประกาศใช้', count: count('effective') },
          { value: 'review', label: 'รอทบทวน', count: count('review') },
          { value: 'draft', label: 'ร่าง', count: count('draft') },
          { value: 'obsolete', label: 'ยกเลิก', count: count('obsolete') },
        ]} style={{ flex: 1, minWidth: 280 }} />
        <div style={{ width: 240, marginBottom: 6 }}>
          <Input placeholder="ค้นหาเลขที่/ชื่อเอกสาร" value={q} onChange={(e) => setQ(e.target.value)}
            prefix={<Icon name="Search" size={15} color="var(--text-tertiary)" />} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginTop: 14 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 132 }} />
              <col />
              <col style={{ width: 96 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 116 }} />
              <col style={{ width: 124 }} />
              <col style={{ width: 52 }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['เลขที่เอกสาร', 'ชื่อเอกสาร', 'แก้ไขครั้งที่', 'ไฟล์แนบ', 'สถานะ', 'ปรับปรุงล่าสุด', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 2 ? 'center' : 'left', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, idx) => (
                <tr key={d.no} onClick={() => onOpen(d)} style={{ borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background var(--dur-fast)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--slate-50)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '12px 16px' }}><DocTypeTag type={d.type} /></td>
                  <td style={{ padding: '12px 16px', minWidth: 0 }}>
                    <div style={{ font: 'var(--fw-medium) var(--text-base)/1.35 var(--font-body)', color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{d.th}</div>
                    <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.no} · {d.owner}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', font: 'var(--fw-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{String(d.rev).padStart(2, '0')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>{d.files.map((f) => <FileChip key={f} kind={f} size="sm" />)}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={d.status} size="sm" /></td>
                  <td style={{ padding: '12px 16px', font: 'var(--text-sm)/1 var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{d.updated}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                    <IconButton label="เปิดดูเอกสาร" variant="ghost"><Icon name="ChevronRight" size={18} color="var(--text-tertiary)" /></IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Icon name="FileSearch" size={28} color="var(--slate-300)" style={{ margin: '0 auto 10px' }} />
            <div style={{ font: 'var(--type-body)' }}>ไม่พบเอกสารตามเงื่อนไขที่เลือก</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegisterScreen;
