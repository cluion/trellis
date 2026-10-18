import type {
    TrellisPlugin,
    TrellisAPI,
    DataRow,
    ColumnDef,
    DataId,
} from '@trellisjs/core';

export interface InlineEditPluginOptions {
    editable?: (columnId: string, row: DataRow) => boolean;
    trigger?: 'click' | 'dblclick';
    validate?: (
        columnId: string,
        value: unknown,
        row: DataRow,
    ) => string | null;
    editBehavior?: 'cancel' | 'commit';
}

export interface EditingCell {
    rowId: DataId;
    columnId: string;
    value: unknown;
}

export interface InlineEditStartPayload {
    rowId: DataId;
    columnId: string;
    value: unknown;
}

export interface InlineEditSavePayload {
    rowId: DataId;
    columnId: string;
    value: unknown;
    oldValue: unknown;
}

export interface InlineEditStopPayload {
    rowId: DataId;
    columnId: string;
}

export interface InlineEditErrorPayload {
    rowId: DataId;
    columnId: string;
    value: unknown;
    error: string;
}

const DEFAULT_OPTIONS: Required<Omit<InlineEditPluginOptions, 'validate'>> = {
    editable: () => true,
    trigger: 'dblclick',
    editBehavior: 'cancel',
};

function getCellValue(row: DataRow, column: ColumnDef | undefined): unknown {
    if (!column) {
        return undefined;
    }

    const { accessor } = column;

    return typeof accessor === 'function'
        ? accessor(row.original)
        : row.original[accessor];
}

export interface InlineEditPluginInstance extends TrellisPlugin {
    getEditingCell: () => EditingCell | null;
}

