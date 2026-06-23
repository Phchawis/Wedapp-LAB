import { useRef, useState } from 'react';
import { Button, Card, Input, Select, Alert, DocTypeTag, StatusBadge } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { QMS, RETENTION_OPTIONS } from '../data/taxonomy.js';

const TODAY = '2026-06-22';

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

/* RegisterDocScreen — นำเข้าเอกสารคุณภาพเข้าสู่ระบบ
   เลขที่เอกสาร: ประเภท-รหัสเอกสาร เช่น SP-0014-00123 (รหัสพิมพ์ได้อิสระ ตัวเลข/ตัวอักษรกี่ตัวก็ได้)
   แนบไฟล์จริง (Word/PDF) อัปโหลด + แนบลิงก์ภายนอก (URL) — ส่งเป็น FormData ไป backend */
export function RegisterDocScreen({ docs, onSubmit, onCancel }) {
  const Q = QMS;
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    type: '', docId: '',
    cat: '', th: '', owner: '',
    rev: '1', status: 'draft', updated: TODAY, retention: '5',
  });
  const [files, setFiles] = useState([]); // File[]
  const [links, setLinks] = useState(['']);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addFiles = (list) => setFiles((prev) => [...prev, ...Array.from(list)]);
  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const setLink = (i, v) => setLinks((prev) => prev.map((l, idx) => (idx === i ? v : l)));
  const addLinkRow = () => setLinks((prev) => [...prev, '']);
  const removeLink = (i) => setLinks((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)));

  const docId = form.docId.trim();
  const noComposed = form.type && docId ? `${form.type}-${docId}` : '';
  const duplicate = noComposed && docs.some((d) => d.no.toLowerCase() === noComposed.toLowerCase());
  const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
  const attachmentCount = files.length + cleanLinks.length;

  const errors = {
    type: !form.type ? 'เลือกประเภทเอกสาร' : '',
    docId: !docId ? 'กรุณาระบุเลขที่เอกสาร' : '',
    duplicate: duplicate ? 'เลขที่เอกสารนี้มีอยู่แล้วในทะเบียน' : '',
    cat: !form.cat ? 'กรุณาเลือกหมวดงาน' : '',
    th: !form.th.trim() ? 'กรุณาระบุชื่อเอกสาร' : '',
    owner: !form.owner.trim() ? 'กรุณาระบุผู้รับผิดชอบ' : '',
    attach: attachmentCount === 0 ? 'แนบไฟล์หรือลิงก์อย่างน้อย 1 รายการ' : '',
  };
  const valid = !Object.values(errors).some(Boolean);
  const noError = errors.type || errors.docId || errors.duplicate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError('');
    if (!valid) return;
    const fd = new FormData();
    fd.append('no', noComposed);
    fd.append('th', form.th.trim());
    fd.append('type', form.type);
    fd.append('cat', form.cat);
    fd.append('rev', String(Math.max(1, parseInt(form.rev, 10) || 1)));
    fd.append('status', form.status);
    fd.append('updated', form.updated);
    fd.append('owner', form.owner.trim());
    fd.append('retention', String(parseInt(form.retention, 10) || 5));
    fd.append('links', JSON.stringify(cleanLinks));
    files.forEach((f) => fd.append('files', f));
    setBusy(true);
    try {
      await onSubmit(fd);
    } catch (err) {
      setSubmitError(err.message || 'บันทึกไม่สำเร็จ');
      setBusy(false);
    }
  };

  // กล่อง segment ของเลขที่เอกสาร
  const segBox = (invalid) => ({
    display: 'flex', alignItems: 'center', height: 40, padding: '0 12px',
    background: 'var(--white)', borderRadius: 'var(--radius-md)',
    border: '1px solid ' + (invalid ? 'var(--red-600)' : 'var(--border-default)'),
  });
  const segInput = { border: 'none', outline: 'none', background: 'transparent', width: '100%', minWidth: 0, font: 'var(--type-code)', color: 'var(--text-primary)' };
  const dash = { font: 'var(--fw-bold) var(--text-lg) var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 };

  return (
    <form onSubmit={handleSubmit} className="qms-rise" style={{ maxWidth: 880 }}>
      <button type="button" onClick={onCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', font: 'var(--type-ui)', padding: 0, marginBottom: 16 }}>
        <Icon name="ArrowLeft" size={16} /> ยกเลิกและกลับ
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Classification */}
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="FolderClosed" size={16} color="var(--text-secondary)" /> การจัดประเภทเอกสาร</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)' }}>
                เลขที่เอกสาร<span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...segBox(touched && errors.type), flex: '0 0 132px', padding: '0 8px 0 12px', position: 'relative' }}>
                  <select value={form.type} onChange={(e) => set('type', e.target.value)} style={{ ...segInput, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: 16 }}>
                    <option value="">ประเภท</option>
                    {Q.DOC_TYPES.map((t) => <option key={t.code} value={t.code}>{t.code}</option>)}
                  </select>
                  <Icon name="ChevronRight" size={14} color="var(--text-tertiary)" style={{ transform: 'rotate(90deg)', position: 'absolute', right: 8, pointerEvents: 'none' }} />
                </div>
                <span style={dash}>-</span>
                <div style={{ ...segBox(touched && errors.docId), flex: 1 }}>
                  <input placeholder="0014-00123" value={form.docId} onChange={(e) => set('docId', e.target.value.replace(/\s/g, ''))} style={segInput} aria-label="เลขที่เอกสาร" />
                </div>
              </div>
              {touched && noError && <span style={{ font: 'var(--type-caption)', color: 'var(--red-600)' }}>{noError}</span>}
            </div>

            <Select label="หมวดงาน" required placeholder="— เลือกหมวดงาน —" value={form.cat}
              onChange={(e) => set('cat', e.target.value)} hint={touched ? errors.cat : undefined}
              options={Q.WORK_CATEGORIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.th}` }))} />
          </div>
        </Card>

        {/* Document details */}
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="PencilLine" size={16} color="var(--text-secondary)" /> รายละเอียดเอกสาร</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="ชื่อเอกสาร" required placeholder="เช่น การควบคุมคุณภาพการตรวจเคมีคลินิก"
              value={form.th} onChange={(e) => set('th', e.target.value)} error={touched ? errors.th : undefined} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Input label="ผู้รับผิดชอบ" required placeholder="เช่น ทนพ. ธนกร พงษ์"
                value={form.owner} onChange={(e) => set('owner', e.target.value)} error={touched ? errors.owner : undefined} />
              <Input label="แก้ไขครั้งที่" type="number" min="1" value={form.rev} onChange={(e) => set('rev', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <Select label="สถานะเริ่มต้น" value={form.status} onChange={(e) => set('status', e.target.value)}
                options={Object.entries(Q.STATUS).map(([code, s]) => ({ value: code, label: s.th }))} />
              <Input label="วันที่ของเอกสาร" type="date" value={form.updated} onChange={(e) => set('updated', e.target.value)} />
              <Select label="ระยะเวลาจัดเก็บเอกสาร" value={form.retention} onChange={(e) => set('retention', e.target.value)}
                options={RETENTION_OPTIONS.map((r) => ({ value: String(r.value), label: r.label }))} />
            </div>
          </div>
        </Card>

        {/* Attachments — real upload + links */}
        <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="Paperclip" size={16} color="var(--text-secondary)" /> ไฟล์แนบและลิงก์</span>}>
          {/* File upload dropzone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 16px', cursor: 'pointer', borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--border-default)', background: 'var(--slate-50)', color: 'var(--text-secondary)', font: 'var(--type-ui)' }}
          >
            <Icon name="Download" size={18} color="var(--brand-600)" style={{ transform: 'rotate(180deg)' }} />
            คลิกหรือลากไฟล์ Word / Excel / PDF มาวางที่นี่ (สูงสุด 25 MB ต่อไฟล์)
          </div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <Icon name="FileText" size={18} color="var(--brand-600)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: 'var(--fw-medium) var(--text-sm)/1.2 var(--font-body)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                    <div style={{ font: 'var(--text-2xs)/1.2 var(--font-mono)', color: 'var(--text-tertiary)' }}>{fmtSize(f.size)}</div>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'var(--red-600)' }}><Icon name="Trash2" size={16} color="var(--red-600)" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          <div style={{ marginTop: 16, font: 'var(--type-ui)', color: 'var(--text-secondary)', marginBottom: 8 }}>ลิงก์ภายนอก (URL)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {links.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Input placeholder="https://edoc.tuh.go.th/..." value={l} onChange={(e) => setLink(i, e.target.value)}
                    prefix={<Icon name="Link" size={15} color="var(--text-tertiary)" />} />
                </div>
                <button type="button" onClick={() => removeLink(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 8, color: 'var(--text-tertiary)' }}><Icon name="Trash2" size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLinkRow} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-link)', font: 'var(--type-ui)', padding: 0 }}>
            <Icon name="Plus" size={15} color="var(--text-link)" /> เพิ่มลิงก์
          </button>

          {touched && errors.attach && <div style={{ marginTop: 10, font: 'var(--type-caption)', color: 'var(--red-600)' }}>{errors.attach}</div>}
        </Card>

        {submitError && <Alert tone="danger" icon={<Icon name="AlertTriangle" size={18} color="var(--red-700)" />}>{submitError}</Alert>}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="submit" size="lg" disabled={busy} iconLeft={<Icon name="Check" size={17} color="#fff" />}>{busy ? 'กำลังนำเข้า…' : 'บันทึกลงทะเบียน'}</Button>
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>ยกเลิก</Button>
          <div style={{ flex: 1 }} />
          {form.type && <DocTypeTag type={form.type} showLabel />}
          {form.status && <StatusBadge status={form.status} />}
        </div>
      </div>
    </form>
  );
}

export default RegisterDocScreen;
