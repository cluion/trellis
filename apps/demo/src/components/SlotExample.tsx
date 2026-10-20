import type { CellContext, ColumnDef } from '@trellisjs/core';
import { Table, TrellisContext, useTrellis } from '@trellisjs/react';
import type { User } from '../data/mock-data';

const roleColors: Record<string, string> = {
    Engineer: '#3b82f6',
    Manager: '#8b5cf6',
    Designer: '#ec4899',
    QA: '#f59e0b',
    PM: '#10b981',
    Director: '#ef4444',
    VP: '#dc2626',
    Intern: '#6b7280',
};

function RoleBadge({ value }: CellContext<User>) {
    const role = String(value);
    const color = roleColors[role] ?? '#6b7280';

    return (
        <span
            style={{
                background: `${color}20`,
                color,
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
            }}
        >
            {role}
        </span>
    );
}

function AgeBar({ value }: CellContext<User>) {
    const age = Number(value);
    const pct = Math.min(100, (age / 50) * 100);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{age}</span>
            <div
                style={{
                    flex: 1,
                    background: '#e5e7eb',
                    borderRadius: 4,
                    height: 6,
                }}
            >
                <div
                    style={{
                        width: `${pct}%`,
                        background: '#3b82f6',
                        borderRadius: 4,
                        height: 6,
                    }}
                />
            </div>
        </div>
    );
}

const columns: ColumnDef<User>[] = [
    { id: 'name', accessor: 'name', header: '姓名' },
    { id: 'role', accessor: 'role', header: '職位', renderCell: RoleBadge },
    { id: 'city', accessor: 'city', header: '城市' },
    {
        id: 'age',
        accessor: 'age',
        header: '年齡',
        align: 'center',
        renderCell: AgeBar,
    },
];

interface SlotExampleProps {
    data: User[];
}

export function SlotExample({ data }: SlotExampleProps) {
    const { api } = useTrellis<User>({ data, columns });

    return (
        <div>
            <p className="info">
                renderCell — 自訂儲存格內容（職位徽章、年齡條）
            </p>
            <TrellisContext.Provider value={api}>
                <Table className="trellis-table" />
            </TrellisContext.Provider>
        </div>
    );
}
