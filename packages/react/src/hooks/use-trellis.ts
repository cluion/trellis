import { useState, useEffect, useRef } from 'react';
import { Trellis } from '@trellisjs/core';
import type { TrellisAPI, TrellisOptions } from '@trellisjs/core';

/**
 * 建立和管理 Trellis 實例的 hook。
 *
 * - 使用 useRef 確保只建立一次實例（不受 StrictMode 雙重呼叫影響）。
 * - 狀態變更時觸發重新渲染。
 * - 相容 React StrictMode。
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
    const unsubscribe = trellisRef.current!.api.subscribe(() => {
      setVersion((v) => v + 1);
    });

    return unsubscribe;
  }, []);

  return { api: trellisRef.current.api };
}
