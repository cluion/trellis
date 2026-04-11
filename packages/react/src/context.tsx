import { createContext, useContext } from 'react';
import type { TrellisAPI } from '@trellisjs/core';

/**
 * 在元件間共享 Trellis API 的 Context。
 */
export const TrellisContext = createContext<TrellisAPI | null>(null);

/**
 * 從 context 取得 Trellis API 的 hook。
 * 必須在 TrellisContext.Provider 內使用。
 */
export function useTrellisContext<T = Record<string, unknown>>(): TrellisAPI<T> {
  const ctx = useContext(TrellisContext);
  if (!ctx) {
    throw new Error('useTrellisContext must be used within a <TrellisProvider>');
  }
  return ctx as TrellisAPI<T>;
}
