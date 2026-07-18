import { useEffect, useState } from 'react';
import { Card, DocTypeTag, StatusBadge, Button } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { useNarrow } from '../hooks/useNarrow.js';
import { QMS } from '../data/taxonomy.js';
import { api } from '../api.js';
import { can } from '../auth/users.js';

// นับเลขไล่จาก 0 ถึงค่าจริงตอนโหลดหน้า (เคารพ prefers-reduced-motion — ข้ามไปเลขจริงทันที)
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ตัวเลข KPI ที่นับไล่ขึ้นตอนโหลด — ใช้ในแถบสรุป (stat ledger)
function StatNumber({ value, color }) {
  const v = useCountUp(value);
  return (
    <div className="qms-numeric" style={{ font: 'var(--fw-bold) var(--text-3xl)/1 var(--font-display)', color, letterSpacing: '-0.02em' }}>{v}</div>
  );
}

// โดนัทสัดส่วนสถานะเอกสาร — ไล่เฉดสีเดียวกับ legend เป๊ะ (Status-Is-Sacred)
// เส้นแต่ละสถานะ "คลี่" ออกตอนโหลดหน้า ผ่าน stroke-dasharray transition
function StatusDonut({ segments, total, size = 76 }) {
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const [revealed, setRevealed] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (revealed) return;
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="สัดส่วนสถานะเอกสาร" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={strokeWidth} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s) => {
          const frac = total ? s.n / total : 0;
          const len = frac * circumference;
          const dashOffset = -acc;
          acc += len;
          return (
            <circle
              key={s.code}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={revealed ? `${len} ${circumference - len}` : `0 ${circumference}`}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dasharray var(--dur-slow) var(--ease-out)' }}
            />
          );
        })}
      </g>
    </svg>
  );
}

