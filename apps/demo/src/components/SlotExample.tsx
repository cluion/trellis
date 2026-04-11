import { useTrellis, TrellisContext, SlotRenderer } from '@trellisjs/react';
import type { ColumnDef } from '@trellisjs/core';
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

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: '姓名' },
  { id: 'role', accessor: 'role', header: '職位' },
  { id: 'city', accessor: 'city', header: '城市' },
  { id: 'age', accessor: 'age', header: '年齡', align: 'center' },
];

interface SlotExampleProps {
  data: User[];
}

export function SlotExample({ data }: SlotExampleProps) {
  const { api } = useTrellis<User>({
    data,
    columns,
  });

  // 註冊自定義 Slot — 職位徽章
  api.registerSlot('role-badge', (ctx) => {
    const role = ctx.value as string;
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
  });

  // 註冊自定義 Slot — 年齡條
  api.registerSlot('age-bar', (ctx) => {
    const age = ctx.value as number;
    const pct = Math.min(100, (age / 50) * 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{age}</span>
        <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 6 }}>
          <div style={{ width: `${pct}%`, background: '#3b82f6', borderRadius: 4, height: 6 }} />
        </div>
      </div>
    );
  });

  const state = api.getState();

  return (
    <div>
      <p className="info">
        Slot 系統 — 自定義儲存格渲染（職位徽章、年齡條）
      </p>
      <TrellisContext.Provider value={api}>
        <table className="trellis-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} style={{ textAlign: col.align }}>
                  {String(col.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.data.map((row) => (
              <tr key={row.id}>
                <td>{String(row.original.name)}</td>
                <td>
                  <SlotRenderer
                    name="role-badge"
                    context={{ column: columns[1], row, value: row.original.role }}
                    fallback={<>{String(row.original.role)}</>}
                  />
                </td>
                <td>{String(row.original.city)}</td>
                <td>
                  <SlotRenderer
                    name="age-bar"
                    context={{ column: columns[3], row, value: row.original.age }}
                    fallback={<>{String(row.original.age)}</>}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TrellisContext.Provider>
    </div>
  );
}
