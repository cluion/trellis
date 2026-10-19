import type { ColumnDef, TrellisPlugin } from '@trellisjs/core';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, isReactive, nextTick, ref } from 'vue';
import { useTrellisContext, useTrellisState } from '../src';
import { mountWithTrellis } from './helpers';

interface User {
    id: number;
    name: string;
}

const columns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID' },
    { id: 'name', accessor: 'name', header: 'Name' },
];

const users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
];

const Names = defineComponent({
    setup() {
        const state = useTrellisState<User>();

        return () =>
            h(
                'ul',
                state.value.data.map((row) =>
                    h('li', { key: row.id }, row.original.name),
                ),
            );
    },
});

describe('useTrellis', () => {
    it('建立實例並回傳 api 與狀態', () => {
        const { trellis } = mountWithTrellis(
            { data: users, columns },
            () => null,
        );

        expect(trellis.state.value.data).toHaveLength(2);
        expect(trellis.api.getState().columns).toEqual(columns);
    });

    it('自動 provide 給子元件', () => {
        let injected: unknown;
        const Child = defineComponent({
            setup() {
                injected = useTrellisContext();

                return () => null;
            },
        });
        const { trellis } = mountWithTrellis({ data: users, columns }, () =>
            h(Child),
        );

        expect(injected).toBe(trellis.api);
    });

    it('狀態變更時子元件重新渲染', async () => {
        const { wrapper, trellis } = mountWithTrellis(
            { data: users, columns },
            () => h(Names),
        );

        trellis.api.addRow({ id: 3, name: 'Carol' });
        await nextTick();

        expect(wrapper.findAll('li').map((li) => li.text())).toEqual([
            'Alice',
            'Bob',
            'Carol',
        ]);
    });

    it('data 是 ref 時，換成新陣列會同步', async () => {
        const data = ref<User[]>([...users]);
        const { wrapper } = mountWithTrellis({ data, columns }, () => h(Names));

        data.value = [{ id: 9, name: 'Zed' }];
        await nextTick();

        expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Zed']);
    });

    it('data 是 ref 時，陣列 push 也會同步', async () => {
        const data = ref<User[]>([...users]);
        const { wrapper } = mountWithTrellis({ data, columns }, () => h(Names));

        data.value.push({ id: 3, name: 'Carol' });
        await nextTick();

        expect(wrapper.findAll('li')).toHaveLength(3);
    });

    it('data 可以是 getter', async () => {
        const source = ref<User[]>([...users]);
        const { trellis } = mountWithTrellis(
            { data: () => source.value.filter((u) => u.id > 1), columns },
            () => null,
        );

        expect(trellis.state.value.data).toHaveLength(1);
        source.value = [...users, { id: 3, name: 'Carol' }];
        await nextTick();
        expect(trellis.state.value.data).toHaveLength(2);
    });

    it('一般陣列只在建立時讀取一次', async () => {
        const data = [...users];
        const { trellis } = mountWithTrellis({ data, columns }, () => null);

        data.push({ id: 3, name: 'Carol' });
        await nextTick();

        expect(trellis.state.value.data).toHaveLength(2);
    });

    it('Trellis 持有原始物件，不是 Vue 的 reactive proxy', () => {
        const data = ref<User[]>([...users]);
        const { trellis } = mountWithTrellis({ data, columns }, () => null);

        expect(isReactive(trellis.state.value.data[0].original)).toBe(false);
    });

    it('卸載時銷毀實例並停止更新狀態', () => {
        const destroy = vi.fn();
        const plugin: TrellisPlugin<User> = {
            name: 'spy',
            install: () => {},
            destroy,
        };
        const { wrapper, trellis } = mountWithTrellis(
            { data: users, columns, plugins: [plugin] },
            () => null,
        );

        wrapper.unmount();
        trellis.api.addRow({ id: 3, name: 'Carol' });

        expect(destroy).toHaveBeenCalledOnce();
        expect(trellis.state.value.data).toHaveLength(2);
    });

    it('沒有 provide 時 useTrellisContext 會丟出錯誤', () => {
        const Orphan = defineComponent({
            setup() {
                useTrellisContext();

                return () => null;
            },
        });

        expect(() => mount(Orphan)).toThrow(
            'useTrellisContext must be used inside a component that called useTrellis() or provideTrellis()',
        );
    });
});
