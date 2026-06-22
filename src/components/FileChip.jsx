import { Icon } from './Icon.jsx';

// File-format chip meta (PDF view / Word edit / URL link).
export const FILE_META = {
  pdf: { label: 'PDF', icon: 'FileText', note: 'เปิดดู', c: 'var(--red-600)', bg: 'var(--red-100)' },
  word: { label: 'Word', icon: 'FilePen', note: 'แก้ไข', c: 'var(--blue-700)', bg: 'var(--blue-100)' },
  excel: { label: 'Excel', icon: 'FileSpreadsheet', note: 'ตารางข้อมูล', c: 'var(--green-700)', bg: 'var(--green-100)' },
  url: { label: 'URL', icon: 'Link', note: 'แนบลิงก์', c: 'var(--violet-700)', bg: 'var(--violet-100)' },
};

export function FileChip({ kind, size = 'md' }) {
  const m = FILE_META[kind];
  if (!m) return null;
  const pad = size === 'sm' ? '3px 8px' : '5px 10px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad,
      borderRadius: 'var(--radius-sm)', background: m.bg, color: m.c,
      font: 'var(--fw-semibold) var(--text-xs)/1 var(--font-body)',
    }}>
      <Icon name={m.icon} size={size === 'sm' ? 13 : 15} color={m.c} sw={2.2} />
      {m.label}
    </span>
  );
}

export default FileChip;
