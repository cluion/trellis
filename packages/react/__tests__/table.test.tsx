import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from '../src/components/table';
import { useTrellis } from '../src/hooks/use-trellis';
import { TrellisContext } from '../src/context';
import type { ColumnDef } from '@trellisjs/core';
import type { ReactNode } from 'react';

interface User {
  name: string;
  age: number;
  email: string;
}

const data: User[] = [
  { name: 'Alice', age: 30, email: 'alice@test.com' },
  { name: 'Bob', age: 25, email: 'bob@test.com' },
];

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'age', accessor: 'age', header: 'Age' },
  { id: 'email', accessor: 'email', header: 'Email' },
];

function Wrapper({ children }: { children: ReactNode }) {
  const { api } = useTrellis({ data, columns });
  return (
    <TrellisContext.Provider value={api}>
      {children}
    </TrellisContext.Provider>
  );
}

describe('Table', () => {
  it('renders a table element', () => {
    const { container } = render(
      <Table />,
      { wrapper: Wrapper },
    );
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<Table />, { wrapper: Wrapper });

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<Table />, { wrapper: Wrapper });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders correct number of rows', () => {
    const { container } = render(
      <Table />,
      { wrapper: Wrapper },
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('renders correct number of columns', () => {
    const { container } = render(
      <Table />,
      { wrapper: Wrapper },
    );
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells).toHaveLength(3);
  });
});
