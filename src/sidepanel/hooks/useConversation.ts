import { useState, useEffect, useCallback } from 'react';
import { ThoughtForkData } from '../../shared/types';
import { StorageManager } from '../../shared/storage';

const storage = new StorageManager();

export function useConversation() {
  const [data, setData] = useState<ThoughtForkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await storage.getData();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { data, loading, error, refresh };
}
