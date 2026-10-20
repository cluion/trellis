import { render, screen, fireEvent } from '@testing-library/react';
import type { CellContext, ColumnDef, HeaderContext } from '@trellisjs/core';
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { Table } from '../src/components/table';
import { TrellisContext } from '../src/context';
import { useTrellis } from '../src/hooks/use-trellis';

interface User {
    id: number;
    name: string;
    role: string;
}

const data: User[] = [
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'Viewer' },
];

function renderTable(columns: ColumnDef<User>[]) {
    let api!: ReturnType<typeof useTrellis<User>>['api'];

    function Wrapper({ children }: { children: ReactNode }) {
        api = useTrellis<User>({ data, columns, rowId: 'id' }).api;

        return (
            <TrellisContext.Provider value={api}>
                {children}
            </TrellisContext.Provider>
        );
    }

    const result = render(<Table />, { wrapper: Wrapper });

    return { ...result, api };
}

describe('renderCell', () => {
    it('renders the returned node instead of the plain value', () => {
        renderTable([
            { id: 'name', accessor: 'name', header: 'Name' },
            {
                id: 'role',
                accessor: 'role',
                header: 'Role',
                renderCell: ({ value }) => (
                    <span className="badge">{String(value)}</span>
                ),
            },
        ]);

        const badges = screen.getAllByText(/Admin|Viewer/);

        expect(badges.map((el) => el.className)).toEqual(['badge', 'badge']);
        expect(screen.getByText('Alice').tagName).toBe('TD');
    });

    it('receives the row, value, column and api', () => {
        const renderCell = vi.fn((ctx: CellContext<User>) => ctx.row.id);
        const column: ColumnDef<User> = {
            id: 'name',
            accessor: 'name',
            header: 'Name',
            renderCell,
        };
        const { api } = renderTable([column]);
        const ctx = renderCell.mock.calls[0][0];

        expect(ctx.row.original).toEqual(data[0]);
        expect(ctx.value).toBe('Alice');
        expect(ctx.column.id).toBe('name');
        expect(ctx.api).toBe(api);
    });

    it('can act on the table through the api', () => {
        renderTable([
            { id: 'name', accessor: 'name', header: 'Name' },
            {
                id: 'actions',
                accessor: 'id',
                header: 'Actions',
                renderCell: ({ row, api }) => (
                    <button onClick={() => api.removeRow(row.id)}>
                        Delete {row.original.name}
                    </button>
                ),
            },
        ]);

        fireEvent.click(screen.getByText('Delete Alice'));

        expect(screen.queryByText('Alice')).toBeNull();
        expect(screen.getByText('Bob')).toBeTruthy();
    });
});

describe('renderHeader', () => {
    it('renders the returned node instead of the header text', () => {
        const renderHeader = vi.fn(({ column }: HeaderContext<User>) => (
            <em>{column.header}!</em>
        ));

        const { api } = renderTable([
            { id: 'name', accessor: 'name', header: 'Name', renderHeader },
        ]);

        expect(screen.getByText('Name!').tagName).toBe('EM');
        expect(renderHeader.mock.calls[0][0].api).toBe(api);
    });

    it('keeps the plain header text without renderHeader', () => {
        renderTable([{ id: 'name', accessor: 'name', header: 'Name' }]);

        expect(screen.getByText('Name').tagName).toBe('TH');
    });

    it('can emit events, e.g. to sort from the header', () => {
        const { api } = renderTable([
            {
                id: 'name',
                accessor: 'name',
                header: 'Name',
                renderHeader: ({ column, api }) => (
                    <button
                        onClick={() =>
                            api.emit('sort:change', {
                                columnId: column.id,
                                direction: 'desc',
                            })
                        }
                    >
                        {column.header}
                    </button>
                ),
            },
        ]);
        const onSort = vi.fn();

        api.on('sort:change', onSort);
        fireEvent.click(screen.getByText('Name'));

        expect(onSort).toHaveBeenCalledWith({
            columnId: 'name',
            direction: 'desc',
        });
    });
});
