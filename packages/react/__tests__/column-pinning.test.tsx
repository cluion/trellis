import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from '../src/components/table';
import { useTrellis } from '../src/hooks/use-trellis';
import { TrellisContext } from '../src/context';
import { createColumnPinningPlugin } from '@trellisjs/plugin-column-pinning';
import type { ColumnDef } from '@trellisjs/core';
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
  { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
  { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'city', accessor: 'city', header: 'City' },
];

function Wrapper({ children }: { children: ReactNode }) {
  const { api } = useTrellis({
    data,
    columns,
    plugins: [createColumnPinningPlugin()],
  });
  return (
    <TrellisContext.Provider value={api}>
      {children}
    </TrellisContext.Provider>
  );
}

describe('Column Pinning - Th/Td sticky styles', () => {
  it('applies sticky left style to pinned columns', () => {
    const { container } = render(<Table />, { wrapper: Wrapper });
    const thElements = container.querySelectorAll('thead th');

    // First th (ID) - first left pin, offset=0
    expect(thElements[0]).toHaveStyle({ position: 'sticky', left: '0px' });

    // Second th (Name) - second left pin, offset=60
    expect(thElements[1]).toHaveStyle({ position: 'sticky', left: '60px' });

    // Third th (Email) - not pinned
    expect(thElements[2]).not.toHaveStyle({ position: 'sticky' });
  });

  it('applies sticky left style to td elements', () => {
    const { container } = render(<Table />, { wrapper: Wrapper });
    const firstRow = container.querySelectorAll('tbody tr')[0];
    const tdElements = firstRow!.querySelectorAll('td');

    // First td (ID) - pinned left, offset=0
    expect(tdElements[0]).toHaveStyle({ position: 'sticky', left: '0px' });

    // Second td (Name) - pinned left, offset=60
    expect(tdElements[1]).toHaveStyle({ position: 'sticky', left: '60px' });

    // Third td (Email) - not pinned
    expect(tdElements[2]).not.toHaveStyle({ position: 'sticky' });
  });
});

describe('Column Pinning - Shadow borders', () => {
  it('adds shadow class to last left-pinned column in thead', () => {
    const { container } = render(<Table />, { wrapper: Wrapper });
    const thElements = container.querySelectorAll('thead th');

    // Name is the last left-pinned column
    expect(thElements[1]).toHaveClass('trellis-pin-shadow--left');

    // ID is not the last left-pinned
    expect(thElements[0]).not.toHaveClass('trellis-pin-shadow--left');
  });

  it('adds shadow class to last left-pinned column in tbody', () => {
    const { container } = render(<Table />, { wrapper: Wrapper });
    const firstRow = container.querySelectorAll('tbody tr')[0];
    const tdElements = firstRow!.querySelectorAll('td');

    // Name is the last left-pinned column
    expect(tdElements[1]).toHaveClass('trellis-pin-shadow--left');
  });
});

describe('Column Pinning - Table wrapper overflow', () => {
  it('adds overflowX: auto when columns are pinned', () => {
    const { container } = render(<Table />, { wrapper: Wrapper });
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ overflowX: 'auto' });
  });

  it('does not add overflowX when no columns are pinned', () => {
    const noPinColumns: ColumnDef<User>[] = [
      { id: 'id', accessor: 'id', header: 'ID' },
      { id: 'name', accessor: 'name', header: 'Name' },
    ];

    function NoPinWrapper({ children }: { children: ReactNode }) {
      const { api } = useTrellis({
        data,
        columns: noPinColumns,
      });
      return (
        <TrellisContext.Provider value={api}>
          {children}
        </TrellisContext.Provider>
      );
    }

    const { container } = render(<Table />, { wrapper: NoPinWrapper });
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toHaveStyle({ overflowX: 'auto' });
  });
});

describe('Column Pinning - z-index with stickyHeader', () => {
  it('th pinned columns have z-index: 3 when stickyHeader enabled', () => {
    const { container } = render(<Table stickyHeader />, { wrapper: Wrapper });
    const thElements = container.querySelectorAll('thead th');

    // Pinned th with stickyHeader should have z-index: 3
    expect(thElements[0]).toHaveStyle({ zIndex: '3' });
    expect(thElements[1]).toHaveStyle({ zIndex: '3' });
  });

  it('td pinned columns have z-index: 1', () => {
    const { container } = render(<Table />, { wrapper: Wrapper });
    const firstRow = container.querySelectorAll('tbody tr')[0];
    const tdElements = firstRow!.querySelectorAll('td');

    // Pinned td should have z-index: 1
    expect(tdElements[0]).toHaveStyle({ zIndex: '1' });
    expect(tdElements[1]).toHaveStyle({ zIndex: '1' });
  });
});
