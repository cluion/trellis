import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import type { VNodeChild } from 'vue';
import { useTrellis } from '../src';
import type { UseTrellisOptions, UseTrellisReturn } from '../src';

/**
 * 掛載一個呼叫 useTrellis() 的元件，並用 render 渲染它的內容。
 * 回傳的 trellis 是 useTrellis() 的結果，方便在測試中操作 api。
 */
export function mountWithTrellis<T extends object>(
    options: UseTrellisOptions<T>,
    render: (trellis: UseTrellisReturn<T>) => VNodeChild,
) {
    let trellis!: UseTrellisReturn<T>;

    const Host = defineComponent({
        setup() {
            trellis = useTrellis(options);

            return () => render(trellis);
        },
    });

    const wrapper = mount(Host, { attachTo: document.body });

    return { wrapper, trellis };
}
