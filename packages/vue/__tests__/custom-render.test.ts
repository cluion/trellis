import { Trellis } from '@trellisjs/core';
import type { CellContext, ColumnDef } from '@trellisjs/core';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { Slots } from 'vue';
import { provideTrellis, TlTable, TlTd } from '../src';
import { mountWithTrellis } from './helpers';

interface User {
    id: number;
    name: string;
    role: string;
}

const data: User[] = [
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'Viewer' },
];

const plainColumns: ColumnDef<User>[] = [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'role', accessor: 'role', header: 'Role' },
];

function mountTable(
    columns: ColumnDef<User>[],
    slots: Record<string, (props: any) => unknown> = {},
) {
    return mountWithTrellis({ data, columns, rowId: 'id' }, () =>
        h(TlTable, null, slots as Slots),
    );
}

const cellTexts = (wrapper: ReturnType<typeof mountTable>['wrapper']) =>
    wrapper
        .findAll('tbody tr')
        .map((tr) => tr.findAll('td').map((td) => td.html()));

describe('renderCell / renderHeader on the column', () => {
    it('renders the returned VNodes', () => {
        const { wrapper } = mountTable([
            {
                ...plainColumns[0],
                renderHeader: ({ column }) => h('em', `${column.header}!`),
            },
            {
                ...plainColumns[1],
                renderCell: ({ value }) =>
                    h('span', { class: 'badge' }, String(value)),
            },
        ]);

        expect(wrapper.find('thead em').text()).toBe('Name!');
        expect(wrapper.findAll('.badge').map((b) => b.text())).toEqual([
            'Admin',
            'Viewer',
        ]);
    });

    it('passes row, value, column and api to renderCell', () => {
        const renderCell = vi.fn((ctx: CellContext<User>) =>
            String(ctx.row.id),
        );
        const { trellis } = mountTable([{ ...plainColumns[0], renderCell }]);
        const ctx = renderCell.mock.calls[0][0];

        expect(ctx.row.original).toEqual(data[0]);
        expect(ctx.value).toBe('Alice');
        expect(ctx.column.id).toBe('name');
        expect(ctx.api).toBe(trellis.api);
    });

    it('works on TlTd outside TlTable', () => {
        const column: ColumnDef<User> = {
            ...plainColumns[0]!,
            renderCell: ({ value }) => h('b', String(value)),
        };
        const trellis = new Trellis<User>({ data, columns: [column] });
        const Host = defineComponent({
            setup() {
                provideTrellis(trellis.api);

                return () =>
                    h('table', [
                        h('tbody', [
                            h('tr', [
                                h(TlTd, {
                                    row: trellis.api.getState().data[0]!,
                                    column,
                                }),
                            ]),
                        ]),
                    ]);
            },
        });

        expect(mount(Host).find('b').text()).toBe('Alice');
    });
});

describe('TlTable scoped slots', () => {
    it('#cell-{id} renders a column with slot props', () => {
        const slot = vi.fn((props: CellContext<User>) =>
            h('i', `${props.column.id}:${String(props.value)}`),
        );
        const { wrapper, trellis } = mountTable(plainColumns, {
            'cell-role': slot,
        });

        expect(wrapper.findAll('i').map((i) => i.text())).toEqual([
            'role:Admin',
            'role:Viewer',
        ]);
        expect(slot.mock.calls[0][0].row.original).toEqual(data[0]);
        expect(slot.mock.calls[0][0].api).toBe(trellis.api);
        expect(wrapper.findAll('tbody tr')[0].find('td').text()).toBe('Alice');
    });

    it('#cell applies to every column, a #cell-{id} slot wins over it', () => {
        const { wrapper } = mountTable(plainColumns, {
            cell: ({ value }: CellContext<User>) => h('u', String(value)),
            'cell-name': ({ value }: CellContext<User>) =>
                h('s', String(value)),
        });

        expect(cellTexts(wrapper)[0]).toEqual([
            '<td><s>Alice</s></td>',
            '<td><u>Admin</u></td>',
        ]);
    });

    it('slots take priority over column.renderCell', () => {
        const { wrapper } = mountTable(
            [
                {
                    ...plainColumns[0],
                    renderCell: () => h('b', 'from column'),
                },
            ],
            { 'cell-name': () => h('i', 'from slot') },
        );

        expect(wrapper.find('tbody td').text()).toBe('from slot');
    });

    it('#header-{id} and #header customize headers', () => {
        const { wrapper } = mountTable(plainColumns, {
            header: ({ column }: { column: ColumnDef<User> }) =>
                h('span', column.header.toUpperCase()),
            'header-role': ({ column }: { column: ColumnDef<User> }) =>
                h('b', `${column.header}*`),
        });

        expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
            'NAME',
            'Role*',
        ]);
    });

    it('slot content can act on the table through the api', async () => {
        const { wrapper } = mountTable(plainColumns, {
            'cell-role': ({ row, api }: CellContext<User>) =>
                h(
                    'button',
                    { onClick: () => api.removeRow(row.id) },
                    `Delete ${row.original.name}`,
                ),
        });

        await wrapper.find('button').trigger('click');
        await nextTick();

        expect(wrapper.findAll('tbody tr')).toHaveLength(1);
        expect(wrapper.find('tbody td').text()).toBe('Bob');
    });

    it('keeps plain text without slots or render functions', () => {
        const { wrapper } = mountTable(plainColumns);

        expect(cellTexts(wrapper)[0]).toEqual([
            '<td>Alice</td>',
            '<td>Admin</td>',
        ]);
        expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
            'Name',
            'Role',
        ]);
    });
});
