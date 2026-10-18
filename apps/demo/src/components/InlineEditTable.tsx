import type { ColumnDef } from '@trellisjs/core';
import { createInlineEditPlugin } from '@trellisjs/plugin-inline-edit';
import type {
    InlineEditErrorPayload,
    InlineEditSavePayload,
    InlineEditStartPayload,
} from '@trellisjs/plugin-inline-edit';
import { useTrellis } from '@trellisjs/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { User } from '../data/mock-data';

const columns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID', width: 60, align: 'center' },
    { id: 'name', accessor: 'name', header: '姓名' },
    { id: 'email', accessor: 'email', header: 'Email' },
    { id: 'age', accessor: 'age', header: '年齡', width: 80, align: 'center' },
    { id: 'role', accessor: 'role', header: '職位' },
    { id: 'city', accessor: 'city', header: '城市' },
];

interface InlineEditTableProps {
    data: User[];
}

export function InlineEditTable({ data }: InlineEditTableProps) {
    const [tableData, setTableData] = useState(data);
    const [log, setLog] = useState<string[]>([]);
    const [editing, setEditing] = useState<{
        rowId: string | number;
        columnId: string;
    } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const addLog = useCallback((msg: string) => {
        setLog((prev) => [...prev.slice(-9), msg]);
    }, []);

    const { api } = useTrellis<User>({
        data: tableData,
        columns,
        plugins: [
            createInlineEditPlugin({
                editable: (colId) => colId !== 'id',
                trigger: 'dblclick',
                editBehavior: 'commit',
                validate: (colId, value) => {
                    if (
                        colId === 'name' &&
                        typeof value === 'string' &&
                        value.trim() === ''
                    ) {
                        return '姓名不能為空';
                    }

                    if (
                        colId === 'age' &&
                        typeof value === 'number' &&
                        (value < 0 || value > 150)
                    ) {
                        return '年齡必須在 0-150 之間';
                    }

                    return null;
                },
            }),
        ],
    });

    useEffect(() => {
        const off1 = api.on('inline-edit:start', (raw) => {
            const payload = raw as InlineEditStartPayload;
            setEditing({ rowId: payload.rowId, columnId: payload.columnId });
            setEditValue(String(payload.value ?? ''));
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 0);
        });

        const off2 = api.on('inline-edit:save', (raw) => {
            const payload = raw as InlineEditSavePayload;
            setTableData((prev) =>
                prev.map((row) =>
                    row.id === payload.rowId
                        ? { ...row, [payload.columnId]: payload.value }
                        : row,
                ),
            );
            addLog(
                `已儲存：${payload.columnId} = "${payload.value}" (舊值: "${payload.oldValue}")`,
            );
            setEditing(null);
            setError(null);
        });

        const off3 = api.on('inline-edit:stop', () => {
            setEditing(null);
            setError(null);
        });

        const off4 = api.on('inline-edit:error', (raw) => {
            const payload = raw as InlineEditErrorPayload;
            setError(payload.error);
            addLog(`驗證失敗：${payload.error}`);
        });

        return () => {
            off1();
            off2();
            off3();
            off4();
        };
    }, [api, addLog]);

    const handleCellClick = (
        rowId: string | number,
        columnId: string,
        value: unknown,
    ) => {
        if (columnId === 'id') {
            return;
        }

        api.emit('inline-edit:start', { rowId, columnId, value });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            api.emit('inline-edit:keydown', { key: 'Enter' });
        } else if (e.key === 'Escape') {
            api.emit('inline-edit:keydown', { key: 'Escape' });
        } else if (e.key === 'Tab') {
            e.preventDefault();
            api.emit('inline-edit:keydown', {
                key: 'Tab',
                shiftKey: e.shiftKey,
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
        api.emit('inline-edit:update', { value: e.target.value });
    };

    const state = api.getState();

    return (
        <div>
            <div className="toolbar">
                <span
                    className="info"
                    style={{ fontSize: '0.85em', color: '#888' }}
                >
                    雙擊儲存格進入編輯模式。Enter 確認、Escape 取消、Tab
                    跳至下一格。
                </span>
            </div>

            <table className="trellis-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.id}
                                style={{
                                    width: col.width,
                                    textAlign: col.align,
                                }}
                            >
                                {String(col.header)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {state.data.map((row) => (
                        <tr key={row.id}>
                            {columns.map((col) => {
                                const isEditing =
                                    editing?.rowId === row.id &&
                                    editing?.columnId === col.id;
                                const value =
                                    row.original[col.accessor as keyof User];

                                return (
                                    <td
                                        key={col.id}
                                        style={{ textAlign: col.align }}
                                        onDoubleClick={() =>
                                            handleCellClick(
                                                row.id,
                                                col.id,
                                                value,
                                            )
                                        }
                                    >
                                        {isEditing ? (
                                            <div
                                                style={{ position: 'relative' }}
                                            >
                                                <input
                                                    ref={inputRef}
                                                    type={
                                                        col.id === 'age'
                                                            ? 'number'
                                                            : 'text'
                                                    }
                                                    value={editValue}
                                                    onChange={handleChange}
                                                    onKeyDown={handleKeyDown}
                                                    style={{
                                                        width: '100%',
                                                        padding: '2px 4px',
                                                        border: error
                                                            ? '2px solid #ef4444'
                                                            : '2px solid #3b82f6',
                                                        borderRadius: 4,
                                                        outline: 'none',
                                                        fontSize: 'inherit',
                                                    }}
                                                />
                                                {error && (
                                                    <div
                                                        style={{
                                                            position:
                                                                'absolute',
                                                            top: '100%',
                                                            left: 0,
                                                            zIndex: 10,
                                                            background:
                                                                '#fef2f2',
                                                            border: '1px solid #fecaca',
                                                            borderRadius: 4,
                                                            padding: '4px 8px',
                                                            fontSize: '0.8em',
                                                            color: '#dc2626',
                                                            whiteSpace:
                                                                'nowrap',
                                                        }}
                                                    >
                                                        {error}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span
                                                style={{
                                                    cursor:
                                                        col.id !== 'id'
                                                            ? 'pointer'
                                                            : 'default',
                                                }}
                                            >
                                                {String(value ?? '')}
                                            </span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {log.length > 0 && (
                <div
                    style={{
                        marginTop: 12,
                        padding: 8,
                        background: '#f8f9fa',
                        borderRadius: 4,
                        fontSize: '0.85em',
                    }}
                >
                    <strong>事件日誌：</strong>
                    {log.map((msg, i) => (
                        <div key={i} style={{ color: '#555' }}>
                            {msg}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
