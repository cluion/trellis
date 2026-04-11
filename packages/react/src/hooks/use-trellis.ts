import { useRef, useState, useEffect, useMemo } from 'react';
import { Trellis } from '@trellisjs/core';
import type { TrellisAPI, TrellisOptions } from '@trellisjs/core';

/**
 * 建立和管理 Trellis 實例的 hook。
 *
 * - 只建立一次實例（穩定參照）。
 * - 狀態變更時觸發重新渲染。
 * - 卸載時銷毀實例。
 */
export function useTrellis<T extends Record<string, unknown>>(
  options: TrellisOptions<T>,
): { api: TrellisAPI<T> } {
  const trellisRef = useRef<Trellis<T> | null>(null);
  if (!trellisRef.current) {
    trellisRef.current = new Trellis(options);
  }

  const [, setVersion] = useState(0);

  useEffect(() => {
    const trellis = trellisRef.current!;
    const unsubscribe = trellis.api.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return () => {
      unsubscribe();
      trellis.destroy();
      trellisRef.current = null;
    };
  }, []);

  const api = useMemo(() => trellisRef.current!.api, []);

  return { api };
}
