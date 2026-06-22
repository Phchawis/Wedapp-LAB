/** IconButton — square, icon-only control for table rows & toolbars. */
export function IconButton({ size = 'md', variant = 'ghost', disabled = false, label, children, style, ...rest }) {
  const dim = { sm: 30, md: 36, lg: 42 }[size] || 36;
  const variants = {
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
    outline: { background: 'var(--white)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },
    soft: { background: 'var(--teal-50)', color: 'var(--teal-700)', border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim, borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard)',
        ...variants[variant], ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--slate-100)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = variants[variant].background; }}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;
