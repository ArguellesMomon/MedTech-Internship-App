import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
// Consume quick-action URLs and support opening a form on an already active page.
export default function useQuickCreate(setOpen) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('new') !== '1') return;
    setOpen(true);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams, setOpen]);
}
