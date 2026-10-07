import { withLoggedProgress } from '../lib/progress';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
export default function useOverview() {
  const { user } = useAuth();
  const [data, setData] = useState({ rotations: [], shifts: [], exams: [], quotas: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const tables = ['rotations', 'shifts', 'exams', 'quotas', 'notes', 'daily_reports'];
        const results = await Promise.all(
          tables.map((table) => supabase.from(table).select('*').eq('user_id', user.id)),
        );
        const failure = results.find((result) => result.error);
        if (failure) throw failure.error;
        if (active) {
          const records = Object.fromEntries(
            tables.map((table, i) => [table, results[i].data || []]),
          );
          records.quotas = withLoggedProgress(records.quotas, records.daily_reports);
          setData(records);
        }
      } catch (err) {
        if (active)
          setError('We couldn’t load your overview. Check your connection and try again.');
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [user.id, refresh]);
  const retry = useCallback(() => setRefresh((value) => value + 1), []);
  return { ...data, loading, error, retry };
}
