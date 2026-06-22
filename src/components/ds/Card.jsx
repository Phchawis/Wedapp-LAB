/** Card — the default surface for grouped content. Optional header / footer. */
export function Card({ padding = 'md', interactive = false, header, footer, children, style, ...rest }) {
  const pad = { none: 0, sm: 'var(--space-4)', md: 'var(--space-6)', lg: 'var(--space-8)' }[padding];
  return (
    <div
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
        transition: 'box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
        ...style,
      }}
      onMouseEnter={(e) => { if (interactive) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { if (interactive) e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      {...rest}
    >
      {header && (
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', font: 'var(--type-card-title)' }}>
          {header}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
      {footer && (
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-subtle)', background: 'var(--slate-50)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
