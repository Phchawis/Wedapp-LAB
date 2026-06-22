const TONES = {
  info: { fg: 'var(--blue-700)', bg: 'var(--blue-50)', bd: 'var(--blue-100)', bar: 'var(--blue-600)' },
  success: { fg: 'var(--green-700)', bg: 'var(--green-100)', bd: 'var(--green-100)', bar: 'var(--green-600)' },
  warning: { fg: 'var(--amber-700)', bg: 'var(--amber-100)', bd: 'var(--amber-100)', bar: 'var(--amber-600)' },
  danger: { fg: 'var(--red-700)', bg: 'var(--red-100)', bd: 'var(--red-100)', bar: 'var(--red-600)' },
};

/** Alert — inline notice with a left accent bar. */
export function Alert({ tone = 'info', title, icon = null, children, style }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role="status" style={{
      display: 'flex', gap: 12, background: t.bg, borderRadius: 'var(--radius-md)',
      borderLeft: '3px solid ' + t.bar, padding: 'var(--space-4) var(--space-5)',
      color: 'var(--text-primary)', ...style,
    }}>
      {icon && <span style={{ color: t.fg, flexShrink: 0, display: 'flex', marginTop: 2 }}>{icon}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {title && <strong style={{ font: 'var(--fw-semibold) var(--text-base)/1.4 var(--font-body)', color: t.fg }}>{title}</strong>}
        {children && <div style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>{children}</div>}
      </div>
    </div>
  );
}

export default Alert;
