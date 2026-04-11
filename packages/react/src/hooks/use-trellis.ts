import { useState, useEffect } from 'react';
import { Trellis } from '@trellisjs/core';
import type { TrellisAPI, TrellisOptions } from '@trellisjs/core';

/**
 * 建立和管理 Trellis 實例的 hook。
 *
 * - 只建立一次實例（useState lazy initializer）。
 * - 狀態變更時觸發重新渲染。
 * - 相容 React StrictMode 雙重掛載。
 */
export function useTrellis<T extends Record<string, unknown>>(
  options: TrellisOptions<T>,
): { api: TrellisAPI<T> } {
  // useState initializer 只執行一次，不會被 StrictMode cleanup 重置
  const [trellis] = useState(() => new Trellis(options));
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = trellis.api.subscribe(() => {
      setVersion((v) => v + 1);
    });

    return unsubscribe;
  }, [trellis]);

  return { api: trellis.api };
}
