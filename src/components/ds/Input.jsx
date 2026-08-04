import { useState } from 'react';
import { Icon } from '../Icon.jsx';

/** Input — labelled text field with optional hint / error / icon.
 *  ช่อง type="password" จะได้ปุ่มสลับ "แสดง/ซ่อนรหัสผ่าน" อัตโนมัติ
 *  (ปิดได้ด้วย revealable={false} เช่นช่องที่ไม่ควรให้เปิดดูเลย) */
export function Input({ label, hint, error, required = false, prefix = null, suffix = null, id, style, revealable = true, ...rest }) {
  const inputId = id || (label ? 'in-' + label.replace(/\s+/g, '-') : undefined);
  const [shown, setShown] = useState(false);
  const isPassword = rest.type === 'password';
  const canReveal = isPassword && revealable;
  const inputType = canReveal && shown ? 'text' : rest.type;

  const revealBtn = canReveal ? (
    <button
      type="button"
      onClick={() => setShown((v) => !v)}
      title={shown ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      aria-label={shown ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      aria-pressed={shown}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, marginRight: -6, flexShrink: 0,
        border: 'none', background: 'transparent', cursor: 'pointer',
        borderRadius: 'var(--radius-sm)', padding: 0,
        color: shown ? 'var(--brand-700)' : 'var(--text-tertiary)',
        transition: 'color var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--slate-100)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={shown ? 'EyeOff' : 'Eye'} size={17} />
    </button>
  ) : null;

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
          type={inputType}
        />
        {revealBtn}
        {suffix && <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}>{suffix}</span>}
      </div>
      {(hint || error) && (
        <span style={{ font: 'var(--type-caption)', color: error ? 'var(--red-600)' : 'var(--text-tertiary)' }}>{error || hint}</span>
      )}
    </div>
  );
}

export default Input;
