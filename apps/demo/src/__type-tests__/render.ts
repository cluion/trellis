/**
 * Compile-time tests for ColumnDef.renderCell / renderHeader, checked by `pnpm types:check`.
 * Every @ts-expect-error must really error, otherwise tsc fails.
 */
import type { ColumnDef, DataId, TrellisAPI } from '@trellisjs/core';
import '@trellisjs/plugin-sort';

interface User {
    id: number;
    name: string;
}

export const columns: ColumnDef<User>[] = [
    {
        id: 'name',
        accessor: 'name',
        header: 'Name',
        renderCell: ({ row, value, column, api }) => {
            const name: string = row.original.name;
            const id: DataId = row.id;
            const typedApi: TrellisAPI<User> = api;

            // @ts-expect-error the row is typed as User
            void row.original.missing;
            api.removeRow(id);
            api.updateRow(id, { name: 'renamed' });
            // @ts-expect-error updateRow only accepts fields of User
            api.updateRow(id, { age: 1 });

            return [name, value, column.id, typedApi];
        },
        renderHeader: ({ column, api }) => {
            api.emit('sort:change', { columnId: column.id, direction: 'asc' });
            // @ts-expect-error sort:change payloads are still checked
            api.emit('sort:change', { columnId: column.id, direction: 'up' });

            return column.header;
        },
    },
];
