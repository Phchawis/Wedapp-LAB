import { useEffect, useState } from 'react';

/* Responsive helper — true when viewport is narrower than `bp`. */
export function useNarrow(bp) {
  const [n, setN] = useState(typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setN(window.innerWidth < bp);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return n;
}

export default useNarrow;
