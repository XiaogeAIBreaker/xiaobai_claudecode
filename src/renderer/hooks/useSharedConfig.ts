import { useCallback, useEffect, useMemo, useState } from 'react';
import { SharedConfigurationEntry } from '../../shared/types/shared-config';

interface UseSharedConfigOptions<TValue> {
  defaultValue?: TValue;
  immediate?: boolean;
}

interface UseSharedConfigResult<TValue> {
  entry: SharedConfigurationEntry<TValue> | null;
  value: TValue | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useSharedConfig<TValue = unknown>(
  id: string,
  options: UseSharedConfigOptions<TValue> = {}
): UseSharedConfigResult<TValue> {
  const { defaultValue, immediate = true } = options;

  const [entry, setEntry] = useState<SharedConfigurationEntry<TValue> | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.sharedConfig.get<TValue>(id);
      setEntry(response);
      setError(null);
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error(String(err));
      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!immediate) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const response = await window.electronAPI.sharedConfig.get<TValue>(id);
        if (!cancelled) {
          setEntry(response);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const normalizedError = err instanceof Error ? err : new Error(String(err));
          setError(normalizedError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id, immediate]);

  const value = useMemo(() => {
    if (entry) {
      return entry.value;
    }
    return defaultValue;
  }, [entry, defaultValue]);

  return {
    entry,
    value,
    loading,
    error,
    refresh: fetchConfig,
  };
}

export default useSharedConfig;
