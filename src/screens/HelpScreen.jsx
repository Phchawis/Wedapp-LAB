import { Card, DocTypeTag, StatusBadge } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS } from '../data/taxonomy.js';

export function HelpScreen() {
  const Q = QMS;

  const ShortcutKey = ({ keys, desc }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
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

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Intro Card */}
      <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="BookOpen" size={18} color="var(--brand-700)" /> คู่มือการควบคุมเอกสารตามมาตรฐาน ISO 15189</span>}>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', maxWidth: 800 }}>
          การควบคุมเอกสารในระบบบริหารคุณภาพห้องปฏิบัติการทางการแพทย์ (SOP Document Control) มีวัตถุประสงค์เพื่อรับประกันว่า บุคลากรผู้ตรวจวิเคราะห์จะเข้าถึงและใช้งานเอกสารคุณภาพฉบับที่เป็นปัจจุบันและผ่านการอนุมัติแล้วเท่านั้น โดยป้องกันการนำเอกสารที่ยกเลิกหรือไม่ได้รับการรับรองมาใช้งานโดยไม่ได้ตั้งใจ
        </p>
      </Card>

      {/* 2. Coding Standards & Lifecycle Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
        {/* Coding Standards */}
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="FileCode" size={16} color="var(--text-secondary)" /> รหัสรหัสเอกสารควบคุม (Coding Standards)</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)', marginBottom: 4 }}>
              เลขควบคุมเอกสารมีรูปแบบมาตรฐานคือ <code style={{ font: 'var(--type-code)', color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '2px 6px', borderRadius: 'var(--radius-xs)' }}>ประเภท-หมวดงาน-ลำดับ</code> เช่น <code style={{ font: 'var(--type-code)' }}>QM-CMTL-001</code>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {Q.DOC_TYPES.map((t) => (
                <div key={t.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)' }}>
                  <DocTypeTag type={t.code} />
                  <span style={{ font: 'var(--text-xs)/1.2 var(--font-body)', color: 'var(--text-primary)' }}>{t.th}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Document Lifecycle */}
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="ShieldCheck" size={16} color="var(--text-secondary)" /> วงจรสถานะเอกสาร (Document Lifecycle)</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)', marginBottom: 4 }}>
              สถานะควบคุมเอกสารคุณภาพมีสีสัญญาณและข้อกำหนดทางคุณภาพดังต่อไปนี้:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(Q.STATUS).map(([code, s]) => (
                <div key={code} style={{ display: 'flex', alignItems: 'start', gap: 12, padding: '8px 10px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}><StatusBadge status={code} size="sm" /></div>
                  <div style={{ font: 'var(--text-2xs)/1.3 var(--font-body)', color: 'var(--text-secondary)' }}>
                    {code === 'effective' && 'เอกสารฉบับล่าสุดที่ได้รับการประกาศใช้ บุคลากรต้องยึดถือปฏิบัติงาน ณ ปัจจุบัน'}
                    {code === 'review' && 'เอกสารอยู่ระหว่างขั้นตอนการทบทวนแก้ไข ให้บุคลากรใช้เวอร์ชันประกาศเดิมไปพลางก่อน'}
                    {code === 'approved' && 'เอกสารได้รับการลงนามอนุมัติความถูกต้องแล้ว รอการดำเนินการบันทึกประกาศใช้'}
                    {code === 'controlled' && 'สำเนาเอกสารที่ได้รับการควบคุมการแพร่กระจาย เพื่อใช้งานเฉพาะแผนกหรือจุดตรวจวิเคราะห์'}
                    {code === 'obsolete' && 'เอกสารที่ยกเลิกใช้งานแล้ว ห้ามนำมาอ้างอิงปฏิบัติงานจริง เก็บเพื่อประวัติศาสตร์คุณภาพเท่านั้น'}
                    {code === 'draft' && 'เอกสารร่างตั้งต้น อยู่ระหว่างเขียนหรือจัดเตรียมข้อมูลโดยผู้จัดเตรียม'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Roles and Permissions Matrix */}
      <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="UserCheck" size={16} color="var(--text-secondary)" /> ตารางสิทธิ์และการเข้าถึง (Role & Permissions Matrix)</span>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['การดำเนินการ', 'Creator (ผู้ดูแลระบบสูงสุด)', 'Admin (ผู้ควบคุมคุณภาพ)', 'User (เจ้าหน้าที่แล็บทั่วไป)'].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '12px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { act: 'ดู / ดาวน์โหลด / พิมพ์เอกสารคุณภาพ', c: true, a: true, u: true },
                { act: 'อัปเดต/นำเข้าไฟล์ Excel (.xlsx) แบบบันทึกแล็บ', c: true, a: true, u: true },
                { act: 'ลงทะเบียนนำเข้าเอกสารฉบับใหม่', c: true, a: true, u: false },
                { act: 'ลบหรือถอนเอกสารออกจากทะเบียน', c: true, a: true, u: false },
                { act: 'ทบทวนและกดอนุมัติ/ประกาศใช้ Workflow', c: true, a: true, u: false },
                { act: 'เพิ่ม / ลบ และสลับสิทธิ์เจ้าหน้าที่ผู้ใช้', c: true, a: true, u: false },
                { act: 'ดูบันทึกกิจกรรมความโปร่งใส (Audit Log)', c: true, a: true, u: false },
                { act: 'ปรับแต่งการตั้งค่าทางโครงสร้างระบบและเซิร์ฟเวอร์', c: true, a: false, u: false },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: i === 7 ? 'none' : '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', font: 'var(--fw-medium) var(--text-sm)/1.2 var(--font-body)', color: 'var(--text-primary)' }}>{row.act}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {row.c ? <span style={{ color: 'var(--green-700)', fontWeight: 'bold' }}>✓</span> : <span style={{ color: 'var(--slate-300)' }}>✕</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {row.a ? <span style={{ color: 'var(--green-700)', fontWeight: 'bold' }}>✓</span> : <span style={{ color: 'var(--slate-300)' }}>✕</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {row.u ? <span style={{ color: 'var(--green-700)', fontWeight: 'bold' }}>✓</span> : <span style={{ color: 'var(--slate-300)' }}>✕</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Keyboard Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Keyboard" size={16} color="var(--text-secondary)" /> คีย์ลัดนำทางด่วน (Keyboard Shortcuts)</span>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <ShortcutKey keys={['Alt', 'D']} desc="เปิดหน้า แผงควบคุม (Dashboard)" />
            <ShortcutKey keys={['Alt', 'R']} desc="เปิดหน้า ทะเบียนเอกสาร (Register)" />
            <ShortcutKey keys={['Alt', 'C']} desc="เปิดหน้า ลงทะเบียนเอกสารใหม่ (เฉพาะสิทธิ์ผู้ควบคุม)" />
            <ShortcutKey keys={['Alt', 'U']} desc="เปิดหน้า จัดการผู้ใช้งาน (เฉพาะสิทธิ์ผู้ควบคุม)" />
            <ShortcutKey keys={['Alt', 'L']} desc="เปิดหน้า บันทึกกิจกรรม Audit Logs (เฉพาะสิทธิ์ผู้ควบคุม)" />
          </div>
        </Card>

        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Printer" size={16} color="var(--text-secondary)" /> การพิมพ์และการสั่งจ่ายเอกสารควบคุม</span>}>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 10 }}>
            ระบบสนับสนุนการพิมพ์หน้าต่างเดี่ยวสำหรับเอกสารประเภท PDF เท่านั้น โดยจะมีลายน้ำควบคุมความปลอดภัยและประทับวันที่พิมพ์พร้อมชื่อผู้ทำรายการกำกับด้านล่างสุดของเอกสารเสมอ เพื่อป้องกันการถ่ายสำเนาโดยไม่ได้ควบคุม
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>
            <Icon name="ShieldCheck" size={15} color="var(--brand-600)" />
            จัดเก็บแบบอิเล็กทรอนิกส์ 100% ตามข้อกำหนด ISO 15189:2022
          </div>
        </Card>
      </div>
    </div>
  );
}

export default HelpScreen;
