import { Card, DocTypeTag, StatusBadge } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS } from '../data/taxonomy.js';
import { PermMatrix } from '../components/PermMatrix.jsx';

/* HelpScreen — the manual reads like the controlled documents it describes: numbered
   clauses with a mono spine, not a grid of stat-card tiles. North Star: The Controlled
   Register — even the reference material carries the register's own vocabulary. */

// หัวข้อหลักมีเลขลำดับข้อ (clause) แบบเดียวกับเอกสาร SOP ที่ระบบควบคุมอยู่จริง
function Section({ n, title, children }) {
  return (
    <div className="qms-help-section" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: 34, paddingTop: 20 }}>
        <span style={{ font: 'var(--fw-bold) var(--text-lg)/1 var(--font-mono)', color: 'var(--slate-300)' }}>{n}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, borderTop: '1px solid var(--border-default)', paddingTop: 18 }}>
        <h2 style={{ font: 'var(--type-section)', color: 'var(--text-primary)', marginBottom: 14 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ── ส่วนที่ 05 — สถาปัตยกรรมระบบสำหรับ Programmer / เจ้าหน้าที่ IT ──────────────
   เขียนตามระบบจริง: React+Vite (SPA) ↔ Express API (Node 22) ↔ Supabase (Postgres + Storage),
   ยืนยันตัวตนด้วย JWT + bcrypt, เชื่อม SSO กับระบบ Masterlist ฝ่ายสหเวชศาสตร์, ดีพลอยบน Render. */

const STACK = [
  { layer: 'Frontend', name: 'React 18 + Vite 5', desc: 'Single-Page App โหลดหน้าจอแบบ lazy, ธีมด้วย Design Tokens (CSS variables)' },
  { layer: 'Backend', name: 'Node 22 + Express 4', desc: 'REST API เสิร์ฟทั้ง API และไฟล์เว็บที่ build แล้วจากบริการเดียว' },
  { layer: 'Database', name: 'Supabase PostgreSQL', desc: 'จัดเก็บทะเบียนเอกสาร ผู้ใช้งาน และบันทึกกิจกรรม (audit log)' },
  { layer: 'File Storage', name: 'Supabase Storage', desc: 'เก็บไฟล์แนบจริง (PDF/Word/Excel) ในบัคเก็ต qms-files แยกจากฐานข้อมูล' },
  { layer: 'Auth', name: 'JWT + bcryptjs', desc: 'เซสชันเป็น JSON Web Token, รหัสผ่านแฮชด้วย bcrypt ไม่เก็บเป็นข้อความจริง' },
  { layer: 'Deploy', name: 'Render (Node)', desc: 'บริการเว็บเดียว build ด้วย npm run build แล้ว start ด้วย npm start' },
];

// ท่อการทำงานของ 1 คำขอ (request lifecycle) เมื่อผู้ใช้ "ลงทะเบียนเอกสาร"
const LIFECYCLE = [
  { t: 'ผู้ใช้กดบันทึก', d: 'ฟอร์มรวมไฟล์แนบเป็น FormData ส่งผ่าน HTTPS' },
  { t: 'ตรวจ JWT + สิทธิ์', d: 'มิดเดิลแวร์ยืนยัน token และเช็ก RBAC (can(role, "register"))' },
  { t: 'อัปโหลดไฟล์', d: 'ไฟล์เข้าสู่ Supabase Storage คืนค่า path อ้างอิง' },
  { t: 'เขียนฐานข้อมูล', d: 'บันทึกแถวเอกสาร + เขียน audit log ผู้ทำรายการ' },
  { t: 'ตอบกลับ + รีเฟรช', d: 'ส่ง JSON เอกสารใหม่ หน้าจอรีเฟรชทะเบียนทันที' },
];

function StackChip({ layer, name, desc, i }) {
  return (
    <div className="qms-node qms-rise-stagger" style={{
      '--i': i, minWidth: 0, background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '13px 15px',
    }}>
      <div style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--brand-600)', marginBottom: 7 }}>{layer}</div>
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', marginBottom: 4 }}>{name}</div>
      <div style={{ font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>{desc}</div>
    </div>
  );
}

// โหนดในไดอะแกรมสถาปัตยกรรม — ไอคอน + ป้ายกำกับ + จุดข้อมูลเต้น
function ArchNode({ icon, title, sub, tone = 'brand', ripple = false }) {
  const c = tone === 'accent' ? 'var(--accent-600)' : tone === 'slate' ? 'var(--slate-600)' : 'var(--brand-700)';
  const bg = tone === 'accent' ? 'var(--accent-50)' : tone === 'slate' ? 'var(--slate-100)' : 'var(--brand-50)';
  return (
    <div className="qms-node" style={{
      position: 'relative', flex: '1 1 0', minWidth: 128, textAlign: 'center',
      background: 'var(--surface-card)', border: `1px solid ${c}`, borderRadius: 'var(--radius-md)', padding: '16px 12px',
    }}>
      <div style={{ position: 'relative', width: 40, height: 40, margin: '0 auto 10px' }}>
        {ripple && <span className="qms-ripple" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${c}` }} />}
        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', background: bg }}>
          <Icon name={icon} size={20} color={c} />
        </span>
      </div>
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.2 var(--font-body)', color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ font: 'var(--text-2xs)/1.4 var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '.02em', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

// เส้นเชื่อมแนวนอนแบบมีลูกศร + เส้นประไหลสื่อทิศทางข้อมูล
function FlowLink({ label }) {
  return (
    <div className="qms-no-print" style={{ flex: '0 0 46px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, alignSelf: 'center', minWidth: 0 }}>
      {label && <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ position: 'relative', width: '100%', height: 2 }}>
        <div className="qms-flow" style={{ position: 'absolute', inset: 0 }} />
        <span style={{ position: 'absolute', right: -1, top: '50%', width: 0, height: 0, transform: 'translateY(-50%)', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--brand-600)' }} />
      </div>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <Section n="05" title="สถาปัตยกรรมระบบและการทำงานเบื้องหลัง (สำหรับ Programmer / เจ้าหน้าที่ IT)">
      <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 20, maxWidth: '72ch' }}>
        ส่วนนี้อธิบายภาพรวมทางเทคนิคของระบบสำหรับผู้พัฒนาและเจ้าหน้าที่ไอที ตั้งแต่ชุดเทคโนโลยีที่ใช้
        เส้นทางการไหลของข้อมูล ไปจนถึงการเชื่อมต่อกับระบบ Masterlist ฝ่ายสหเวชศาสตร์
      </p>

      {/* 5.1 Tech stack */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '4px 0 12px' }}>5.1 · ชุดเทคโนโลยี (Technology Stack)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 28 }}>
        {STACK.map((s, i) => <StackChip key={s.layer} {...s} i={i} />)}
      </div>

      {/* 5.2 Architecture diagram (animated) */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '4px 0 12px' }}>5.2 · แผนผังสถาปัตยกรรม (Architecture Overview)</div>
      <Card>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, flexWrap: 'wrap' }}>
          <ArchNode icon="Monitor" title="เบราว์เซอร์ผู้ใช้" sub="React SPA" tone="slate" />
          <FlowLink label="HTTPS · JWT" />
          <ArchNode icon="Server" title="Express API" sub="Node 22" ripple />
          <FlowLink label="query" />
          <ArchNode icon="Database" title="PostgreSQL" sub="Supabase" ripple />
          <FlowLink label="files" />
          <ArchNode icon="FolderClosed" title="File Storage" sub="qms-files" tone="accent" />
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="qms-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-500)', flexShrink: 0 }} />
          <span style={{ font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>
            บริการเดียวบน Render ทำหน้าที่ทั้งเสิร์ฟไฟล์เว็บที่ build แล้ว และรับคำขอ API — ฐานข้อมูลและไฟล์แนบแยกไปอยู่บน Supabase
          </span>
        </div>
      </Card>

      {/* 5.3 Request lifecycle (animated pipeline) */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '28px 0 12px' }}>5.3 · เส้นทางการทำงานของหนึ่งคำขอ — ตัวอย่าง “ลงทะเบียนเอกสาร”</div>
      <div className="qms-no-print" style={{ position: 'relative', height: 3, borderRadius: 2, background: 'var(--slate-100)', margin: '0 0 18px', overflow: 'hidden' }}>
        <span className="qms-travel" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 46, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, var(--brand-500))' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {LIFECYCLE.map((s, i) => (
          <div key={s.t} className="qms-rise-stagger" style={{ '--i': i, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'grid', placeItems: 'center', flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-700)', font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', color: '#fff' }}>{i + 1}</span>
              <div className="qms-grow" style={{ '--i': i, flex: 1, height: 2, borderRadius: 1, background: 'var(--brand-200, var(--brand-100))' }} />
            </div>
            <div style={{ font: 'var(--fw-semibold) var(--text-xs)/1.3 var(--font-body)', color: 'var(--text-primary)', marginBottom: 4 }}>{s.t}</div>
            <div style={{ font: 'var(--text-2xs)/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>{s.d}</div>
          </div>
        ))}
      </div>

      {/* 5.4 Security + SSO */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '28px 0 12px' }}>5.4 · ความปลอดภัยและการเชื่อมต่อระบบ Masterlist (SSO)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {[
          { icon: 'ShieldCheck', t: 'RBAC ตามบทบาท', d: 'ทุก endpoint ตรวจสิทธิ์ด้วย can(role, action) — สิทธิ์ผู้ควบคุมเอกสารกับผู้ใช้ทั่วไปแยกกันชัดเจน' },
          { icon: 'KeyRound', t: 'JWT + bcrypt', d: 'เซสชันเป็น JWT มีวันหมดอายุ; รหัสผ่านเก็บเป็น bcrypt hash เท่านั้น ไม่มีการเก็บรหัสจริง' },
          { icon: 'History', t: 'Audit Log', d: 'ทุกการเปลี่ยนแปลงสถานะ/ผู้ใช้ ถูกบันทึกพร้อมชื่อผู้ทำและเวลา เพื่อการตรวจประเมิน ISO 15189' },
          { icon: 'Link', t: 'SSO กับ Masterlist', d: 'ระบบรับลิงก์ ?sso=<token> ที่ลงนามด้วย SSO_SHARED_SECRET ร่วมกับระบบสหเวชศาสตร์ แล้วแลกเป็นเซสชันจริงอัตโนมัติ' },
        ].map((x, i) => (
          <div key={x.t} className="qms-node qms-rise-stagger" style={{ '--i': i, display: 'flex', gap: 12, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--brand-50)', display: 'grid', placeItems: 'center' }}>
              <Icon name={x.icon} size={18} color="var(--brand-700)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', marginBottom: 4 }}>{x.t}</div>
              <div style={{ font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>{x.d}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function HelpScreen() {
  const Q = QMS;

  const ShortcutKey = ({ keys, desc }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ font: 'var(--type-ui)', color: 'var(--text-primary)' }}>{desc}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {keys.map((k, i) => (
          <kbd key={i} style={{
            font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)',
            background: 'var(--slate-100)',
            color: 'var(--slate-900)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 6px',
            boxShadow: '0 1px 0 rgba(0,0,0,0.15)'
          }}>{k}</kbd>
        ))}
      </div>
    </div>
  );

  const REGISTER_STEPS = [
    { icon: 'Plus', title: 'เปิดฟอร์มลงทะเบียน', desc: 'กดปุ่ม "+ ลงทะเบียนเอกสาร" ที่หน้าทะเบียนเอกสาร หรือกดคีย์ลัด Alt+C — ระบบเปิดป็อปอัปกึ่งกลางจอ พื้นหลังเบลอ' },
    { icon: 'FolderClosed', title: 'จัดประเภทเอกสาร', desc: 'เลือกประเภท (QM · SOP · WI · ...) ระบุเลขที่เอกสาร แล้วเลือกหมวดงานที่รับผิดชอบ' },
    { icon: 'PencilLine', title: 'กรอกรายละเอียด', desc: 'ระบุชื่อเอกสาร ผู้รับผิดชอบ สถานะเริ่มต้น วันที่ของเอกสาร และระยะเวลาจัดเก็บ' },
    { icon: 'Paperclip', title: 'แนบไฟล์และบันทึก', desc: 'อัปโหลดไฟล์ Word/Excel/PDF หรือแนบลิงก์ภายนอก แล้วกด "บันทึกลงทะเบียน" เพื่อนำเข้าสู่ทะเบียน' },
  ];

  const STATUS_DESC = {
    effective: 'เอกสารฉบับล่าสุดที่ได้รับการประกาศใช้ บุคลากรต้องยึดถือปฏิบัติงาน ณ ปัจจุบัน',
    review: 'เอกสารอยู่ระหว่างขั้นตอนการทบทวนแก้ไข ให้บุคลากรใช้เวอร์ชันประกาศเดิมไปพลางก่อน',
    approved: 'เอกสารได้รับการลงนามอนุมัติความถูกต้องแล้ว รอการดำเนินการบันทึกประกาศใช้',
    controlled: 'สำเนาเอกสารที่ได้รับการควบคุมการแพร่กระจาย เพื่อใช้งานเฉพาะแผนกหรือจุดตรวจวิเคราะห์',
    obsolete: 'เอกสารที่ยกเลิกใช้งานแล้ว ห้ามนำมาอ้างอิงปฏิบัติงานจริง เก็บเพื่อประวัติศาสตร์คุณภาพเท่านั้น',
    draft: 'เอกสารร่างตั้งต้น อยู่ระหว่างเขียนหรือจัดเตรียมข้อมูลโดยผู้จัดเตรียม',
  };

  return (
    <div id="qms-help-doc" className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* ปกเฉพาะตอนพิมพ์ PDF — ไม่แสดงบนหน้าจอ */}
      <div className="qms-print-only" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--brand-700)' }}>
        <div style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.14em', color: 'var(--brand-700)', textTransform: 'uppercase', marginBottom: 8 }}>User Guide · คู่มือการใช้งาน</div>
        <div style={{ font: 'var(--fw-bold) var(--text-xl)/1.2 var(--font-display)', color: 'var(--text-primary)' }}>ระบบทะเบียนเอกสารคุณภาพห้องปฏิบัติการเทคนิคการแพทย์</div>
        <div style={{ font: 'var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-secondary)', marginTop: 4 }}>โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ · มาตรฐาน ISO 15189:2022</div>
      </div>

      {/* 01 — Coding standards + lifecycle */}
      <Section n="01" title="ข้อกำหนดรหัสเอกสารควบคุมและวงจรสถานะ">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px 32px' }}>
          <div>
            <div style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)', marginBottom: 12 }}>
              เลขควบคุมเอกสารมีรูปแบบมาตรฐานคือ <code style={{ font: 'var(--type-code)', color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '2px 6px', borderRadius: 'var(--radius-xs)' }}>ประเภท-หมวดงาน-ลำดับ</code> เช่น <code style={{ font: 'var(--type-code)' }}>QM-CMTL-001</code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Q.DOC_TYPES.map((t, i) => (
                <div key={t.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === Q.DOC_TYPES.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                  <DocTypeTag type={t.code} />
                  <span style={{ font: 'var(--text-sm)/1.2 var(--font-body)', color: 'var(--text-primary)' }}>{t.th}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)', marginBottom: 12 }}>
              สถานะควบคุมเอกสารคุณภาพมีสีสัญญาณและข้อกำหนดทางคุณภาพดังต่อไปนี้:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Object.keys(Q.STATUS).map((code, i) => (
                <div key={code} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: i === Object.keys(Q.STATUS).length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}><StatusBadge status={code} size="sm" /></div>
                  <div style={{ font: 'var(--text-xs)/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>{STATUS_DESC[code]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 02 — How to register a document: animated step infographic */}
      <Section n="02" title="วิธีการลงทะเบียนเอกสารใหม่">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {REGISTER_STEPS.map((s, i) => (
            <div key={s.title} className="qms-rise-stagger" style={{ '--i': i, minWidth: 0 }}>
              <div className="qms-grow" style={{ height: 3, borderRadius: 2, background: 'var(--brand-600)', marginBottom: 16, transformOrigin: 'left' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  width: 26, height: 26, borderRadius: '50%', background: 'var(--brand-700)',
                  font: 'var(--fw-bold) var(--text-xs)/1 var(--font-mono)', color: '#fff',
                }}>{i + 1}</span>
                <Icon name={s.icon} size={17} color="var(--brand-700)" />
              </div>
              <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)', marginBottom: 6 }}>{s.title}</div>
              <div style={{ font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 03 — Permissions matrix (real tabular data keeps the register's own table treatment) */}
      <Section n="03" title="ตารางสิทธิ์และการเข้าถึง (Role & Permissions Matrix)">
        <Card padding="none">
          <PermMatrix />
        </Card>
      </Section>

      {/* 04 — Shortcuts + printing */}
      <Section n="04" title="คีย์ลัดนำทางด่วนและการพิมพ์เอกสาร">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px 32px' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <ShortcutKey keys={['Alt', 'D']} desc="เปิดหน้า แผงควบคุม (Dashboard)" />
              <ShortcutKey keys={['Alt', 'R']} desc="เปิดหน้า ทะเบียนเอกสาร (Register)" />
              <ShortcutKey keys={['Alt', 'C']} desc="เปิดหน้า ลงทะเบียนเอกสารใหม่ (เฉพาะสิทธิ์ผู้ควบคุม)" />
              <ShortcutKey keys={['Alt', 'U']} desc="เปิดหน้า จัดการผู้ใช้งาน (เฉพาะสิทธิ์ผู้ควบคุม)" />
              <ShortcutKey keys={['Alt', 'L']} desc="เปิดหน้า บันทึกกิจกรรม Audit Logs (เฉพาะสิทธิ์ผู้ควบคุม)" />
            </div>
          </div>
          <div>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 12 }}>
              ระบบสนับสนุนการพิมพ์หน้าต่างเดี่ยวสำหรับเอกสารประเภท PDF เท่านั้น โดยจะมีลายน้ำควบคุมความปลอดภัยและประทับวันที่พิมพ์พร้อมชื่อผู้ทำรายการกำกับด้านล่างสุดของเอกสารเสมอ เพื่อป้องกันการถ่ายสำเนาโดยไม่ได้ควบคุม
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>
              <Icon name="ShieldCheck" size={15} color="var(--brand-600)" />
              จัดเก็บแบบอิเล็กทรอนิกส์ 100% ตามข้อกำหนด ISO 15189:2022
            </div>
          </div>
        </div>
      </Section>

      {/* 05 — สถาปัตยกรรมระบบสำหรับ Programmer / เจ้าหน้าที่ IT */}
      <ArchitectureSection />
    </div>
  );
}

export default HelpScreen;