/* DashboardScreen — the register itself is the dashboard: one action queue leads,
   system health reads as a slim strip (not a stacked card), and decorative icon
   boxes are retired in favor of the mono/status vocabulary the rest of the app
   already trusts. North Star: The Controlled Register — help the user decide what to do next. */

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
  const totalDisplay = useCountUp(total);

  const [onboardingVisible, setOnboardingVisible] = useState(() => {
    return localStorage.getItem('tuh-qms-onboarding-dismissed') !== 'true';
  });

  const [exporting, setExporting] = useState(false);

  const dismissOnboarding = () => {
    localStorage.setItem('tuh-qms-onboarding-dismissed', 'true');
    setOnboardingVisible(false);
  };

  const handleExportEmergencyKit = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadEmergencyKit();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TUH-QMS-Emergency-Kit.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(e.message || 'ไม่สามารถดาวน์โหลดชุดสำรองฉุกเฉินได้');
    } finally {
      setExporting(false);
    }
  };

  // นับตามสถานะ
  const countBy = (s) => docs.filter((d) => d.status === s).length;
  const statuses = STATUS_ORDER.map((code) => ({ code, th: Q.STATUS[code]?.th || code, n: countBy(code) }));
  const present = statuses.filter((s) => s.n > 0);

  // คิว "ต้องดำเนินการ": รอทบทวน + ร่าง (รอทบทวนมาก่อน แล้วเรียงตามวันที่ล่าสุด)
  const actionDocs = docs
    .filter((d) => d.status === 'review' || d.status === 'draft')
    .sort((a, b) => (a.status !== b.status ? (a.status === 'review' ? -1 : 1) : b.updated.localeCompare(a.updated)));
  const actionShown = actionDocs.slice(0, 6);

  // ตรวจสอบการทบทวนรายปีและวันหมดอายุจัดเก็บ (Compliance warning engine)
  const checkAlerts = (doc) => {
    const alerts = [];
    if (doc.status === 'effective') {
      const updatedDate = new Date(doc.updated);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (updatedDate < oneYearAgo) {
        alerts.push({ type: 'danger', text: 'เกินกำหนดทบทวนประจำปี', icon: 'AlertTriangle' });
      } else {
        const elevenMonthsAgo = new Date();
        elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
        if (updatedDate < elevenMonthsAgo) {
          alerts.push({ type: 'warning', text: 'ใกล้ครบกำหนดทบทวนประจำปี', icon: 'Clock' });
        }
      }
    }

    if (doc.status !== 'obsolete' && doc.retention) {
      const updatedDate = new Date(doc.updated);
      const expiryDate = new Date(updatedDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + parseInt(doc.retention, 10));

      const now = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      if (now > expiryDate) {
        alerts.push({ type: 'danger', text: 'หมดอายุจัดเก็บ', icon: 'Ban' });
      } else if (expiryDate < ninetyDaysFromNow) {
        alerts.push({ type: 'warning', text: 'ใกล้หมดอายุจัดเก็บ', icon: 'Clock' });
      }
    }

    return alerts;
  };

  // ค้นหารายการเอกสารที่มีประเด็นคุณภาพ (แจ้งเตือน)
  const alertDocs = docs
    .map(d => ({ doc: d, alerts: checkAlerts(d) }))
    .filter(item => item.alerts.length > 0)
    .sort((a, b) => {
      const aHasDanger = a.alerts.some(al => al.type === 'danger');
      const bHasDanger = b.alerts.some(al => al.type === 'danger');
      if (aHasDanger !== bHasDanger) return aHasDanger ? -1 : 1;
      return b.doc.updated.localeCompare(a.doc.updated);
    });

  // ── ตัวเลขสรุป (KPI ledger) — เมตริกเชิงดำเนินการ เสริมจาก breakdown รายสถานะในโดนัท ──
  const reviewDueCount = alertDocs.filter(({ alerts }) => alerts.some((a) => a.text.includes('ทบทวน'))).length;
  const ledger = [
    { label: 'เอกสารทั้งหมด', sub: 'Total documents', value: total, color: 'var(--text-primary)' },
    { label: 'ประกาศใช้', sub: 'Active', value: countBy('effective'), color: 'var(--green-700)' },
    { label: 'ต้องดำเนินการ', sub: 'Action queue', value: actionDocs.length, color: 'var(--brand-700)' },
    { label: 'แจ้งเตือนคุณภาพ', sub: 'Quality alerts', value: alertDocs.length, color: 'var(--accent-700)' },
    { label: 'ครบกำหนดทบทวน', sub: 'Review due', value: reviewDueCount, color: 'var(--amber-700)' },
  ];

  // สัดส่วนตามหมวดงาน
  const byCat = Q.WORK_CATEGORIES
    .map((c) => ({ ...c, n: docs.filter((d) => d.cat === c.code).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxCat = Math.max(...byCat.map((c) => c.n), 1);

  // ปรับปรุงล่าสุด
  const recent = docs.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);

  const currentUser = api.decodeToken();
  const isAdminOrCreator = can(currentUser?.role, 'audit');

  const trainingRows = [
    { dept: 'งานห้องปฏิบัติการเทคนิคการแพทย์', trained: 14, total: 15 },
    { dept: 'เคมีคลินิก', trained: 8, total: 12 },
    { dept: 'ภูมิคุ้มกันวิทยา', trained: 6, total: 8 },
    { dept: 'โลหิตวิทยา', trained: 10, total: 10 },
    { dept: 'จุลทรรศนศาสตร์และปรสิตวิทยา', trained: 4, total: 6 },
    { dept: 'รับสิ่งส่งตรวจและห้องปฏิบัติการส่งต่อ', trained: 5, total: 9 },
  ].map((p) => ({ ...p, pct: Math.round((p.trained / p.total) * 100) }));

  // แถวเอกสารที่คลิกเปิดได้ (ใช้ทั้งคิวงานและล่าสุด) — รองรับคีย์บอร์ด
  const DocRow = ({ d, last, meta, index }) => (
    <div
      role="button"
      tabIndex={0}
      className="qms-doc-row qms-rise-stagger"
      onClick={() => onOpen(d)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(d); } }}
      style={{
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
        '--i': index,
      }}
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
            <Icon name="Files" size={40} color="var(--brand-700)" />
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
      {/* ── ตัวเลขสรุป (KPI ledger) — ตัวเลขใหญ่นับไล่ขึ้น แบ่งช่องด้วยเส้นบาง ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${narrow ? 2 : ledger.length}, 1fr)`,
        borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)',
      }}>
        {ledger.map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: narrow ? '18px 16px' : '22px 20px',
              borderRight: (narrow ? (i % 2 === 0) : (i < ledger.length - 1)) ? '1px solid var(--border-subtle)' : 'none',
              borderTop: (narrow && i >= 2) ? '1px solid var(--border-subtle)' : 'none',
              minWidth: 0,
            }}
          >
            <StatNumber value={s.value} color={s.color} />
            <div style={{ font: 'var(--fw-medium) var(--text-sm)/1.2 var(--font-body)', color: 'var(--text-secondary)', marginTop: 10 }}>{s.label}</div>
            <div style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ภาพรวมทะเบียน: แถบสรุปแบบเรียบ (ไม่ใช่การ์ด) — ตัวเลข + แถบสัดส่วน + legend ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
            <StatusDonut segments={present.map((s) => ({ code: s.code, n: s.n, color: STATUS_DOT[s.code] }))} total={total} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="qms-numeric" style={{ font: 'var(--fw-bold) var(--text-lg)/1 var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{totalDisplay}</span>
              <span style={{ font: 'var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', marginTop: 1 }}>ฉบับ</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
            {present.map((s) => (
              <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[s.code], flexShrink: 0 }} />
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{s.th}</span>
                <span style={{ font: 'var(--fw-semibold) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-primary)' }}>{s.n}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleExportEmergencyKit}
          disabled={exporting}
          iconLeft={<Icon name={exporting ? "Loader2" : "Download"} size={15} color="var(--brand-700)" className={exporting ? "qms-spin" : ""} />}
        >
          {exporting ? 'กำลังสร้างชุดกู้ชีพ…' : 'ชุดกู้ชีพออฟไลน์'}
        </Button>
      </div>

      {/* ── Onboarding: แถบเดียวปิดได้ ไม่ใช่การ์ดอธิบายยาว ── */}
      {onboardingVisible && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 'var(--radius-md)', background: 'var(--brand-50)', border: '1px solid var(--brand-100)',
        }}>
          <Icon name="Compass" size={16} color="var(--brand-700)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, font: 'var(--type-ui)', color: 'var(--brand-900)' }}>
            เริ่มต้นใช้งาน: ดูรหัสเอกสารและวงจรสถานะได้ที่ <strong>คู่มือการใช้งาน</strong> · ค้นหาฉบับล่าสุดได้ที่ <strong>ทะเบียนเอกสาร</strong>
          </span>
          <button
            onClick={dismissOnboarding}
            title="ปิดการแนะนำ"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--brand-700)', padding: 4, borderRadius: 'var(--radius-sm)', flexShrink: 0, minHeight: 'auto' }}
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px' }}>
            <Icon name="CircleCheck" size={22} color="var(--green-700)" />
            <div>
              <div style={{ font: 'var(--fw-medium) var(--text-base)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>ไม่มีเอกสารค้างดำเนินการ</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', marginTop: 2 }}>ทุกฉบับอยู่ในสถานะที่เป็นปัจจุบัน</div>
            </div>
          </div>
        ) : (
          actionShown.map((d, i) => <DocRow key={d.no} d={d} last={i === actionShown.length - 1} meta="owner" index={i} />)
        )}
      </Card>

      {/* ── ระบบเตือนและแจ้งเตือนคุณภาพ (ISO 15189 Quality Alerts) ── */}
      {alertDocs.length > 0 && (
        <Card
          padding="none"
          header={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="ShieldAlert" size={16} color="var(--accent-700)" />
              <span style={{ font: 'var(--type-card-title)', color: 'var(--text-primary)' }}>ระบบเตือนและแจ้งเตือนคุณภาพ</span>
              <span style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>{alertDocs.length}</span>
            </div>
          )}
        >
          {alertDocs.slice(0, 5).map(({ doc: d, alerts: al }, idx) => {
            const hasDanger = al.some(x => x.type === 'danger');
            const alertText = al.map(x => x.text).join(' · ');
            return (
              <div
                key={d.no}
                role="button"
                tabIndex={0}
                className="qms-doc-row qms-rise-stagger"
                onClick={() => onOpen(d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(d); } }}
                style={{
                  borderBottom: idx === Math.min(alertDocs.length, 5) - 1 ? 'none' : '1px solid var(--border-subtle)',
                  '--i': idx,
                }}
              >
                <DocTypeTag type={d.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div title={d.th} style={{ font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.th}</div>
                  <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{d.no} · {d.owner}</div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                  background: hasDanger ? 'var(--red-100)' : 'var(--amber-100)',
                  color: hasDanger ? 'var(--red-700)' : 'var(--amber-700)',
                  font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)',
                  whiteSpace: 'nowrap'
                }}>
                  <Icon name={hasDanger ? "AlertTriangle" : "Clock"} size={12} color={hasDanger ? 'var(--red-700)' : 'var(--amber-700)'} />
                  {alertText}
                </span>
                <Icon name="ChevronRight" size={16} color="var(--text-tertiary)" />
              </div>
            );
          })}
          {alertDocs.length > 5 && (
            <div style={{ padding: '12px 18px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>
              พบประเด็นคุณภาพอีก {alertDocs.length - 5} ฉบับ (กรุณาคลิกเลือกตรวจสอบในหน้าระเบียน เพื่อพิจารณาดำเนินการแก้ไขหรือทบทวนเวอร์ชัน)
            </div>
          )}
        </Card>
      )}

      {/* ── หมวดงาน + ปรับปรุงล่าสุด ── */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1.25fr', gap: 20, alignItems: 'start' }}>
        {/* สัดส่วนตามหมวดงาน */}
        <Card padding="md" header={<SectionTitle icon="FolderClosed">เอกสารตามหมวดงาน</SectionTitle>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {byCat.map((c, i) => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 46, flexShrink: 0, font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{c.code}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--text-2xs)/1.2 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{c.th}</div>
                  <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--slate-100)', overflow: 'hidden' }}>
                    <div className="qms-grow" style={{ width: (c.n / maxCat * 100) + '%', height: '100%', background: 'var(--brand-600)', borderRadius: 'var(--radius-pill)', '--i': i }} />
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
          {recent.map((d, i) => <DocRow key={d.no} d={d} last={i === recent.length - 1} meta="updated" index={i} />)}
        </Card>
      </div>

      {/* ── ผู้บริหารติดตามผลการฝึกอบรม (SOP Training Compliance) — แถบรองท้ายสุด ไม่ใช่การ์ดตัวเลขใหญ่ ── */}
      {isAdminOrCreator && (
        <Card
          padding="none"
          header={<SectionTitle icon="ShieldCheck">ภาพรวมการฝึกอบรม (SOP Training Compliance)</SectionTitle>}
        >
          {trainingRows.map((p, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px',
                borderBottom: idx === trainingRows.length - 1 ? 'none' : '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ flex: '1 1 240px', minWidth: 0, font: 'var(--type-ui)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dept}</span>
              <div style={{ flex: '1 1 140px', maxWidth: 200, height: 6, borderRadius: 3, background: 'var(--slate-100)', overflow: 'hidden' }}>
                <div className="qms-grow" style={{ height: '100%', width: `${p.pct}%`, background: p.pct >= 90 ? 'var(--green-600)' : p.pct >= 70 ? 'var(--brand-600)' : 'var(--amber-600)', borderRadius: 3, '--i': idx }} />
              </div>
              <span className="qms-numeric" style={{ width: 60, textAlign: 'right', flexShrink: 0, font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{p.trained}/{p.total}</span>
              <span className="qms-numeric" style={{ width: 40, textAlign: 'right', flexShrink: 0, font: 'var(--fw-semibold) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{p.pct}%</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default DashboardScreen;
