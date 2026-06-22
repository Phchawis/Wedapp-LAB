/**
 * Button — the primary action control for TUH Lab QMS.
 * Clinical, restrained: small radius, quick transition, no bounce.
 */
export function Button({
  variant = 'primary', size = 'md', block = false, disabled = false,
  iconLeft = null, iconRight = null, type = 'button', children, style, ...rest
}) {
  const sizes = {
    sm: { padding: '0 12px', height: 32, fontSize: 'var(--text-sm)', gap: 6 },
    md: { padding: '0 16px', height: 38, fontSize: 'var(--text-base)', gap: 8 },
    lg: { padding: '0 22px', height: 46, fontSize: 'var(--text-md)', gap: 8 },
  };
  const variants = {
    primary: { background: 'var(--teal-700)', color: 'var(--white)', border: '1px solid var(--teal-700)' },
    secondary: { background: 'var(--white)', color: 'var(--teal-700)', border: '1px solid var(--border-default)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
    danger: { background: 'var(--red-600)', color: 'var(--white)', border: '1px solid var(--red-600)' },
    institutional: { background: 'var(--brand-800)', color: 'var(--white)', border: '1px solid var(--brand-800)' },
  };
  const s = sizes[size] || sizes.md;
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: s.gap,
        height: s.height, padding: s.padding,
        font: 'var(--fw-semibold) ' + s.fontSize + ' / 1 var(--font-body)',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'filter var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)',
        whiteSpace: 'nowrap',
        ...variants[variant], ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.94)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      {...rest}
    >
      {iconLeft}{children}{iconRight}
    </button>
  );
}

export default Button;
