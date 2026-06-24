import { Card, DocTypeTag, StatusBadge, Button } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { useNarrow } from '../hooks/useNarrow.js';
import { QMS } from '../data/taxonomy.js';

/* DashboardScreen — "แผงควบคุมงานเอกสาร": register health, an action queue of
   documents that need attention, then category mix + recent activity.
   North Star: The Controlled Register — help the user decide what to do next. */

// สีเม็ดสถานะ (คำศัพท์ตายตัวตามกฎ Status-Is-Sacred); ใช้กับแถบสัดส่วนและ legend
const STATUS_ORDER = ['effective', 'review', 'draft', 'approved', 'controlled', 'obsolete'];
const STATUS_DOT = {
  effective: 'var(--green-600)',
  review: 'var(--amber-600)',
  draft: 'var(--slate-400)',
  approved: 'var(--blue-600)',
  controlled: 'var(--violet-600)',
  obsolete: 'var(--red-600)',
};

export function DashboardScreen({ docs = QMS.DOCS, onOpen, onGoRegister, onCreate }) {
  const Q = QMS;
  const narrow = useNarrow(900);
  const total = docs.length;

  // นับตามสถานะ
  const countBy = (s) => docs.filter((d) => d.status === s).length;
  const statuses = STATUS_ORDER.map((code) => ({ code, th: Q.STATUS[code]?.th || code, n: countBy(code) }));
  const present = statuses.filter((s) => s.n > 0);

  // คิว "ต้องดำเนินการ": รอทบทวน + ร่าง (รอทบทวนมาก่อน แล้วเรียงตามวันที่ล่าสุด)
  const actionDocs = docs
    .filter((d) => d.status === 'review' || d.status === 'draft')
    .sort((a, b) => (a.status !== b.status ? (a.status === 'review' ? -1 : 1) : b.updated.localeCompare(a.updated)));
  const actionShown = actionDocs.slice(0, 6);

  // สัดส่วนตามหมวดงาน
  const byCat = Q.WORK_CATEGORIES
    .map((c) => ({ ...c, n: docs.filter((d) => d.cat === c.code).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxCat = Math.max(...byCat.map((c) => c.n), 1);

  // ปรับปรุงล่าสุด
  const recent = docs.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);

  // แถวเอกสารที่คลิกเปิดได้ (ใช้ทั้งคิวงานและล่าสุด) — รองรับคีย์บอร์ด
  const DocRow = ({ d, last, meta }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(d)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(d); } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer',
        transition: 'background var(--dur-fast) var(--ease-standard)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--slate-50)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <DocTypeTag type={d.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div title={d.th} style={{ font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.th}</div>
        <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{d.no} · {meta === 'owner' ? d.owner : d.updated}</div>
      </div>
      <StatusBadge status={d.status} size="sm" />
      <Icon name="ChevronRight" size={16} color="var(--text-tertiary)" />
    </div>
  );

  const SectionTitle = ({ icon, children, accent }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Icon name={icon} size={16} color="var(--text-secondary)" />
      <span style={{ font: 'var(--type-card-title)', color: 'var(--text-primary)' }}>{children}</span>
      {accent}
    </span>
  );

  // ── Empty state: ยังไม่มีเอกสารในทะเบียน ──
  if (total === 0) {
    return (
      <div className="qms-rise" style={{ maxWidth: 'var(--container-max)' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '40px 20px' }}>
            <span style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--brand-50)', display: 'grid', placeItems: 'center' }}>
              <Icon name="Files" size={30} color="var(--brand-700)" />
            </span>
            <div style={{ font: 'var(--type-section)', color: 'var(--text-primary)' }}>ยังไม่มีเอกสารในทะเบียน</div>
            <div style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', maxWidth: 440 }}>
              เริ่มต้นด้วยการลงทะเบียนเอกสารคุณภาพฉบับแรก ระบบจะกำหนดเลขที่ควบคุม สถานะ และเก็บประวัติการดำเนินการให้อัตโนมัติ
            </div>
            <div style={{ marginTop: 4 }}>
              {onCreate
                ? <Button size="lg" onClick={onCreate} iconLeft={<Icon name="Plus" size={17} color="#fff" />}>ลงทะเบียนเอกสารแรก</Button>
                : <Button size="lg" variant="secondary" onClick={onGoRegister} iconLeft={<Icon name="Files" size={16} color="var(--brand-700)" />}>ไปที่ทะเบียนเอกสาร</Button>}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── ภาพรวมทะเบียน: จำนวนรวม + แถบสัดส่วนตามสถานะ + legend ── */}
      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ font: 'var(--fw-bold) var(--text-3xl)/1 var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{total}</span>
          <span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>ฉบับในทะเบียนเอกสาร</span>
        </div>

        {/* แถบสัดส่วนตามสถานะ (segmented) */}
        <div style={{ display: 'flex', gap: 2, height: 12, borderRadius: 'var(--radius-pill)', overflow: 'hidden', background: 'var(--slate-100)' }}>
          {present.map((s) => (
            <div key={s.code} title={`${s.th} · ${s.n}`} style={{ flexGrow: s.n, flexBasis: 0, minWidth: 8, background: STATUS_DOT[s.code] }} />
          ))}
        </div>

        {/* legend: เม็ดสี + ป้าย + จำนวน (mono) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginTop: 14 }}>
          {present.map((s) => (
            <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: STATUS_DOT[s.code], flexShrink: 0 }} />
              <span style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)' }}>{s.th}</span>
              <span style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)' }}>{s.n}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── ต้องดำเนินการ (พระเอกของหน้า): รอทบทวน + ร่าง ── */}
      <Card
        padding="none"
        header={(
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle
              icon="Clock"
              accent={actionDocs.length > 0 && (
                <span style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>{actionDocs.length}</span>
              )}
            >ต้องดำเนินการ</SectionTitle>
            {actionDocs.length > actionShown.length && (
              <button type="button" onClick={onGoRegister} style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: 'var(--type-caption)', color: 'var(--text-link)', padding: 0 }}>
                ดูทั้งหมด ({actionDocs.length})
              </button>
            )}
          </div>
        )}
      >
        {actionDocs.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 18px' }}>
            <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--green-100)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name="CircleCheck" size={20} color="var(--green-700)" />
            </span>
            <div>
              <div style={{ font: 'var(--fw-medium) var(--text-base)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>ไม่มีเอกสารค้างดำเนินการ</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', marginTop: 2 }}>ทุกฉบับอยู่ในสถานะที่เป็นปัจจุบัน</div>
            </div>
          </div>
        ) : (
          actionShown.map((d, i) => <DocRow key={d.no} d={d} last={i === actionShown.length - 1} meta="owner" />)
        )}
      </Card>

      {/* ── หมวดงาน + ปรับปรุงล่าสุด ── */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1.25fr', gap: 20, alignItems: 'start' }}>
        {/* สัดส่วนตามหมวดงาน */}
        <Card padding="md" header={<SectionTitle icon="FolderClosed">เอกสารตามหมวดงาน</SectionTitle>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {byCat.map((c) => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 46, flexShrink: 0, font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{c.code}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--text-2xs)/1.2 var(--font-body)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{c.th}</div>
                  <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--slate-100)', overflow: 'hidden' }}>
                    <div style={{ width: (c.n / maxCat * 100) + '%', height: '100%', background: 'var(--brand-600)', borderRadius: 'var(--radius-pill)' }} />
                  </div>
                </div>
                <span style={{ width: 22, textAlign: 'right', flexShrink: 0, font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)' }}>{c.n}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ปรับปรุงล่าสุด */}
        <Card
          padding="none"
          header={(
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionTitle icon="History">ปรับปรุงล่าสุด</SectionTitle>
              <button type="button" onClick={onGoRegister} style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: 'var(--type-caption)', color: 'var(--text-link)', padding: 0 }}>ดูทั้งหมด</button>
            </div>
          )}
        >
          {recent.map((d, i) => <DocRow key={d.no} d={d} last={i === recent.length - 1} meta="updated" />)}
        </Card>
      </div>
    </div>
  );
}

export default DashboardScreen;
