import type { TrellisAPI } from '@trellisjs/core';
import { createContext, useContext } from 'react';

/**
 * 在元件間共享 Trellis API 的 Context。
 */
// 任意列型別的 api 都能放進 Provider；useTrellisContext<T>() 取出時再指定 T。
export const TrellisContext = createContext<TrellisAPI<any> | null>(null);

/**
 * 從 context 取得 Trellis API 的 hook。
 * 必須在 TrellisContext.Provider 內使用。
 */
export function useTrellisContext<
    T = Record<string, unknown>,
>(): TrellisAPI<T> {
    const ctx = useContext(TrellisContext);

    if (!ctx) {
        throw new Error(
            'useTrellisContext must be used within a <TrellisProvider>',
        );
    }

    return ctx as TrellisAPI<T>;
}
