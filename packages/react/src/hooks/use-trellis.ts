import { Trellis } from '@trellisjs/core';
import type { TrellisAPI, TrellisOptions } from '@trellisjs/core';
import { useState, useEffect, useRef } from 'react';

/**
 * 建立和管理 Trellis 實例的 hook。
 *
 * - 使用 useRef 確保只建立一次實例（不受 StrictMode 雙重呼叫影響）。
 * - 狀態變更時觸發重新渲染。
 * - 相容 React StrictMode。
 */
export function useTrellis<T extends object>(
    options: TrellisOptions<T>,
): { api: TrellisAPI<T> } {
    const trellisRef = useRef<Trellis<T> | null>(null);
    const lifecycleRef = useRef({ generation: 0 });

    if (!trellisRef.current) {
        trellisRef.current = new Trellis({ ...options, autoStart: false });
    }

    const [, setVersion] = useState(0);

    useEffect(() => {
        const trellis = trellisRef.current!;
        const lifecycleState = lifecycleRef.current;
        const lifecycle = ++lifecycleState.generation;
        const unsubscribe = trellis.api.subscribe(() => {
            setVersion((v) => v + 1);
        });
        trellis.start();

        return () => {
            unsubscribe();
            trellis.stop();
            // StrictMode 會立即重播 effect；真正卸載才釋放資源。
            queueMicrotask(() => {
                if (lifecycleState.generation === lifecycle) {
                    trellis.destroy();
                }
            });
        };
    }, []);

    return { api: trellisRef.current.api };
}
