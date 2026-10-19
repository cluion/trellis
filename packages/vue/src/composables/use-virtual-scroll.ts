import type { VirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';
import { ref, watch } from 'vue';
import type { Ref } from 'vue';

export interface UseVirtualScrollReturn {
    /** 綁定到滾動容器的 template ref */
    containerRef: Ref<HTMLElement | null>;
    /** 滾動容器的樣式 */
    style: { overflowY: 'auto' };
}

/**
 * 把滾動容器綁定到虛擬滾動插件。
 * 元素掛載時綁定，卸載或換成其他元素時解除。
 */
export function useVirtualScroll(
    plugin: VirtualScrollPlugin,
): UseVirtualScrollReturn {
    const containerRef = ref<HTMLElement | null>(null);

    watch(
        containerRef,
        (element, _previous, onCleanup) => {
            if (!element) {
                return;
            }

            plugin.attachScrollContainer(element);
            onCleanup(() => plugin.detachScrollContainer());
        },
        { flush: 'post' },
    );

    return { containerRef, style: { overflowY: 'auto' } };
}
