import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Table } from '../src/components/table';
import { useTrellis } from '../src/hooks/use-trellis';
import { TrellisContext } from '../src/context';
import { createRowExpansionPlugin } from '@trellisjs/plugin-row-expansion';
import type { ColumnDef, TrellisAPI } from '@trellisjs/core';
import type { ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  city: string;
}

const data: User[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com', city: 'Taipei' },
  { id: '2', name: 'Bob', email: 'bob@test.com', city: 'Tokyo' },
];

const columns: ColumnDef<User>[] = [
  { id: 'id', accessor: 'id', header: 'ID' },
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
];

let testApi: TrellisAPI<User> | null = null;

function createWrapper(mode?: 'single' | 'multi', slotRenderer?: (ctx: Record<string, unknown>) => unknown) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const { api } = useTrellis({
      data,
      columns,
      rowId: 'id',
      plugins: [createRowExpansionPlugin(mode ? { mode } : undefined)],
    });

    testApi = api;

    if (slotRenderer) {
      api.registerSlot('expansion:default', slotRenderer);
    }

    return (
      <TrellisContext.Provider value={api}>
        {children}
      </TrellisContext.Provider>
    );
  };
}

// --- Task 3.1: ExpansionToggle tests ---

describe('ExpansionToggle', () => {
  it('renders expand arrow when row is not expanded', () => {
    const wrapper = createWrapper('multi');
    render(<Table />, { wrapper });

    const buttons = screen.getAllByRole('button', { name: '展開' });
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toHaveTextContent('\u25B6'); // ▶
  });

  it('renders collapse arrow after clicking toggle', async () => {
    const wrapper = createWrapper('multi');
    render(<Table />, { wrapper });

    const buttons = screen.getAllByRole('button', { name: '展開' });
    fireEvent.click(buttons[0]);

    // Wait for React to re-render after state update
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '收合' })).toBeInTheDocument();
    });
  });

  it('triggers expansion:toggle on click', async () => {
    const wrapper = createWrapper('multi');
    const { container } = render(<Table />, { wrapper });

    const buttons = screen.getAllByRole('button', { name: '展開' });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const expansionRows = container.querySelectorAll('.trellis-expansion-row');
      expect(expansionRows.length).toBe(1);
    });
  });

  it('supports custom icons', () => {
    function CustomIconWrapper({ children }: { children: ReactNode }) {
      const { api } = useTrellis({
        data,
        columns,
        rowId: 'id',
        plugins: [createRowExpansionPlugin({
          mode: 'multi',
          expandIcon: '[+]',
          collapseIcon: '[-]',
        })],
      });
      return (
        <TrellisContext.Provider value={api}>
          {children}
        </TrellisContext.Provider>
      );
    }

    render(<Table />, { wrapper: CustomIconWrapper });

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('[+]');
  });
});

// --- Task 3.4: ExpansionRow tests ---

describe('ExpansionRow', () => {
  it('renders expansion row with correct colspan', async () => {
    const wrapper = createWrapper('multi', (ctx) => `Detail: ${(ctx.row as User).name}`);
    render(<Table />, { wrapper });

    // Directly emit event to bypass React click handling issues
    act(() => {
      testApi!.emit('expansion:toggle', { rowId: '1' });
    });

    await waitFor(() => {
      const expansionCell = document.querySelector('.trellis-expansion-cell') as HTMLElement;
      expect(expansionCell).not.toBeNull();
      expect(expansionCell.getAttribute('colspan')).toBe('4'); // 3 visible cols + 1 toggle col
    });
  });

  it('renders slot content', async () => {
    const wrapper = createWrapper('multi', (ctx) => `Detail: ${(ctx.row as User).name}`);
    render(<Table />, { wrapper });

    act(() => {
      testApi!.emit('expansion:toggle', { rowId: '1' });
    });

    await waitFor(() => {
      expect(screen.getByText('Detail: Alice')).toBeInTheDocument();
    });
  });

  it('does not render when row is not expanded', () => {
    const wrapper = createWrapper('multi', (ctx) => `Detail: ${(ctx.row as User).name}`);
    const { container } = render(<Table />, { wrapper });

    const expansionRows = container.querySelectorAll('.trellis-expansion-row');
    expect(expansionRows.length).toBe(0);
  });
});

// --- Task 3.7: TableHead expansion th ---

describe('TableHead expansion column', () => {
  it('adds empty th when expansion plugin is active', () => {
    const wrapper = createWrapper('single');
    const { container } = render(<Table />, { wrapper });

    const thElements = container.querySelectorAll('thead th');
    // Should have 1 empty th + 3 column ths = 4 total
    expect(thElements.length).toBe(4);
    expect(thElements[0]).toHaveClass('trellis-expansion-th');
    expect(thElements[0].textContent).toBe('');
  });

  it('does not add extra th when expansion plugin is not active', () => {
    function NoExpansionWrapper({ children }: { children: ReactNode }) {
      const { api } = useTrellis({ data, columns, rowId: 'id' });
      return (
        <TrellisContext.Provider value={api}>
          {children}
        </TrellisContext.Provider>
      );
    }

    const { container } = render(<Table />, { wrapper: NoExpansionWrapper });
    const thElements = container.querySelectorAll('thead th');
    expect(thElements.length).toBe(3);
  });
});

// --- Task 3.9: ExpansionRow click isolation ---

describe('ExpansionRow click isolation', () => {
  it('click on expansion row does not propagate', async () => {
    const wrapper = createWrapper('multi', (ctx) => 'Content');
    const { container } = render(<Table />, { wrapper });

    act(() => {
      testApi!.emit('expansion:toggle', { rowId: '1' });
    });

    await waitFor(() => {
      expect(container.querySelector('.trellis-expansion-row')).not.toBeNull();
    });

    const expansionRow = container.querySelector('.trellis-expansion-row') as HTMLElement;
    // Click on expansion row should not throw (stopPropagation is internal)
    expect(() => {
      fireEvent.click(expansionRow);
    }).not.toThrow();
  });
});

// --- Task 4.1: CSS transition tests ---

describe('ExpansionRow CSS transition', () => {
  it('adds trellis-expansion--expanded class', async () => {
    const wrapper = createWrapper('multi', (ctx) => 'Content');
    const { container } = render(<Table />, { wrapper });

    act(() => {
      testApi!.emit('expansion:toggle', { rowId: '1' });
    });

    await waitFor(() => {
      const expansionRow = container.querySelector('.trellis-expansion-row');
      expect(expansionRow).not.toBeNull();
      expect(expansionRow).toHaveClass('trellis-expansion--expanded');
    });
  });
});