export function createInlineEditPlugin(
    options: InlineEditPluginOptions = {},
): InlineEditPluginInstance {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let apiRef: TrellisAPI | null = null;
    let editingCell: EditingCell | null = null;

    function getEditableColumnsForRow(row: DataRow): ColumnDef[] {
        if (!apiRef) {
            return [];
        }

        const state = apiRef.getState();

        return state.columns.filter((col) => opts.editable(col.id, row));
    }

    function startEditing(
        rowId: DataId,
        columnId: string,
        value: unknown,
    ): void {
        editingCell = { rowId, columnId, value };
    }

    function commitCurrentEdit(): boolean {
        if (!editingCell || !apiRef) {
            return false;
        }

        const state = apiRef.getState();
        const row = state.data.find((r) => r.id === editingCell!.rowId);

        if (!row) {
            cancelCurrentEdit();

            return true;
        }

        const column = state.columns.find(
            (c) => c.id === editingCell!.columnId,
        );
        const oldValue = getCellValue(row, column);

        if (opts.validate) {
            const error = opts.validate(
                editingCell.columnId,
                editingCell.value,
                row,
            );

            if (error !== null) {
                apiRef.emit('inline-edit:error', {
                    rowId: editingCell.rowId,
                    columnId: editingCell.columnId,
                    value: editingCell.value,
                    error,
                } as InlineEditErrorPayload);

                return false;
            }
        }

        apiRef.emit('inline-edit:save', {
            rowId: editingCell.rowId,
            columnId: editingCell.columnId,
            value: editingCell.value,
            oldValue,
        } as InlineEditSavePayload);

        const prev = editingCell;
        editingCell = null;
        apiRef.emit('inline-edit:stop', {
            rowId: prev.rowId,
            columnId: prev.columnId,
        } as InlineEditStopPayload);

        return true;
    }

    function cancelCurrentEdit(): void {
        if (!editingCell || !apiRef) {
            return;
        }

        const prev = editingCell;
        editingCell = null;
        apiRef.emit('inline-edit:stop', {
            rowId: prev.rowId,
            columnId: prev.columnId,
        } as InlineEditStopPayload);
    }

    function handleSwitchCell(
        targetRowId: DataId,
        targetColumnId: string,
        value: unknown,
    ): void {
        if (editingCell) {
            if (opts.editBehavior === 'commit') {
                commitCurrentEdit();
            } else {
                cancelCurrentEdit();
            }
        }

        startEditing(targetRowId, targetColumnId, value);
    }

    function findNextEditable(
        currentRowId: DataId,
        currentColumnId: string,
        direction: 1 | -1,
    ): { rowId: DataId; columnId: string; value: unknown } | null {
        if (!apiRef) {
            return null;
        }

        const state = apiRef.getState();
        const currentRowIdx = state.data.findIndex(
            (r) => r.id === currentRowId,
        );

        if (currentRowIdx === -1) {
            return null;
        }

        const editableColsForCurrentRow = getEditableColumnsForRow(
            state.data[currentRowIdx],
        );
        const currentColIdx = editableColsForCurrentRow.findIndex(
            (c) => c.id === currentColumnId,
        );

        if (direction === 1) {
            for (
                let i = currentColIdx + 1;
                i < editableColsForCurrentRow.length;
                i++
            ) {
                const col = editableColsForCurrentRow[i];

                return {
                    rowId: currentRowId,
                    columnId: col.id,
                    value: getCellValue(state.data[currentRowIdx], col),
                };
            }

            for (let r = currentRowIdx + 1; r < state.data.length; r++) {
                const row = state.data[r];
                const editableCols = getEditableColumnsForRow(row);

                if (editableCols.length > 0) {
                    const col = editableCols[0];

                    return {
                        rowId: row.id,
                        columnId: col.id,
                        value: getCellValue(row, col),
                    };
                }
            }
        } else {
            for (let i = currentColIdx - 1; i >= 0; i--) {
                const col = editableColsForCurrentRow[i];

                return {
                    rowId: currentRowId,
                    columnId: col.id,
                    value: getCellValue(state.data[currentRowIdx], col),
                };
            }

            for (let r = currentRowIdx - 1; r >= 0; r--) {
                const row = state.data[r];
                const editableCols = getEditableColumnsForRow(row);

                if (editableCols.length > 0) {
                    const col = editableCols[editableCols.length - 1];

                    return {
                        rowId: row.id,
                        columnId: col.id,
                        value: getCellValue(row, col),
                    };
                }
            }
        }

        return null;
    }

    return {
        name: 'inline-edit',

        getEditingCell: () => editingCell,

        install(api: TrellisAPI) {
            apiRef = api;

            // Listen for external start requests (from UI layer)
            api.on('inline-edit:start', (payload) => {
                if (
                    !payload ||
                    typeof payload !== 'object' ||
                    !('rowId' in payload)
                ) {
                    return;
                }

                const { rowId, columnId, value } =
                    payload as InlineEditStartPayload;

                if (
                    editingCell &&
                    editingCell.rowId === rowId &&
                    editingCell.columnId === columnId
                ) {
                    return;
                }

                const state = api.getState();
                const row = state.data.find((r) => r.id === rowId);

                if (row && !opts.editable(columnId, row)) {
                    return;
                }

                handleSwitchCell(rowId, columnId, value);
            });

            api.on('inline-edit:commit', () => {
                commitCurrentEdit();
            });

            api.on('inline-edit:cancel', () => {
                cancelCurrentEdit();
            });

            api.on('inline-edit:keydown', (payload) => {
                if (
                    !editingCell ||
                    !payload ||
                    typeof payload !== 'object' ||
                    !('key' in payload)
                ) {
                    return;
                }

                const { key, shiftKey } = payload as {
                    key: string;
                    shiftKey?: boolean;
                };

                if (key === 'Enter') {
                    commitCurrentEdit();
                } else if (key === 'Escape') {
                    cancelCurrentEdit();
                } else if (key === 'Tab') {
                    const direction = shiftKey ? -1 : 1;
                    const next = findNextEditable(
                        editingCell.rowId,
                        editingCell.columnId,
                        direction,
                    );
                    const committed = commitCurrentEdit();

                    if (committed && next) {
                        startEditing(next.rowId, next.columnId, next.value);
                        api.emit(
                            'inline-edit:start',
                            next as InlineEditStartPayload,
                        );
                    }
                }
            });

            api.on('inline-edit:update', (payload) => {
                if (
                    !editingCell ||
                    !payload ||
                    typeof payload !== 'object' ||
                    !('value' in payload)
                ) {
                    return;
                }

                const { value } = payload as { value: unknown };
                editingCell = { ...editingCell, value };
            });
        },

        destroy() {
            if (editingCell && apiRef) {
                cancelCurrentEdit();
            }

            editingCell = null;
            apiRef = null;
        },
    };
}
