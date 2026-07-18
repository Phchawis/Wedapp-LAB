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
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
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

  const STATUS_DESC = {
    effective: 'เอกสารฉบับล่าสุดที่ได้รับการประกาศใช้ บุคลากรต้องยึดถือปฏิบัติงาน ณ ปัจจุบัน',
    review: 'เอกสารอยู่ระหว่างขั้นตอนการทบทวนแก้ไข ให้บุคลากรใช้เวอร์ชันประกาศเดิมไปพลางก่อน',
    approved: 'เอกสารได้รับการลงนามอนุมัติความถูกต้องแล้ว รอการดำเนินการบันทึกประกาศใช้',
    controlled: 'สำเนาเอกสารที่ได้รับการควบคุมการแพร่กระจาย เพื่อใช้งานเฉพาะแผนกหรือจุดตรวจวิเคราะห์',
    obsolete: 'เอกสารที่ยกเลิกใช้งานแล้ว ห้ามนำมาอ้างอิงปฏิบัติงานจริง เก็บเพื่อประวัติศาสตร์คุณภาพเท่านั้น',
    draft: 'เอกสารร่างตั้งต้น อยู่ระหว่างเขียนหรือจัดเตรียมข้อมูลโดยผู้จัดเตรียม',
  };

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 4 }}>
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

      {/* 02 — Permissions matrix (real tabular data keeps the register's own table treatment) */}
      <Section n="02" title="ตารางสิทธิ์และการเข้าถึง (Role & Permissions Matrix)">
        <Card padding="none">
          <PermMatrix />
        </Card>
      </Section>

      {/* 03 — Shortcuts + printing */}
      <Section n="03" title="คีย์ลัดนำทางด่วนและการพิมพ์เอกสาร">
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
    </div>
  );
}

export default HelpScreen;
