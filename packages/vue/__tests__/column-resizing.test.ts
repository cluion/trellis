import type { ColumnDef } from '@trellisjs/core';
import { createColumnResizingPlugin } from '@trellisjs/plugin-column-resizing';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { h, nextTick } from 'vue';
import { TlTable } from '../src';
import { mountWithTrellis } from './helpers';

interface User {
    name: string;
    city: string;
}

const data: User[] = [{ name: 'Alice', city: 'Taipei' }];
const columns: ColumnDef<User>[] = [
    { id: 'name', accessor: 'name', header: 'Name', width: 120 },
    { id: 'city', accessor: 'city', header: 'City' },
];

function mountResizable(cols = columns) {
    return mountWithTrellis(
        { data, columns: cols, plugins: [createColumnResizingPlugin()] },
        () => h(TlTable),
    );
}

const thStyle = (
    wrapper: ReturnType<typeof mountResizable>['wrapper'],
    i: number,
) => (wrapper.findAll('thead th')[i].element as HTMLElement).style;

afterEach(() => {
    document.body.innerHTML = '';
});

describe('TlResizeHandle', () => {
    it('插件啟用時每個可調整欄位都有把手', () => {
        const { wrapper } = mountResizable();

        expect(wrapper.findAll('.trellis-resize-handle')).toHaveLength(2);
        expect(thStyle(wrapper, 0).position).toBe('relative');
    });

    it('resizable: false 的欄位沒有把手', () => {
        const { wrapper } = mountResizable([
            columns[0],
            { ...columns[1], resizable: false },
        ]);

        expect(wrapper.findAll('.trellis-resize-handle')).toHaveLength(1);
    });

    it('沒有安裝插件時沒有把手', () => {
        const { wrapper } = mountWithTrellis({ data, columns }, () =>
            h(TlTable),
        );

        expect(wrapper.findAll('.trellis-resize-handle')).toHaveLength(0);
    });

    it('沒有 width 的欄位使用 defaultWidth', () => {
        expect(thStyle(mountResizable().wrapper, 1).width).toBe('150px');
    });

    it('完整拖曳流程依序發出 resize 事件並還原游標', async () => {
        const { wrapper, trellis } = mountResizable();
        const events: string[] = [];
        const onColumn = vi.fn();

        trellis.api.on('resize:start', () => events.push('start'));
        trellis.api.on('resize:column', (p) => {
            events.push('column');
            onColumn(p);
        });
        trellis.api.on('resize:end', () => events.push('end'));

        await wrapper.find('.trellis-resize-handle').trigger('mousedown', {
            clientX: 100,
        });
        expect(document.body.style.cursor).toBe('col-resize');
        expect(document.body.style.userSelect).toBe('none');

        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
        document.dispatchEvent(new MouseEvent('mouseup'));

        expect(events).toEqual(['start', 'column', 'end']);
        expect(onColumn).toHaveBeenCalledWith({ columnId: 'name', width: 50 });
        expect(document.body.style.cursor).toBe('');
        expect(document.body.style.userSelect).toBe('');
    });

    it('調整後 th 寬度更新', async () => {
        const { wrapper, trellis } = mountResizable();

        trellis.api.emit('resize:column', { columnId: 'name', width: 200 });
        await nextTick();

        expect(thStyle(wrapper, 0).width).toBe('200px');
    });

    it('拖曳中途卸載會移除 document 上的監聽器', async () => {
        const { wrapper, trellis } = mountResizable();
        const onColumn = vi.fn();

        trellis.api.on('resize:column', onColumn);
        await wrapper.find('.trellis-resize-handle').trigger('mousedown', {
            clientX: 100,
        });
        wrapper.unmount();
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));

        expect(onColumn).not.toHaveBeenCalled();
        expect(document.body.style.cursor).toBe('');
    });
});
