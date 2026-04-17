import { useRef, useEffect } from 'react';
import type { VirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';

interface UseVirtualScrollReturn {
  /** 綁定到滾動容器的 ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 滾動容器的樣式 */
  style: React.CSSProperties;
}

/**
 * 管理虛擬滾動的 React hook。
 * 綁定滾動容器到 plugin，處理掛載/卸載生命週期。
 */
export function useVirtualScroll(
  plugin: VirtualScrollPlugin,
): UseVirtualScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    plugin.attachScrollContainer(element);

    return () => {
      plugin.detachScrollContainer();
    };
  }, [plugin]);

  return {
    containerRef,
    style: {
      overflowY: 'auto',
    },
  };
}
