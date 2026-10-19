import type { ColumnDef } from '@trellisjs/core';
import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { TlTable } from '../src';
import { mountWithTrellis } from './helpers';

interface User {
    name: string;
    age: number;
}

const columns: ColumnDef<User>[] = [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'age', accessor: 'age', header: 'Age', align: 'right' },
    { id: 'upper', accessor: (row) => row.name.toUpperCase(), header: 'Upper' },
];

const data: User[] = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
];

describe('TlTable', () => {
    it('渲染表頭與資料列', () => {
        const { wrapper } = mountWithTrellis({ data, columns }, () =>
            h(TlTable),
        );

        expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
            'Name',
            'Age',
            'Upper',
        ]);
        expect(wrapper.findAll('tbody tr')).toHaveLength(2);
        expect(
            wrapper
                .findAll('tbody tr')[0]
                .findAll('td')
                .map((td) => td.text()),
        ).toEqual(['Alice', '30', 'ALICE']);
    });

    it('套用對齊樣式', () => {
        const { wrapper } = mountWithTrellis({ data, columns }, () =>
            h(TlTable),
        );

        expect(
            (wrapper.findAll('tbody td')[1].element as HTMLElement).style
                .textAlign,
        ).toBe('right');
    });

    it('隱藏 visible 為 false 的欄位', () => {
        const { wrapper } = mountWithTrellis(
            {
                data,
                columns: [columns[0], { ...columns[1], visible: false }],
            },
            () => h(TlTable),
        );

        expect(wrapper.findAll('thead th')).toHaveLength(1);
        expect(wrapper.findAll('tbody tr')[0].findAll('td')).toHaveLength(1);
    });

    it('stickyHeader 讓 th 固定在頂端', () => {
        const { wrapper } = mountWithTrellis({ data, columns }, () =>
            h(TlTable, { stickyHeader: true }),
        );
        const th = wrapper.find('thead th').element as HTMLElement;

        expect(wrapper.find('thead').classes()).toContain(
            'trellis-thead--sticky',
        );
        expect(th.style.position).toBe('sticky');
        expect(th.style.top).toBe('0px');
    });

    it('沒有開 stickyHeader 時不套用 sticky', () => {
        const { wrapper } = mountWithTrellis({ data, columns }, () =>
            h(TlTable),
        );

        expect(
            (wrapper.find('thead th').element as HTMLElement).style.position,
        ).toBe('');
    });
});
