import { useState } from 'react';
import { Card, DocTypeTag, StatusBadge, Button } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { useNarrow } from '../hooks/useNarrow.js';
import { QMS } from '../data/taxonomy.js';
import { api } from '../api.js';

/* DashboardScreen — "แผงควบคุมงานเอกสาร": register health, an action queue of
   documents that need attention, compliance/quality warnings, then category mix + recent activity.
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

  // สัดส่วนตามหมวดงาน
  const byCat = Q.WORK_CATEGORIES
    .map((c) => ({ ...c, n: docs.filter((d) => d.cat === c.code).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxCat = Math.max(...byCat.map((c) => c.n), 1);

  // ปรับปรุงล่าสุด
  const recent = docs.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);

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
      {onboardingVisible && (
        <Card padding="md" style={{ background: 'var(--brand-50)', border: '1.5px solid var(--brand-100)', position: 'relative' }}>
          <button
            onClick={dismissOnboarding}
            title="ปิดการแนะนำ"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--brand-700)',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              transition: 'background var(--dur-fast)',
              minHeight: 'auto'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--brand-100)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Icon name="X" size={16} />
          </button>
          
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--brand-100)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name="Compass" size={20} color="var(--brand-700)" />
            </span>
            <div style={{ flex: 1 }}>
              <h2 style={{ font: 'var(--fw-bold) var(--text-md)/1.3 var(--font-display)', color: 'var(--brand-900)', marginBottom: 6 }}>
                ยินดีต้อนรับสู่ระบบบริหารจัดการเอกสารคุณภาพ (QMS Onboarding)
              </h2>
              <p style={{ font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 12, maxWidth: 640 }}>
                เพื่อความถูกต้องในการปฏิบัติงานตามมาตรฐาน **ISO 15189** นี่คือคำแนะนำเริ่มต้นสำหรับผู้ปฏิบัติงานห้องแล็บ:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, font: 'var(--text-xs)/1.4 var(--font-body)', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="HelpCircle" size={14} color="var(--brand-600)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>ศึกษาข้อกำหนด (SOP Guide):</strong> ทบทวนรหัสประเภทเอกสารและขั้นตอนของระบบผ่านเมนู <strong>"คู่มือการใช้งาน"</strong> ด้านซ้าย หรือกดปุ่มลัด <kbd style={{ background: 'var(--brand-100)', padding: '2px 4px', borderRadius: 'var(--radius-xs)', font: 'var(--font-mono)' }}>Alt + H</kbd> เพื่อเปิดดูคู่มือด่วน
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="Search" size={14} color="var(--brand-600)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>เข้าถึงเอกสารคุณภาพล่าสุด:</strong> ไปที่หน้า <strong>"ทะเบียนเอกสาร"</strong> เพื่อกรองตามแผนกและค้นหาวิธีการปฏิบัติงานล่าสุดเพื่อป้องกันการใช้เอกสารผิดรุ่น
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="ShieldAlert" size={14} color="var(--brand-600)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>ตรวจสอบแจ้งเตือนคุณภาพ:</strong> ระบบจะสแกนทะเบียนเอกสารอัตโนมัติ หากพบฉบับที่เลยรอบการทบทวนประจำปี (1 ปี) หรือหมดอายุจัดเก็บ จะแจ้งเตือนในหน้านี้ทันที
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}


      {/* ── ภาพรวมทะเบียน: จำนวนรวม + แถบสัดส่วนตามสถานะ + legend ── */}
      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span style={{ font: 'var(--fw-bold) var(--text-3xl)/1 var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{total}</span>
            <span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>ฉบับในทะเบียนเอกสาร</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportEmergencyKit}
            disabled={exporting}
            iconLeft={<Icon name="Download" size={15} color="var(--brand-700)" />}
          >
            {exporting ? 'กำลังบีบอัดไฟล์…' : 'ชุดกู้ชีพออฟไลน์ (Emergency ZIP)'}
          </Button>
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
            {byCat.map((c) => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 46, flexShrink: 0, font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{c.code}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--text-2xs)/1.2 var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{c.th}</div>
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
          {recent.map((d, i) => <DocRow key={d.no} d={d} last={i === recent.length - 1} meta="updated" index={i} />)}
        </Card>
      </div>
    </div>
  );
}

export default DashboardScreen;
