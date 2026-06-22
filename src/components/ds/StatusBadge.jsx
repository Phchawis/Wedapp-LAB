const STATUS = {
  draft: { th: 'ร่าง', fg: 'var(--status-draft-fg)', bg: 'var(--status-draft-bg)', dot: 'var(--slate-500)' },
  review: { th: 'รอทบทวน', fg: 'var(--status-review-fg)', bg: 'var(--status-review-bg)', dot: 'var(--amber-600)' },
  approved: { th: 'อนุมัติแล้ว', fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)', dot: 'var(--blue-600)' },
  effective: { th: 'ประกาศใช้', fg: 'var(--status-effective-fg)', bg: 'var(--status-effective-bg)', dot: 'var(--green-600)' },
  obsolete: { th: 'ยกเลิกใช้งาน', fg: 'var(--status-obsolete-fg)', bg: 'var(--status-obsolete-bg)', dot: 'var(--red-600)' },
  controlled: { th: 'สำเนาควบคุม', fg: 'var(--status-controlled-fg)', bg: 'var(--status-controlled-bg)', dot: 'var(--violet-600)' },
};

/** StatusBadge — document-control state. Vocabulary fixed by the QMS workflow. */
export function StatusBadge({ status = 'draft', label, size = 'md', style }) {
  const s = STATUS[status] || STATUS.draft;
  const dims = size === 'sm'
    ? { padding: '2px 8px 2px 6px', fontSize: 'var(--text-2xs)', dot: 5, gap: 5 }
    : { padding: '3px 10px 3px 8px', fontSize: 'var(--text-xs)', dot: 6, gap: 6 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: dims.gap, padding: dims.padding,
      borderRadius: 'var(--radius-pill)', background: s.bg, color: s.fg,
      font: 'var(--fw-semibold) ' + dims.fontSize + ' / 1 var(--font-body)', whiteSpace: 'nowrap', ...style,
    }}>
      <span style={{ width: dims.dot, height: dims.dot, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {label || s.th}
    </span>
  );
}

export default StatusBadge;
