import { useCallback, useEffect, useState } from 'react';

export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try { const data = await fn(); setState({ data, loading: false, error: null }); return data; }
    catch (error) { setState((current) => ({ ...current, loading: false, error })); return null; }
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { const handler = () => reload(); window.addEventListener('focus', handler); return () => window.removeEventListener('focus', handler); }, [reload]);
  return { ...state, reload };
}
