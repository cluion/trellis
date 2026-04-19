import { useSyncExternalStore } from 'react';
import { useTrellisContext } from '../context';
import type { TableState } from '@trellisjs/core';

/**
 * 從 Trellis 取得最新的狀態快照。
 * 使用 useSyncExternalStore 確保狀態變更時元件自動重新渲染。
 */
export function useTrellisState<T = Record<string, unknown>>(): TableState<T> {
  const api = useTrellisContext<T>();

  return useSyncExternalStore(
    (callback) => api.subscribe(callback),
    () => api.getState() as TableState<T>,
  );
}
