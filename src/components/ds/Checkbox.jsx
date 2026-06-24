/** Checkbox — acknowledgement, bulk-select, filters. */
export function Checkbox({ label, checked, defaultChecked, disabled = false, onChange, style }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      font: 'var(--type-body)', color: 'var(--text-primary)', ...style,
    }}>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange}
        style={{
          appearance: 'none', WebkitAppearance: 'none', width: 18, height: 18, margin: 0,
          flexShrink: 0, border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-xs)',
          background: 'var(--white)', display: 'grid', placeItems: 'center', cursor: 'inherit',
          transition: 'background var(--dur-fast), border-color var(--dur-fast)',
        }}
        ref={(el) => {
          if (!el) return;
          const on = el.checked;
          el.style.background = on ? 'var(--brand-700)' : 'var(--white)';
          el.style.borderColor = on ? 'var(--brand-700)' : 'var(--border-strong)';
          el.style.backgroundImage = on
            ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E\")"
            : 'none';
          el.style.backgroundRepeat = 'no-repeat';
          el.style.backgroundPosition = 'center';
        }}
      />
      {label}
    </label>
  );
}

export default Checkbox;
