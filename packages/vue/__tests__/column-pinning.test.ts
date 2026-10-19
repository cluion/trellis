import type { ColumnDef } from '@trellisjs/core';
import { createColumnPinningPlugin } from '@trellisjs/plugin-column-pinning';
import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { TlTable } from '../src';
import { mountWithTrellis } from './helpers';

interface User {
    id: string;
    name: string;
    email: string;
}

const data: User[] = [
    { id: '1', name: 'Alice', email: 'alice@test.com' },
    { id: '2', name: 'Bob', email: 'bob@test.com' },
];

const columns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
    { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
    { id: 'email', accessor: 'email', header: 'Email' },
];

function mountPinned(stickyHeader = false) {
    return mountWithTrellis(
        { data, columns, plugins: [createColumnPinningPlugin()] },
        () => h(TlTable, { stickyHeader }),
    ).wrapper;
}

const styleOf = (el: Element) => (el as HTMLElement).style;

describe('欄釘選', () => {
    it('th 與 td 套用 sticky left 位移（px）', () => {
        const wrapper = mountPinned();
        const ths = wrapper.findAll('thead th').map((w) => w.element);
        const tds = wrapper
            .findAll('tbody tr')[0]
            .findAll('td')
            .map((w) => w.element);

        expect(styleOf(ths[0]).position).toBe('sticky');
        expect(styleOf(ths[0]).left).toBe('0px');
        expect(styleOf(ths[1]).left).toBe('60px');
        expect(styleOf(ths[2]).position).toBe('');
        expect(styleOf(tds[1]).left).toBe('60px');
    });

    it('最後一個左側釘選欄加上陰影 class', () => {
        const wrapper = mountPinned();

        expect(wrapper.findAll('thead th')[1].classes()).toContain(
            'trellis-pin-shadow--left',
        );
        expect(
            wrapper.findAll('tbody tr')[0].findAll('td')[1].classes(),
        ).toContain('trellis-pin-shadow--left');
    });

    it('有釘選欄時外層加上 overflowX: auto', () => {
        expect(styleOf(mountPinned().element).overflowX).toBe('auto');
    });

    it('沒有釘選欄時外層不加樣式', () => {
        const { wrapper } = mountWithTrellis(
            { data, columns: [columns[2]] },
            () => h(TlTable),
        );

        expect(wrapper.element.getAttribute('style')).toBeNull();
    });

    it('固定表頭時釘選 th 的 z-index 為 3，td 為 1', () => {
        const wrapper = mountPinned(true);

        expect(styleOf(wrapper.find('thead th').element).zIndex).toBe('3');
        expect(styleOf(wrapper.find('tbody td').element).zIndex).toBe('1');
    });
});
