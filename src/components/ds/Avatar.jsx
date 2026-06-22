/** Avatar — user identity chip. Initials fallback (Thai-aware), teal tint. */
export function Avatar({ name = '', src, size = 'md', style }) {
  const dim = { sm: 28, md: 36, lg: 48 }[size] || 36;
  const fontSize = { sm: 'var(--text-2xs)', md: 'var(--text-sm)', lg: 'var(--text-md)' }[size] || 'var(--text-sm)';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: dim, height: dim, borderRadius: '50%', overflow: 'hidden',
      background: 'var(--teal-100)', color: 'var(--teal-800)',
      font: 'var(--fw-semibold) ' + fontSize + ' / 1 var(--font-display)',
      flexShrink: 0, userSelect: 'none', ...style,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );
}

export default Avatar;
