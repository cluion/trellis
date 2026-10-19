import type { ColumnDef } from '@trellisjs/core';
import { createRowExpansionPlugin } from '@trellisjs/plugin-row-expansion';
import { describe, it, expect, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { TlTable } from '../src';
import { mountWithTrellis } from './helpers';

interface User {
    id: string;
    name: string;
}

const data: User[] = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
];
const columns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID' },
    { id: 'name', accessor: 'name', header: 'Name' },
];

function mountExpandable(
    options: Parameters<typeof createRowExpansionPlugin>[0] = {},
    onRowClick?: () => void,
) {
    return mountWithTrellis(
        {
            data,
            columns,
            rowId: 'id',
            plugins: [createRowExpansionPlugin(options)],
        },
        ({ api }) => {
            if (!api.getSlot('expansion:default')) {
                api.registerSlot('expansion:default', (ctx) =>
                    h('p', { class: 'detail' }, `Detail ${String(ctx.rowId)}`),
                );
            }

            return h('div', { onClick: onRowClick }, [h(TlTable)]);
        },
    );
}

describe('展開列', () => {
    it('表頭與每列最前面多一欄切換按鈕', () => {
        const { wrapper } = mountExpandable();

        expect(wrapper.find('thead th.trellis-expansion-th').exists()).toBe(
            true,
        );
        expect(wrapper.findAll('tbody .trellis-expansion-toggle')).toHaveLength(
            2,
        );
    });

    it('沒有插件時不多一欄', () => {
        const { wrapper } = mountWithTrellis({ data, columns }, () =>
            h(TlTable),
        );

        expect(wrapper.find('.trellis-expansion-th').exists()).toBe(false);
    });

    it('點擊切換按鈕會發出 expansion:toggle 並展開', async () => {
        const { wrapper, trellis } = mountExpandable();
        const onToggle = vi.fn();

        trellis.api.on('expansion:toggle', onToggle);
        const toggle = wrapper.find('.trellis-expansion-toggle');

        expect(toggle.text()).toBe('▶');
        expect(toggle.attributes('aria-expanded')).toBe('false');
        await toggle.trigger('click');

        expect(onToggle).toHaveBeenCalledWith({ rowId: '1' });
        expect(wrapper.find('.trellis-expansion-toggle').text()).toBe('▼');
        expect(
            wrapper.find('.trellis-expansion-toggle').attributes('aria-label'),
        ).toBe('收合');
    });

    it('展開列跨所有欄位並渲染 expansion:default 插槽', async () => {
        const { wrapper } = mountExpandable();

        expect(wrapper.find('.trellis-expansion-row').exists()).toBe(false);
        await wrapper.find('.trellis-expansion-toggle').trigger('click');

        const row = wrapper.find('.trellis-expansion-row');

        expect(row.classes()).toContain('trellis-expansion--expanded');
        expect(row.find('td').attributes('colspan')).toBe('3');
        expect(row.find('.detail').text()).toBe('Detail 1');
    });

    it('點擊展開列不會往外冒泡', async () => {
        const onRowClick = vi.fn();
        const { wrapper } = mountExpandable({}, onRowClick);

        await wrapper.find('.trellis-expansion-toggle').trigger('click');
        onRowClick.mockClear();
        await wrapper.find('.trellis-expansion-row').trigger('click');

        expect(onRowClick).not.toHaveBeenCalled();
    });

    it('支援自訂圖示', async () => {
        const { wrapper } = mountExpandable({
            expandIcon: '+',
            collapseIcon: '-',
        });

        expect(wrapper.find('.trellis-expansion-toggle').text()).toBe('+');
        await wrapper.find('.trellis-expansion-toggle').trigger('click');
        await nextTick();
        expect(wrapper.find('.trellis-expansion-toggle').text()).toBe('-');
    });
});
