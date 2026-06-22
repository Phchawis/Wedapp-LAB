/** Select — native dropdown styled to match Input. */
export function Select({ label, hint, required = false, options = [], placeholder, id, style, ...rest }) {
  const selId = id || (label ? 'sel-' + label.replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={selId} style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)' }}>
          {label}
          {required && <span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex' }}>
        <select
          id={selId}
          style={{
            appearance: 'none', WebkitAppearance: 'none', width: '100%', height: 40,
            padding: '0 36px 0 12px', background: 'var(--white)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', font: 'var(--type-body)', color: 'var(--text-primary)',
            cursor: 'pointer', outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-focus)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lab = typeof o === 'string' ? o : o.label;
            return <option key={val} value={val}>{lab}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)', display: 'flex' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </div>
      {hint && <span style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)' }}>{hint}</span>}
    </div>
  );
}

export default Select;
