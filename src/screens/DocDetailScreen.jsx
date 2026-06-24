import { useRef, useState } from 'react';
import { Button, StatusBadge, DocTypeTag, Card, Alert } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { FILE_META } from '../components/FileChip.jsx';
import { useNarrow } from '../hooks/useNarrow.js';
import { QMS } from '../data/taxonomy.js';
import { can } from '../auth/users.js';
import { LOG_ACTIONS } from '../auth/activityLog.js';
import { api } from '../api.js';
// printAttachment โหลดแบบ dynamic เฉพาะตอนสั่งพิมพ์ (xlsx/mammoth หนัก ไม่ดึงมาตอนเปิดแอป)

const seal = '/lab-seal.png';
const today = () => new Date().toISOString().slice(0, 10); // วันที่จริงตอนดำเนินการ workflow

function fmtTs(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ป้าย/ค่าในแถบหัวเอกสารควบคุม — label ใช้ secondary ให้คอนทราสต์ผ่าน AA บนพื้น slate-50
function Field({ k, v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ font: 'var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</span>
      <span style={{ font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{v}</span>
    </div>
  );
}

/* DocDetailScreen — controlled-document view: header band, attachments,
   revision history, and permission-gated workflow / export actions. */
export function DocDetailScreen({ doc, role, onBack, onUpdate, onUpdateFile, onDelete }) {
  const Q = QMS;
  const catObj = Q.WORK_CATEGORIES.find((c) => c.code === doc.cat);
  const typeObj = Q.DOC_TYPES.find((t) => t.code === doc.type);
  const narrow = useNarrow(900);

  const canEdit = can(role, 'docs:edit');
  const canDelete = can(role, 'docs:delete');
  const attachments = doc.attachments || [];
  const history = doc.history || [];

  // การดำเนินการ workflow — เปลี่ยนสถานะเอกสาร (ส่ง patch + action ให้ backend บันทึก log)
  const publish = () => onUpdate(doc.no, { status: 'effective', updated: today(), action: 'doc:publish' });
  const recordEdit = () => onUpdate(doc.no, { rev: doc.rev + 1, status: 'review', updated: today(), action: 'doc:edit' });
  const obsolete = () => onUpdate(doc.no, { status: 'obsolete', updated: today(), action: 'doc:obsolete' });
  const removeDoc = () => {
    if (window.confirm(`ยืนยันการลบเอกสาร ${doc.no} ออกจากทะเบียน?`)) onDelete(doc);
  };

  // เปิด/ดาวน์โหลดไฟล์แนบจริงจาก backend
  const openAttachment = async (att, download) => {
    if (att.kind === 'url') { window.open(att.url, '_blank', 'noopener'); return; }
    try {
      const blob = await api.downloadAttachment(att.id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url; a.download = att.name; a.click();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      window.alert(e.message || 'เปิดไฟล์ไม่สำเร็จ');
    }
  };

  // ไฟล์จริงที่อัปโหลด (ไม่นับลิงก์)
  const fileAtts = attachments.filter((a) => a.kind !== 'url');
  // เฉพาะไฟล์ PDF — รองรับการพิมพ์ตรงจากระบบ
  const pdfAtts = fileAtts.filter((a) => a.kind === 'pdf');

  // ดาวน์โหลดไฟล์เอกสารจริงทั้งหมด
  const downloadDoc = async () => {
    if (fileAtts.length === 0) {
      window.alert('เอกสารนี้ยังไม่มีไฟล์แนบให้ดาวน์โหลด');
      return;
    }
    for (const a of fileAtts) {
      await openAttachment(a, true);
    }
  };

  // พิมพ์เอกสาร — พิมพ์เฉพาะไฟล์ PDF (ไฟล์แรก)
  const printDoc = async () => {
    if (pdfAtts.length === 0) {
      window.alert('เอกสารนี้ไม่มีไฟล์ PDF ให้พิมพ์');
      return;
    }
    await printOne(pdfAtts[0]);
  };

  const printOne = async (att) => {
    try {
      const { printAttachment } = await import('../print.js');
      await printAttachment(att);
    } catch (e) {
      window.alert(e.message || 'พิมพ์ไม่สำเร็จ');
    }
  };

  // อัปเดตไฟล์เป็นเวอร์ชันใหม่ — เลือกไฟล์ใหม่แทนที่ไฟล์เดิม (เพิ่มเลขแก้ไขอัตโนมัติ)
  // สิทธิ์: Creator อัปเดตได้ทุกชนิด; Admin/User อัปเดตได้เฉพาะไฟล์ Excel
  const isCreator = role === 'creator';
  const EXCEL_EXT = ['xls', 'xlsx', 'xlsm', 'csv'];
  const canUpdateFile = (att) => att.kind !== 'url' && onUpdateFile && (isCreator || att.kind === 'excel');
  const acceptTypes = isCreator
    ? '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'
    : '.xls,.xlsx,.xlsm,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

  const fileInputRef = useRef(null);
  const pendingAttId = useRef(null);
  const [updatingId, setUpdatingId] = useState(null);

  const askUpdateFile = (att) => {
    pendingAttId.current = att.id;
    if (fileInputRef.current) fileInputRef.current.click();
  };
  const onFilePicked = async (e) => {
    const file = e.target.files?.[0];
    const attId = pendingAttId.current;
    e.target.value = '';
    if (!file || !attId || !onUpdateFile) return;
    // Admin/User อัปโหลดได้เฉพาะ Excel — กันไว้ตั้งแต่ฝั่งหน้าเว็บ (backend ตรวจซ้ำอีกชั้น)
    if (!isCreator) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!EXCEL_EXT.includes(ext)) {
        window.alert('บทบาทของคุณอัปเดตได้เฉพาะไฟล์ Excel (.xlsx, .xls, .csv) เท่านั้น');
        return;
      }
    }
    if (!window.confirm('แทนที่ไฟล์เดิมด้วยไฟล์ใหม่นี้? ระบบจะเพิ่มเลขแก้ไข (rev) และบันทึกประวัติให้อัตโนมัติ')) return;
    setUpdatingId(attId);
    try {
      await onUpdateFile(doc.no, attId, file);
    } catch (err) {
      window.alert(err.message || 'อัปเดตไฟล์ไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="qms-rise" style={{ maxWidth: 1080 }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', font: 'var(--type-ui)', padding: '6px 8px', margin: '0 -8px 12px', minHeight: 40 }}>
        <Icon name="ArrowLeft" size={16} /> กลับสู่ทะเบียนเอกสาร
      </button>

      {/* input ซ่อนสำหรับเลือกไฟล์ใหม่ตอนอัปเดตเวอร์ชัน */}
      <input ref={fileInputRef} type="file" onChange={onFilePicked} accept={acceptTypes} aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />

      {doc.status === 'review' && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="warning" title="เอกสารฉบับนี้อยู่ระหว่างทบทวน" icon={<Icon name="AlertTriangle" size={18} color="var(--amber-700)" />}>
            กรุณาใช้เอกสารฉบับที่ประกาศใช้ล่าสุดจนกว่าการทบทวนจะแล้วเสร็จ
          </Alert>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controlled-document header band */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', borderBottom: '1.5px solid var(--brand-700)' }}>
              <div style={{ background: 'var(--brand-50)', display: 'grid', placeItems: 'center', borderRight: '1px solid var(--border-subtle)' }}>
                <img src={seal} alt="ตราโรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ" style={{ width: 46, height: 46, objectFit: 'contain' }} />
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <DocTypeTag type={doc.type} />
                  <StatusBadge status={doc.status} size="sm" />
                </div>
                <h1 style={{ font: 'var(--fw-bold) var(--text-2xl)/1.2 var(--font-display)', color: 'var(--text-primary)', marginBottom: 4 }}>{doc.th}</h1>
                <div style={{ font: 'var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-secondary)' }}>{typeObj.th} · หมวดงาน{catObj.th}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, padding: '16px 18px', background: 'var(--slate-50)' }}>
              <Field k="เลขที่เอกสาร" v={doc.no} />
              <Field k="แก้ไขครั้งที่" v={String(doc.rev).padStart(2, '0')} />
              <Field k="ประกาศใช้" v={doc.updated} />
              <Field k="ผู้รับผิดชอบ" v={doc.owner} />
              <Field k="ระยะเวลาจัดเก็บ" v={doc.retention ? doc.retention + ' ปี' : '—'} />
            </div>
          </div>

          {/* Attachments — ไฟล์จริงที่อัปโหลด + ลิงก์ */}
          <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Paperclip" size={16} color="var(--text-secondary)" /> ไฟล์แนบเอกสาร</span>}>
            {attachments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {attachments.map((att) => {
                  const m = FILE_META[att.kind] || { label: 'ไฟล์', icon: 'FileText', c: 'var(--slate-600)', bg: 'var(--slate-100)' };
                  const isUrl = att.kind === 'url';
                  return (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: m.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name={m.icon} size={19} color={m.c} sw={2} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: 'var(--fw-semibold) var(--text-base)/1.2 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                        <div style={{ font: 'var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {isUrl ? 'ลิงก์ภายนอก' : `${m.label}${att.size ? ' · ' + (att.size / 1024).toFixed(0) + ' KB' : ''}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {isUrl ? (
                          <Button variant="secondary" size="sm" onClick={() => openAttachment(att)} iconLeft={<Icon name="ExternalLink" size={15} color="var(--brand-700)" />}>เปิดลิงก์</Button>
                        ) : (
                          <>
                            {att.kind === 'pdf' && <Button variant="secondary" size="sm" onClick={() => openAttachment(att, false)} iconLeft={<Icon name="Eye" size={15} color="var(--brand-700)" />}>เปิดดู</Button>}
                            {att.kind === 'pdf' && <Button variant="secondary" size="sm" onClick={() => printOne(att)} iconLeft={<Icon name="Printer" size={15} color="var(--brand-700)" />}>พิมพ์</Button>}
                            <Button variant="secondary" size="sm" onClick={() => openAttachment(att, true)} iconLeft={<Icon name="Download" size={15} color="var(--brand-700)" />}>ดาวน์โหลด</Button>
                            {canUpdateFile(att) && <Button variant="secondary" size="sm" disabled={updatingId === att.id} onClick={() => askUpdateFile(att)} iconLeft={<Icon name="Upload" size={15} color="var(--brand-700)" />}>{updatingId === att.id ? 'กำลังอัปเดต…' : 'อัปเดตไฟล์'}</Button>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(doc.files || []).map((f) => {
                    const m = FILE_META[f] || { label: f, c: 'var(--slate-600)', bg: 'var(--slate-100)', icon: 'FileText' };
                    return (
                      <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: m.bg, color: m.c, font: 'var(--fw-semibold) var(--text-xs)/1 var(--font-body)' }}>
                        <Icon name={m.icon} size={14} color={m.c} sw={2.2} /> {m.label}
                      </span>
                    );
                  })}
                </div>
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>เอกสารตัวอย่าง — ยังไม่มีไฟล์จริงในระบบ (ลงทะเบียนใหม่เพื่อแนบไฟล์)</div>
              </div>
            )}
          </Card>

          {/* Activity history — สร้างจากบันทึกกิจกรรมจริงของเอกสารนี้ */}
          <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="History" size={16} color="var(--text-secondary)" /> ประวัติการดำเนินการ</span>}>
            {history.length === 0 ? (
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>ยังไม่มีประวัติการดำเนินการสำหรับเอกสารนี้</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {history.map((h, i) => {
                  const meta = LOG_ACTIONS[h.action] || { th: h.action, icon: 'History', c: 'var(--text-secondary)' };
                  return (
                    <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i === history.length - 1 ? 0 : 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: 30, height: 30, borderRadius: '50%', background: i === 0 ? 'var(--brand-700)' : 'var(--slate-100)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon name={meta.icon} size={15} color={i === 0 ? 'var(--white)' : 'var(--text-secondary)'} />
                        </span>
                        {i !== history.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--border-default)', marginTop: 4 }} />}
                      </div>
                      <div style={{ paddingBottom: 4 }}>
                        <div style={{ font: 'var(--fw-medium) var(--text-base)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{meta.th}</div>
                        <div style={{ font: 'var(--text-2xs)/1.4 var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2 }}>{fmtTs(h.ts)} · {h.by}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 'calc(var(--topbar-height) + 16px)' }}>
          {/* Export — available to every role */}
          <Card padding="md">
            <div role="heading" aria-level={2} style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 12 }}>ดาวน์โหลด / พิมพ์</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="secondary" block size="md" onClick={downloadDoc} iconLeft={<Icon name="Download" size={15} color="var(--brand-700)" />}>ดาวน์โหลดเอกสาร</Button>
              {pdfAtts.length > 0 && <Button variant="secondary" block size="md" onClick={printDoc} iconLeft={<Icon name="Printer" size={15} color="var(--brand-700)" />}>พิมพ์เอกสาร</Button>}
            </div>
          </Card>

          {/* Workflow — Creator (docs:edit) only */}
          {canEdit && (
            <Card padding="md">
              <div role="heading" aria-level={2} style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 12 }}>การดำเนินการ (Workflow)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button variant="secondary" block size="md" onClick={publish} disabled={doc.status === 'effective'} iconLeft={<Icon name="Megaphone" size={15} color="var(--brand-700)" />}>บันทึกประกาศใช้</Button>
                <Button variant="secondary" block size="md" onClick={recordEdit} disabled={doc.status === 'obsolete'} iconLeft={<Icon name="PencilLine" size={15} color="var(--brand-700)" />}>บันทึกแก้ไข</Button>
                <Button variant="secondary" block size="md" onClick={obsolete} disabled={doc.status === 'obsolete'} iconLeft={<Icon name="Ban" size={15} color="var(--brand-700)" />}>ยกเลิกการใช้งาน</Button>
              </div>
            </Card>
          )}

          {/* Delete — Creator & Admin (docs:delete) */}
          {canDelete && (
            <Card padding="md">
              <div role="heading" aria-level={2} style={{ font: 'var(--fw-semibold) var(--text-sm)/1 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 12 }}>จัดการเอกสาร</div>
              <Button variant="danger" block size="md" onClick={removeDoc} iconLeft={<Icon name="Trash2" size={15} color="#fff" />}>ลบเอกสารออกจากทะเบียน</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocDetailScreen;
