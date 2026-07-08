import { useEffect, useRef, useState } from 'react';
import { Button, StatusBadge, DocTypeTag, Card, Alert, Tabs } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { FILE_META } from '../components/FileChip.jsx';
import { useNarrow } from '../hooks/useNarrow.js';
import { QMS } from '../data/taxonomy.js';
import { can } from '../auth/users.js';
import { LOG_ACTIONS } from '../auth/activityLog.js';
import { api } from '../api.js';

// Line-by-line diffing algorithm for revision comparisons
function diffLines(oldStr, newStr) {
  const oldLines = (oldStr || '').split('\n');
  const newLines = (newStr || '').split('\n');
  const diffResult = [];
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        diffResult.push({ type: 'normal', text: oldLines[i] });
        i++; j++;
      } else {
        let foundMatch = false;
        for (let k = 1; k < 5; k++) {
          if (i + k < oldLines.length && oldLines[i + k] === newLines[j]) {
            for (let d = 0; d < k; d++) {
              diffResult.push({ type: 'del', text: oldLines[i + d] });
            }
            i += k;
            foundMatch = true;
            break;
          }
          if (j + k < newLines.length && oldLines[i] === newLines[j + k]) {
            for (let a = 0; a < k; a++) {
              diffResult.push({ type: 'add', text: newLines[j + a] });
            }
            j += k;
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          diffResult.push({ type: 'del', text: oldLines[i] });
          diffResult.push({ type: 'add', text: newLines[j] });
          i++; j++;
        }
      }
    } else if (i < oldLines.length) {
      diffResult.push({ type: 'del', text: oldLines[i] });
      i++;
    } else if (j < newLines.length) {
      diffResult.push({ type: 'add', text: newLines[j] });
      j++;
    }
  }
  return diffResult;
}

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

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [loadingPreviewId, setLoadingPreviewId] = useState(null);

  const [activeTab, setActiveTab] = useState('detail');
  const [historyList, setHistoryList] = useState([]);
  const [acks, setAcks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAcks, setLoadingAcks] = useState(false);
  const [ackPassword, setAckPassword] = useState('');
  const [ackChecked, setAckChecked] = useState(false);
  const [ackError, setAckError] = useState('');
  const [ackSuccess, setAckSuccess] = useState(false);
  const [leftRev, setLeftRev] = useState('');
  const [rightRev, setRightRev] = useState('');
  const [diffMode, setDiffMode] = useState('unified');

  const fetchHistoryAndAcks = async () => {
    setLoadingHistory(true);
    setLoadingAcks(true);
    try {
      const hist = await api.getDocumentHistory(doc.no);
      setHistoryList(hist);
      if (hist.length > 1) {
        setLeftRev(String(hist[1].rev));
        setRightRev(String(hist[0].rev));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }

    try {
      const acknowledgments = await api.getDocumentAcknowledgments(doc.no);
      setAcks(acknowledgments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAcks(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndAcks();
    setAckPassword('');
    setAckChecked(false);
    setAckError('');
    setAckSuccess(false);
  }, [doc.no]);

  // Clean up preview Object URL on close and unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // การดำเนินการ workflow — เปลี่ยนสถานะเอกสาร (ส่ง patch + action ให้ backend บันทึก log)
  // การดำเนินการ workflow — เปลี่ยนสถานะเอกสาร (ส่ง patch + action ให้ backend บันทึก log)
  const publish = () => {
    if (window.confirm('ยืนยันการประกาศใช้เอกสารคุณภาพนี้เป็นทางการ? ระบบจะเปิดให้เจ้าหน้าที่ปฏิบัติงานทุกคนเข้าถึงได้ในเครื่องทันที')) {
      onUpdate(doc.no, { status: 'effective', updated: today(), action: 'doc:publish' });
    }
  };
  const recordEdit = () => {
    if (window.confirm('ยืนยันการเริ่มขั้นตอนทบทวน/แก้ไขเอกสารนี้? ระบบจะเพิ่มรุ่นแก้ไข (revision) และสลับสถานะเป็น "รอทบทวน"')) {
      onUpdate(doc.no, { rev: doc.rev + 1, status: 'review', updated: today(), action: 'doc:edit' });
    }
  };
  const obsolete = () => {
    if (window.confirm('คำเตือนความปลอดภัย: ยืนยันการยกเลิกการใช้งานเอกสารฉบับนี้? เจ้าหน้าที่จะไม่สามารถเข้าถึงสำหรับปฏิบัติงานจริงได้ และจะเปลี่ยนสถานะเป็นยกเลิกถาวร')) {
      onUpdate(doc.no, { status: 'obsolete', updated: today(), action: 'doc:obsolete' });
    }
  };

  const removeDoc = () => {
    if (window.confirm(`ยืนยันการลบเอกสาร ${doc.no} ออกจากทะเบียน?`)) onDelete(doc);
  };

  // เปิด/ดาวน์โหลดไฟล์แนบจริงจาก backend
  const openAttachment = async (att, download) => {
    if (att.kind === 'url') { window.open(att.url, '_blank', 'noopener'); return; }

    const isPdf = att.kind === 'pdf';
    if (!download && isPdf) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setLoadingPreviewId(att.id);
      try {
        const blob = await api.downloadAttachment(att.id);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewName(att.name);
      } catch (e) {
        window.alert(e.message || 'โหลดตัวอย่างไฟล์ไม่สำเร็จ');
      } finally {
        setLoadingPreviewId(null);
      }
      return;
    }

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
    
    if (file.size > 25 * 1024 * 1024) {
      window.alert('ขนาดไฟล์เกินกำหนด (สูงสุด 25 MB ต่อไฟล์)');
      return;
    }

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

  // คำนวณการแจ้งเตือนคุณภาพระบบควบคุมเอกสาร (ISO 15189 compliance audit warnings)
  const alerts = [];
  if (doc.status === 'effective') {
    const updatedDate = new Date(doc.updated);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (updatedDate < oneYearAgo) {
      alerts.push({
        id: 'review-overdue',
        tone: 'danger',
        title: 'เกินกำหนดทบทวนประจำปี (ISO 15189 Overdue)',
        desc: `เอกสารนี้ประกาศใช้หรือทบทวนครั้งล่าสุดเมื่อ ${doc.updated} ซึ่งเกินกำหนดระยะเวลาทบทวนคุณภาพครบรอบ 1 ปีแล้ว กรุณาทำการทบทวนและปรับปรุงเวอร์ชัน`,
        icon: 'AlertTriangle',
      });
    } else {
      const elevenMonthsAgo = new Date();
      elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
      if (updatedDate < elevenMonthsAgo) {
        alerts.push({
          id: 'review-approaching',
          tone: 'warning',
          title: 'ใกล้ครบกำหนดทบทวนประจำปี',
          desc: 'เอกสาร�        {/* Main column */}
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

          {/* Inline Tab bar */}
          <div style={{ marginBottom: 4 }}>
            <Tabs
              active={activeTab}
              onChange={setActiveTab}
              items={[
                { code: 'detail', label: 'ข้อมูลและประวัติ' },
                { code: 'diff', label: 'เปรียบเทียบเวอร์ชัน' },
                { code: 'training', label: `การฝึกอบรม & รับทราบ (${acks.length})` },
              ]}
            />
          </div>

          {activeTab === 'detail' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Inline PDF Viewer */}
              {previewUrl && (
                <Card
                  padding="none"
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Icon name="FileText" size={16} color="var(--brand-700)" />
                        <span style={{ font: 'var(--type-card-title)', color: 'var(--text-primary)' }}>แสดงเอกสาร: {previewName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                          setPreviewName('');
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--slate-100)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Icon name="X" size={18} />
                      </button>
                    </div>
                  }
                >
                  <div style={{ background: 'var(--slate-100)', display: 'grid', placeItems: 'center', height: 600 }}>
                    <iframe
                      src={`${previewUrl}#toolbar=0`}
                      title={previewName}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                </Card>
              )}

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
                                {att.kind === 'pdf' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={loadingPreviewId === att.id}
                                    onClick={() => openAttachment(att, false)}
                                    iconLeft={<Icon name={loadingPreviewId === att.id ? "Loader2" : "Eye"} size={15} color="var(--brand-700)" className={loadingPreviewId === att.id ? "qms-spin" : ""} />}
                                  >
                                    {loadingPreviewId === att.id ? 'กำลังโหลด…' : 'เปิดดู'}
                                  </Button>
                                )}
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
          )}

          {activeTab === 'diff' && (
            <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="History" size={16} color="var(--text-secondary)" /> เปรียบเทียบสองเวอร์ชัน (Version Diff)</span>}>
              {historyList.length <= 1 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Icon name="AlertCircle" size={28} color="var(--slate-300)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ font: 'var(--type-body)' }}>เอกสารอยู่ในรุ่นแรก (ไม่มีเวอร์ชันอื่นสำหรับเปรียบเทียบ)</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Selectors */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>เปรียบเทียบ:</span>
                      <select
                        value={leftRev}
                        onChange={(e) => setLeftRev(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', font: 'var(--text-xs) var(--font-mono)' }}
                      >
                        {historyList.map(h => (
                          <option key={h.rev} value={h.rev}>Rev {String(h.rev).padStart(2, '0')} ({h.updated})</option>
                        ))}
                      </select>
                      <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>กับ</span>
                      <select
                        value={rightRev}
                        onChange={(e) => setRightRev(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', font: 'var(--text-xs) var(--font-mono)' }}
                      >
                        {historyList.map(h => (
                          <option key={h.rev} value={h.rev}>Rev {String(h.rev).padStart(2, '0')} ({h.updated})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        size="sm"
                        variant={diffMode === 'unified' ? 'primary' : 'secondary'}
                        onClick={() => setDiffMode('unified')}
                      >
                        Unified
                      </Button>
                      <Button
                        size="sm"
                        variant={diffMode === 'split' ? 'primary' : 'secondary'}
                        onClick={() => setDiffMode('split')}
                      >
                        Split (เคียงข้าง)
                      </Button>
                    </div>
                  </div>

                  {/* Render Diff Tree */}
                  {(() => {
                    const leftDoc = historyList.find(h => String(h.rev) === leftRev);
                    const rightDoc = historyList.find(h => String(h.rev) === rightRev);
                    if (!leftDoc || !rightDoc) return null;
                    const diffTree = diffLines(leftDoc.content, rightDoc.content);

                    if (diffMode === 'unified') {
                      return (
                        <div className="qms-numeric" style={{ font: '12px/1.6 var(--font-mono)', background: 'var(--slate-900)', color: 'var(--slate-200)', padding: 14, borderRadius: 'var(--radius-md)', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 500 }}>
                          {diffTree.map((line, idx) => {
                            let bg = 'transparent';
                            let cl = 'inherit';
                            let prefix = '  ';
                            if (line.type === 'add') { bg = '#163625'; cl = '#4ade80'; prefix = '+ '; }
                            else if (line.type === 'del') { bg = '#4c1d24'; cl = '#f87171'; prefix = '- '; }
                            return (
                              <div key={idx} style={{ background: bg, color: cl, padding: '2px 6px', borderRadius: 2 }}>
                                {prefix}{line.text}
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div style={{ font: '11px/1.5 var(--font-mono)', background: 'var(--slate-50)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflowX: 'auto', maxHeight: 500 }}>
                            <div style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>ฉบับ Rev {String(leftRev).padStart(2, '0')}</div>
                            {diffTree.map((line, idx) => {
                              if (line.type === 'add') return <div key={idx} style={{ height: 18, background: 'var(--slate-100)' }} />;
                              return (
                                <div key={idx} style={{ color: line.type === 'del' ? 'var(--red-700)' : 'var(--text-primary)', background: line.type === 'del' ? 'var(--red-50)' : 'transparent', padding: '1px 4px' }}>
                                  {line.text || ' '}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ font: '11px/1.5 var(--font-mono)', background: 'var(--slate-50)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflowX: 'auto', maxHeight: 500 }}>
                            <div style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>ฉบับ Rev {String(rightRev).padStart(2, '0')}</div>
                            {diffTree.map((line, idx) => {
                              if (line.type === 'del') return <div key={idx} style={{ height: 18, background: 'var(--slate-100)' }} />;
                              return (
                                <div key={idx} style={{ color: line.type === 'add' ? 'var(--green-700)' : 'var(--text-primary)', background: line.type === 'add' ? 'var(--green-50)' : 'transparent', padding: '1px 4px' }}>
                                  {line.text || ' '}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'training' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Training Form / Compliance State */}
              <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="ShieldCheck" size={16} color="var(--brand-700)" /> ลงชื่อยอมรับเพื่อฝึกอบรม (SOP Training Sign-off)</span>}>
                {(() => {
                  const currentUser = api.decodeToken();
                  const alreadySigned = acks.some(a => a.username === currentUser?.username && a.version === String(doc.rev));
                  
                  if (alreadySigned) {
                    const myAck = acks.find(a => a.username === currentUser?.username && a.version === String(doc.rev));
<<<<<<< HEAD
=======
                    return (
                      <Alert tone="success" title="คุณได้ลงชื่อรับทราบเอกสารเวอร์ชันนี้แล้ว" icon={<Icon name="CircleCheck" size={18} color="var(--green-700)" />}>
                        ลงนามเมื่อ: {fmtTs(myAck.ts)} (สำหรับรุ่นแก้ไขครั้งที่ {myAck.version})
                      </Alert>
                    );
                  }

                  return (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!ackChecked) { setAckError('กรุณาคลิกเลือกยอมรับข้อตกลงเพื่อยืนยัน'); return; }
                        if (!ackPassword) { setAckError('กรุณากรอกรหัสผ่านเพื่อลงนาม'); return; }
                        setAckError('');
                        try {
                          const updatedAcks = await api.acknowledgeDocument(doc.no, ackPassword);
                          setAcks(updatedAcks);
                          setAckSuccess(true);
                          setAckPassword('');
                          setAckChecked(false);
                          setTimeout(() => setAckSuccess(false), 3000);
                        } catch (err) {
                          setAckError(err.message || 'รหัสผ่านยืนยันไม่ถูกต้อง');
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                      {ackError && <Alert tone="danger" title="ข้อผิดพลาดในการลงนาม" icon={<Icon name="AlertTriangle" size={18} color="var(--red-700)" />}>{ackError}</Alert>}
                      {ackSuccess && <Alert tone="success" title="ลงนามสำเร็จ" icon={<Icon name="CircleCheck" size={18} color="var(--green-700)" />}>ระบบได้บันทึกประวัติการฝึกอบรมของคุณเรียบร้อยแล้ว</Alert>}

                      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', font: 'var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={ackChecked}
                          onChange={(e) => setAckChecked(e.target.checked)}
                          style={{ marginTop: 3 }}
                        />
                        <span>ข้าพเจ้าขอรับรองว่าได้อ่าน ทำความเข้าใจ และผ่านการฝึกอบรมขั้นตอนตามวิธีปฏิบัติงานฉบับนี้แล้ว และตกลงที่จะปฏิบัติตามมาตรฐานงานเทคนิคการแพทย์อย่างเคร่งครัด</span>
                      </label>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200, flex: 1 }}>
                          <span style={{ font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)' }}>ยืนยันรหัสผ่านเพื่อบันทึกลายมือชื่ออิเล็กทรอนิกส์</span>
                          <input
                            type="password"
                            placeholder="กรอกรหัสผ่านของคุณ"
                            value={ackPassword}
                            onChange={(e) => setAckPassword(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', font: 'var(--text-sm)' }}
                          />
                        </div>
                        <Button type="submit" variant="primary">บันทึกการรับทราบ</Button>
                      </div>
                    </form>
                  );
                })()}
              </Card>

              {/* Logs Table */}
              <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="List" size={16} color="var(--text-secondary)" /> รายนามผู้ลงชื่อรับทราบ (Acknowledgment Log)</span>}>
                {acks.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', font: 'var(--type-body)' }}>
                    ยังไม่มีบุคลากรลงชื่อรับทราบเอกสารรุ่นปัจจุบัน
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                        {['เวลาลงนาม', 'ชื่อ-นามสกุล', 'บทบาท/แผนก', 'เวอร์ชัน'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', padding: '10px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {acks.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="qms-numeric" style={{ padding: '10px 16px', font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{fmtTs(a.ts)}</td>
                          <td style={{ padding: '10px 16px', font: 'var(--fw-medium) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)' }}>{a.name}</td>
                          <td style={{ padding: '10px 16px', font: 'var(--text-xs)/1 var(--font-body)', color: 'var(--text-secondary)' }}>{a.role}</td>
                          <td style={{ padding: '10px 16px', font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>v{a.version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}
        </div>��' : 'เปิดดู'}
                              </Button>
                            )}
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
>>>>>>> e00b64d40834663123304c8f464e38bde69ade53
                    return (
                      <Alert tone="success" title="คุณได้ลงชื่อรับทราบเอกสารเวอร์ชันนี้แล้ว" icon={<Icon name="CircleCheck" size={18} color="var(--green-700)" />}>
                        ลงนามเมื่อ: {fmtTs(myAck.ts)} (สำหรับรุ่นแก้ไขครั้งที่ {myAck.version})
                      </Alert>
                    );
                  }

                  return (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!ackChecked) { setAckError('กรุณาคลิกเลือกยอมรับข้อตกลงเพื่อยืนยัน'); return; }
                        if (!ackPassword) { setAckError('กรุณากรอกรหัสผ่านเพื่อลงนาม'); return; }
                        setAckError('');
                        try {
                          const updatedAcks = await api.acknowledgeDocument(doc.no, ackPassword);
                          setAcks(updatedAcks);
                          setAckSuccess(true);
                          setAckPassword('');
                          setAckChecked(false);
                          setTimeout(() => setAckSuccess(false), 3000);
                        } catch (err) {
                          setAckError(err.message || 'รหัสผ่านยืนยันไม่ถูกต้อง');
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                      {ackError && <Alert tone="danger" title="ข้อผิดพลาดในการลงนาม" icon={<Icon name="AlertTriangle" size={18} color="var(--red-700)" />}>{ackError}</Alert>}
                      {ackSuccess && <Alert tone="success" title="ลงนามสำเร็จ" icon={<Icon name="CircleCheck" size={18} color="var(--green-700)" />}>ระบบได้บันทึกประวัติการฝึกอบรมของคุณเรียบร้อยแล้ว</Alert>}

                      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', font: 'var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={ackChecked}
                          onChange={(e) => setAckChecked(e.target.checked)}
                          style={{ marginTop: 3 }}
                        />
                        <span>ข้าพเจ้าขอรับรองว่าได้อ่าน ทำความเข้าใจ และผ่านการฝึกอบรมขั้นตอนตามวิธีปฏิบัติงานฉบับนี้แล้ว และตกลงที่จะปฏิบัติตามมาตรฐานงานเทคนิคการแพทย์อย่างเคร่งครัด</span>
                      </label>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200, flex: 1 }}>
                          <span style={{ font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)' }}>ยืนยันรหัสผ่านเพื่อบันทึกลายมือชื่ออิเล็กทรอนิกส์</span>
                          <input
                            type="password"
                            placeholder="กรอกรหัสผ่านของคุณ"
                            value={ackPassword}
                            onChange={(e) => setAckPassword(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', font: 'var(--text-sm)' }}
                          />
                        </div>
                        <Button type="submit" variant="primary">บันทึกการรับทราบ</Button>
                      </div>
                    </form>
                  );
                })()}
              </Card>

              {/* Logs Table */}
              <Card padding="none" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="List" size={16} color="var(--text-secondary)" /> รายนามผู้ลงชื่อรับทราบ (Acknowledgment Log)</span>}>
                {acks.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', font: 'var(--type-body)' }}>
                    ยังไม่มีบุคลากรลงชื่อรับทราบเอกสารรุ่นปัจจุบัน
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                        {['เวลาลงนาม', 'ชื่อ-นามสกุล', 'บทบาท/แผนก', 'เวอร์ชัน'].map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', padding: '10px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-secondary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {acks.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="qms-numeric" style={{ padding: '10px 16px', font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{fmtTs(a.ts)}</td>
                          <td style={{ padding: '10px 16px', font: 'var(--fw-medium) var(--text-sm)/1 var(--font-body)', color: 'var(--text-primary)' }}>{a.name}</td>
                          <td style={{ padding: '10px 16px', font: 'var(--text-xs)/1 var(--font-body)', color: 'var(--text-secondary)' }}>{a.role}</td>
                          <td style={{ padding: '10px 16px', font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>v{a.version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}
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
