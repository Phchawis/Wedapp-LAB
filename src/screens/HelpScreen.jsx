import { Button, Card, DocTypeTag, StatusBadge } from '../components/ds/index.js';
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

/* ── 05 — แผนรับมือเมื่อระบบใช้งานไม่ได้ ────────────────────────────────────
   คู่มือหน้านี้อ่านไม่ได้ตอนระบบล่ม จึงมี "การ์ดฉุกเฉิน" หน้าเดียวให้พิมพ์ติดหน้างานแยกต่างหาก
   จุดเด่นของระบบนี้คือ "ชุดกู้ชีพออฟไลน์" (ZIP เปิดอ่านได้โดยไม่ต้องมีเน็ต) ซึ่งเป็นหัวใจของแผนนี้ */

const CONTACT = {
  name: 'ทนพ.ภาคย์ชวิศ พรประสิทธิ์แสง',
  role: 'ผู้ดูแลระบบสารสนเทศฝ่ายสหเวชศาสตร์',
  phone: '(กรอกเบอร์ติดต่อ)',
};

const DOWNTIME_LEVELS = [
  { color: 'var(--status-review-fg, #9A6800)', title: 'ระดับ 1 · เข้าใช้งานไม่ได้ชั่วคราว', when: 'ไม่เกิน 30 นาที',
    action: 'รอสักครู่แล้วลองใหม่ — ระบบเฝ้าระวังอัตโนมัติทุก 3 นาทีและกู้ตัวเองได้ในหลายกรณี ถ้าเกิน 30 นาทีให้แจ้งผู้ดูแล' },
  { color: 'var(--accent-600)', title: 'ระดับ 2 · ใช้งานไม่ได้ต่อเนื่อง', when: 'เกิน 30 นาที',
    action: 'เปิดชุดกู้ชีพออฟไลน์ที่ดาวน์โหลดเก็บไว้เพื่อใช้เอกสารต่อ · หัวหน้าหมวดแจ้งทีม · จดงานลงกระดาษไว้ก่อน แล้วบันทึกย้อนหลังเมื่อระบบกลับมา' },
  { color: 'var(--danger, #C42330)', title: 'ระดับ 3 · ข้อมูลเสียหาย', when: 'เอกสารหาย / ข้อมูลผิดเพี้ยน',
    action: 'หยุดแก้ไขข้อมูลทั้งหมดทันที (การแก้ต่อทำให้กู้คืนยากขึ้น) แล้วแจ้งผู้ดูแลระบบทันที — มีข้อมูลสำรองรายวันย้อนหลัง 30 วัน' },
];

const DOWNTIME_ROLES = [
  { who: 'เจ้าหน้าที่ผู้ใช้งาน', icon: 'Users', steps: [
    'ตรวจก่อนว่าเป็นที่เครื่องเราหรือระบบ — ลองเปิดเว็บอื่น หรือเปิดด้วยมือถือ',
    'ถ้าระบบล่มจริง เปิดชุดกู้ชีพออฟไลน์ที่หมวดงานเก็บไว้ ใช้เอกสารทำงานต่อ',
    'จดงานที่ทำระหว่างระบบล่มไว้ในกระดาษ เพื่อบันทึกย้อนหลัง',
    'แจ้งหัวหน้าหมวดงานจุดเดียว ไม่ต้องแจ้งซ้ำหลายคน',
  ] },
  { who: 'หัวหน้างาน / หัวหน้าหมวดงาน', icon: 'ShieldCheck', steps: [
    'แจ้งทีมทราบและสั่งให้ใช้ชุดกู้ชีพออฟไลน์แทน',
    'แจ้งผู้ดูแลระบบ ระบุเวลาที่เริ่มเปิดไม่ได้ · ข้อความที่ขึ้น · จำนวนคนที่เจอ',
    'เมื่อระบบกลับมา ตรวจว่าเอกสารและการลงนามรับทราบครบถ้วน',
  ] },
  { who: 'ผู้ดูแลระบบ', icon: 'Server', steps: [
    'ตรวจสถานะเซิร์ฟเวอร์และบริการทั้งหมด ดูบันทึกการเฝ้าระวังเพื่อหาเวลาที่เริ่มขัดข้อง',
    'ถ้าเป็นที่แอปพลิเคชัน — รีสตาร์ทเฉพาะบริการนั้น ไม่กระทบระบบอื่น',
    'ถ้าข้อมูลเสียหาย — กู้คืนจากข้อมูลสำรองรายวัน (ทดสอบกู้คืนแล้ว)',
    'แจ้งผลกลับหัวหน้างานทุกครั้งเมื่อระบบกลับมาใช้งานได้',
  ] },
];

