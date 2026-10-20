import type { ColumnDef, HeaderContext, TrellisAPI } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { Table, TrellisContext, useTrellis } from '@trellisjs/react';
import type { User } from '../data/mock-data';

function toggleSort(api: TrellisAPI<User>, columnId: string, append: boolean) {
    const { sortBy } = api.getState().sorting;
    const current = sortBy.find((c) => c.columnId === columnId)?.direction;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';

    if (next === null && !append) {
        api.emit('sort:change', { columnId: '', direction: null });
    } else {
        api.emit('sort:change', { columnId, direction: next, append });
    }
}

function sortIndicator(api: TrellisAPI<User>, columnId: string) {
    const { sortBy } = api.getState().sorting;
    const index = sortBy.findIndex((c) => c.columnId === columnId);
    const criterion = sortBy[index];

    if (!criterion) {
        return ' ⇅';
    }

    const arrow = criterion.direction === 'asc' ? ' ▲' : ' ▼';

    return sortBy.length > 1 ? `${arrow}${index + 1}` : arrow;
}

// 用 renderHeader 讓表頭可以點擊排序，Shift+Click 追加為多欄排序
function renderSortHeader({ column, api }: HeaderContext<User>) {
    return (
        <button
            type="button"
            className="sort-header"
            onClick={(e) => toggleSort(api, column.id, e.shiftKey)}
        >
            {column.header}
            <span className="sort-indicator">
                {sortIndicator(api, column.id)}
            </span>
        </button>
    );
}

const baseColumns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID', width: 60, align: 'center' },
    { id: 'name', accessor: 'name', header: '姓名' },
    { id: 'email', accessor: 'email', header: 'Email' },
    { id: 'age', accessor: 'age', header: '年齡', width: 80, align: 'center' },
    { id: 'role', accessor: 'role', header: '職位' },
    { id: 'city', accessor: 'city', header: '城市', sortable: false },
    { id: 'joinDate', accessor: 'joinDate', header: '入職日期' },
];

const columns = baseColumns.map((col) =>
    col.sortable === false ? col : { ...col, renderHeader: renderSortHeader },
);

interface SortableTableProps {
    data: User[];
}

export function SortableTable({ data }: SortableTableProps) {
    const { api } = useTrellis<User>({
        data,
        columns,
        plugins: [createSortPlugin()],
    });

    const { sortBy } = api.getState().sorting;

    return (
        <div>
            <p className="info">
                {sortBy.length > 0
                    ? `排序：${sortBy.map((c) => `${c.columnId} (${c.direction === 'asc' ? '升序' : '降序'})`).join(', ')}`
                    : '點擊表頭排序，Shift+Click 多欄排序（城市欄不可排序）'}
            </p>
            <TrellisContext.Provider value={api}>
                <Table className="trellis-table" />
            </TrellisContext.Provider>
        </div>
    );
}
