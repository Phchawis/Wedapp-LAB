/** Input — labelled text field with optional hint / error / icon. */
export function Input({ label, hint, error, required = false, prefix = null, suffix = null, id, style, ...rest }) {
  const inputId = id || (label ? 'in-' + label.replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ font: 'var(--type-ui)', color: 'var(--text-secondary)' }}>
          {label}
          {required && <span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--white)',
          border: '1px solid ' + (error ? 'var(--red-600)' : 'var(--border-default)'),
          borderRadius: 'var(--radius-md)', padding: '0 12px', height: 40,
          transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
        }}
        onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-focus)'; }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = error ? 'var(--red-600)' : 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {prefix && <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}>{prefix}</span>}
        <input
          id={inputId}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', font: 'var(--type-body)', color: 'var(--text-primary)', minWidth: 0 }}
          {...rest}
        />
        {suffix && <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}>{suffix}</span>}
      </div>
      {(hint || error) && (
        <span style={{ font: 'var(--type-caption)', color: error ? 'var(--red-600)' : 'var(--text-tertiary)' }}>{error || hint}</span>
      )}
    </div>
  );
}

export default Input;
