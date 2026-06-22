/** Tabs — underline-style navigation for switching register views. */
export function Tabs({ tabs = [], value, onChange, style }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', ...style }}>
      {tabs.map((t) => {
        const key = typeof t === 'string' ? t : t.value;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' ? t.count : undefined;
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent',
              border: 'none', cursor: 'pointer', padding: '10px 14px', marginBottom: -1,
              borderBottom: '2px solid ' + (active ? 'var(--teal-700)' : 'transparent'),
              color: active ? 'var(--teal-700)' : 'var(--text-secondary)',
              font: (active ? 'var(--fw-semibold) ' : 'var(--fw-medium) ') + 'var(--text-base)/1 var(--font-body)',
              transition: 'color var(--dur-fast), border-color var(--dur-fast)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {label}
            {count != null && (
              <span style={{
                font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-mono)',
                background: active ? 'var(--teal-100)' : 'var(--slate-100)',
                color: active ? 'var(--teal-700)' : 'var(--text-tertiary)',
                padding: '2px 6px', borderRadius: 'var(--radius-pill)',
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