function DowntimeSection() {
  const printCard = () => {
    document.body.classList.add('qms-printing-card');
    const cleanup = () => {
      document.body.classList.remove('qms-printing-card');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return (
    <Section n="05" title="แผนรับมือเมื่อระบบใช้งานไม่ได้ (Downtime Plan)">
      <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 18, maxWidth: '72ch' }}>
        งานห้องปฏิบัติการต้องดำเนินต่อได้เสมอแม้ระบบสารสนเทศขัดข้อง หัวข้อนี้กำหนดว่าแต่ละบทบาททำอะไร
        เพื่อให้บริการไม่หยุดชะงักและเอกสารที่ใช้อ้างอิงยังคงถูกต้อง
      </p>

      {/* คำเตือน + ปุ่มพิมพ์การ์ด */}
      <div className="qms-no-print" style={{
        display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap',
        background: 'var(--accent-50)', border: '1px solid var(--accent-400)',
        borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 24,
      }}>
        <Icon name="AlertTriangle" size={18} color="var(--accent-700)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ font: 'var(--text-sm)/1.65 var(--font-body)', color: 'var(--text-secondary)', margin: 0, flex: '1 1 300px', minWidth: 0 }}>
          <b style={{ color: 'var(--text-primary)' }}>คู่มือหน้านี้อ่านไม่ได้ตอนระบบล่ม</b> —
          กรุณาพิมพ์การ์ดฉุกเฉินด้านล่างติดไว้ที่จุดปฏิบัติงาน และดาวน์โหลด “ชุดกู้ชีพออฟไลน์” เก็บไว้ล่วงหน้าทุกเดือน
        </p>
        <Button size="sm" variant="secondary" onClick={printCard} iconLeft={<Icon name="Printer" size={15} />}>
          พิมพ์การ์ดฉุกเฉิน
        </Button>
      </div>

      {/* ระดับความรุนแรง */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '0 0 12px' }}>5.1 · ระดับความรุนแรงและการปฏิบัติ</div>
      <Card padding="none" style={{ marginBottom: 26 }}>
        {DOWNTIME_LEVELS.map((l, i) => (
          <div key={l.title} style={{ padding: '14px 16px', borderBottom: i === DOWNTIME_LEVELS.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ font: 'var(--fw-semibold) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{l.title}</span>
              <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{l.when}</span>
            </div>
            <div style={{ font: 'var(--text-xs)/1.7 var(--font-body)', color: 'var(--text-secondary)' }}>{l.action}</div>
          </div>
        ))}
      </Card>

      {/* แยกตามบทบาท */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '0 0 12px' }}>5.2 · ขั้นตอนปฏิบัติแยกตามบทบาท</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 26 }}>
        {DOWNTIME_ROLES.map((r, i) => (
          <div key={r.who} className="qms-rise-stagger" style={{
            '--i': i, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', padding: '16px 16px 18px', minWidth: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <Icon name={r.icon} size={17} color="var(--brand-700)" />
              <span style={{ font: 'var(--fw-semibold) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{r.who}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {r.steps.map((s) => (
                <div key={s} style={{ display: 'flex', gap: 8, font: 'var(--text-xs)/1.6 var(--font-body)', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--brand-600)', flexShrink: 0 }}>·</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* การ์ดฉุกเฉิน */}
      <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)', margin: '0 0 8px' }}>5.3 · การ์ดฉุกเฉินสำหรับติดหน้างาน</div>
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', marginBottom: 14, maxWidth: '70ch' }}>
        พิมพ์ติดไว้ที่จุดปฏิบัติงาน ห้องเวร และข้างเครื่องตรวจวิเคราะห์ — อ่านได้ทันทีโดยไม่ต้องเปิดคอมพิวเตอร์
      </p>

      <div id="qms-emergency-card" className="qms-emg">
        <div className="qms-emg-head">
          <div>
            <div className="qms-emg-kicker">แผนรับมือเมื่อระบบสารสนเทศใช้งานไม่ได้</div>
            <div className="qms-emg-title">ระบบเปิดไม่ได้ ทำอย่างไร?</div>
          </div>
          <div className="qms-emg-org">
            ห้องปฏิบัติการเทคนิคการแพทย์<br />
            <span>โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</span>
          </div>
        </div>

        <ol className="qms-emg-steps">
          <li><b>ตรวจก่อนว่าเป็นที่เราหรือระบบ</b><span>ลองเปิดเว็บอื่น หรือเปิดด้วยมือถือ/เครื่องอื่น ถ้าเปิดได้แสดงว่าเป็นที่เครื่องของเรา</span></li>
          <li><b>ถ้าระบบล่มจริง — เปิดชุดกู้ชีพออฟไลน์</b><span>ไฟล์ ZIP ที่หัวหน้าหมวดดาวน์โหลดเก็บไว้ เปิดไฟล์ index.html อ่านเอกสารได้โดยไม่ต้องมีอินเทอร์เน็ต</span></li>
          <li><b>จดงานลงกระดาษไว้ก่อน</b><span>สิ่งที่ทำระหว่างระบบล่ม ให้จดไว้แล้วบันทึกเข้าระบบย้อนหลังเมื่อกลับมาใช้งานได้</span></li>
          <li><b>แจ้งหัวหน้าหมวดงาน</b><span>แจ้งจุดเดียวพอ · ระบุเวลาที่เริ่มเปิดไม่ได้และข้อความที่ขึ้นบนหน้าจอ</span></li>
        </ol>

        <div className="qms-emg-warn">
          <b>ห้ามทำ:</b> ถ้าสงสัยว่าข้อมูลผิดเพี้ยนหรือเอกสารหาย — หยุดแก้ไขข้อมูลทั้งหมดทันที แล้วแจ้งผู้ดูแลระบบ (การแก้ต่อจะทำให้กู้คืนยากขึ้น)
        </div>

        <div className="qms-emg-contact">
          <div className="qms-emg-contact-l">ติดต่อผู้ดูแลระบบ</div>
          <div>
            <div style={{ font: 'var(--text-sm)/1.6 var(--font-body)' }}>{CONTACT.name} — {CONTACT.role}</div>
            <div className="qms-emg-phone">โทร. {CONTACT.phone}</div>
          </div>
        </div>

        <div className="qms-emg-foot">
          <span>สำรองข้อมูลอัตโนมัติทุกวัน · เฝ้าระวังสถานะทุก 3 นาที</span>
          <span>ISO 15189:2022</span>
        </div>
      </div>
    </Section>
  );
}

function ArchitectureSection() {
  return (
    <Section n="06" title="สถาปัตยกรรมระบบและการทำงานเบื้องหลัง (สำหรับ Programmer / เจ้าหน้าที่ IT)">
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
      {/* 05 — แผนรับมือเมื่อระบบใช้งานไม่ได้ (ทุกบทบาทต้องอ่าน) */}
      <DowntimeSection />

      <ArchitectureSection />
    </div>
  );
}

export default HelpScreen;
