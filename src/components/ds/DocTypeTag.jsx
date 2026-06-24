// The 9 document types — colour-coded by family for fast scanning in the register.
const TYPES = {
  QM: { th: 'คู่มือคุณภาพ', c: 'var(--brand-700)' },
  SP: { th: 'ระเบียบปฏิบัติ', c: 'var(--blue-700)' },
  WI: { th: 'วิธีปฏิบัติ', c: 'var(--blue-600)' },
  WS: { th: 'แบบบันทึกการปฏิบัติงาน', c: 'var(--violet-700)' },
  FM: { th: 'แบบฟอร์มบันทึก', c: 'var(--violet-600)' },
  EF: { th: 'บันทึกอิเล็กทรอนิกส์', c: 'var(--doc-type-ef)' },
  ED: { th: 'เอกสารอิเล็กทรอนิกส์', c: 'var(--doc-type-ed)' },
  SD: { th: 'เอกสารสนับสนุน', c: 'var(--slate-600)' },
  RF: { th: 'เอกสารอ้างอิง', c: 'var(--accent-500)' },
};

/** DocTypeTag — the 2-letter document-type code chip. */
export function DocTypeTag({ type = 'QM', showLabel = false, size = 'md', style }) {
  const t = TYPES[type] || TYPES.QM;
  const dim = size === 'sm' ? { code: 22, font: 'var(--text-2xs)' } : { code: 28, font: 'var(--text-xs)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: dim.code, height: dim.code, padding: '0 6px', borderRadius: 'var(--radius-sm)',
        background: t.c, color: 'var(--white)',
        font: 'var(--fw-bold) ' + dim.font + ' / 1 var(--font-mono)', letterSpacing: '0.02em',
      }}>{type}</span>
      {showLabel && <span style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)' }}>{t.th}</span>}
    </span>
  );
}

export default DocTypeTag;
