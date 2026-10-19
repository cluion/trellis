import { Trellis } from '@trellisjs/core';
import { createVirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideTrellis, TlVirtualScrollBody, useVirtualScroll } from '../src';

const columns = [{ id: 'name', accessor: 'name' as const, header: 'Name' }];
const data = Array.from({ length: 50 }, (_, i) => ({ name: `Item ${i + 1}` }));

function mountBody(range?: { startIndex: number; endIndex: number }) {
    const trellis = new Trellis({
        data,
        columns,
        pageSize: 100,
        plugins: range
            ? [createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 })]
            : [],
    });

    if (range) {
        trellis.api.recompute({
            virtualScroll: { ...range, totalHeight: 2000, rowHeight: 40 },
        } as never);
    }

    const Host = defineComponent({
        setup() {
            provideTrellis(trellis.api);

            return () => h('table', [h(TlVirtualScrollBody)]);
        },
    });

    return mount(Host);
}

describe('TlVirtualScrollBody', () => {
    it('只渲染 startIndex 到 endIndex 的列', () => {
        const wrapper = mountBody({ startIndex: 10, endIndex: 15 });

        expect(
            wrapper.findAll('tr.trellis-virtual-scroll__data-row'),
        ).toHaveLength(5);
    });

    it('上下有撐高的空白列（px）', () => {
        const wrapper = mountBody({ startIndex: 10, endIndex: 15 });
        const top = wrapper.find('.trellis-virtual-scroll__spacer--top td');
        const bottom = wrapper.find(
            '.trellis-virtual-scroll__spacer--bottom td',
        );

        expect((top.element as HTMLElement).style.height).toBe('400px');
        expect((bottom.element as HTMLElement).style.height).toBe('1400px');
        expect(top.attributes('colspan')).toBe('1');
    });

    it('沒有 virtualScroll 狀態時渲染所有列', () => {
        expect(mountBody().findAll('tbody tr')).toHaveLength(50);
    });
});

describe('useVirtualScroll', () => {
    it('元素掛載時綁定、卸載時解除', async () => {
        const plugin = createVirtualScrollPlugin({ rowHeight: 40 });
        const attach = vi.spyOn(plugin, 'attachScrollContainer');
        const detach = vi.spyOn(plugin, 'detachScrollContainer');
        const show = ref(true);
        let style: unknown;

        const Host = defineComponent({
            setup() {
                const scroll = useVirtualScroll(plugin);

                style = scroll.style;

                return () =>
                    show.value
                        ? h('div', { ref: scroll.containerRef, class: 'box' })
                        : null;
            },
        });
        const wrapper = mount(Host);

        await nextTick();
        expect(attach).toHaveBeenCalledWith(wrapper.find('.box').element);
        expect(style).toEqual({ overflowY: 'auto' });
        // attachScrollContainer 內部會先 detach 一次舊的綁定
        detach.mockClear();

        show.value = false;
        await nextTick();
        await nextTick();
        expect(detach).toHaveBeenCalledOnce();
    });
});
