import { useEffect, useState } from 'react';

import { loadDdragon } from './ddragon';
import type { DdragonData } from './types';

export function useDdragon(): { data: DdragonData | null; error: string | null } {
  const [data, setData] = useState<DdragonData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDdragon()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}
