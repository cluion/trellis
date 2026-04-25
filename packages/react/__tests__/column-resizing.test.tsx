import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrellisContext } from '../src/context';
import { useTrellis } from '../src/hooks/use-trellis';
import { ResizeHandle } from '../src/components/resize-handle';
import { Th } from '../src/components/th';
import { createColumnResizingPlugin } from '@trellisjs/plugin-column-resizing';
import type { ColumnDef } from '@trellisjs/core';
import type { ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

const data: User[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
];

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
];

function createWrapper(extraColumns?: ColumnDef<User>) {
  const cols = extraColumns ?? columns;
  return function Wrapper({ children }: { children: ReactNode }) {
    const { api } = useTrellis<User>({
      data,
      columns: cols,
      plugins: [createColumnResizingPlugin()],
    });
    return (
      <TrellisContext.Provider value={api}>
        {children}
      </TrellisContext.Provider>
    );
  };
}

describe('ResizeHandle', () => {
  it('渲染 resize handle 元件', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ResizeHandle columnId="name" />
      </Wrapper>,
    );

    const handle = document.querySelector('.trellis-resize-handle');
    expect(handle).toBeTruthy();
  });

  it('mousedown 觸發 resize:start', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ResizeHandle columnId="name" />
      </Wrapper>,
    );

    const handle = document.querySelector('.trellis-resize-handle') as HTMLElement;
    fireEvent.mouseDown(handle, { clientX: 100 });

    // cursor 和 userSelect 應該改變
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // 清理
    fireEvent.mouseUp(document);
  });

  it('完整拖曳流程：mousedown → mousemove → mouseup', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ResizeHandle columnId="name" />
      </Wrapper>,
    );

    const handle = document.querySelector('.trellis-resize-handle') as HTMLElement;

    // 按下滑鼠
    fireEvent.mouseDown(handle, { clientX: 100 });

    // 移動滑鼠（+50px）
    fireEvent.mouseMove(document, { clientX: 150 });

    // 放開滑鼠
    fireEvent.mouseUp(document);

    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });
});

describe('Th + ResizeHandle 整合', () => {
  it('插件啟用時顯示 ResizeHandle', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <table>
          <thead>
            <tr>
              <Th column={columns[0]} />
            </tr>
          </thead>
        </table>
      </Wrapper>,
    );

    const th = screen.getByText('Name').closest('th');
    expect(th).toBeTruthy();
    expect(th!.style.position).toBe('relative');

    const handle = th!.querySelector('.trellis-resize-handle');
    expect(handle).toBeTruthy();
  });

  it('resizable: false 時不顯示 ResizeHandle', () => {
    const cols: ColumnDef<User>[] = [
      { id: 'name', accessor: 'name', header: 'Name', resizable: false },
      { id: 'email', accessor: 'email', header: 'Email' },
    ];
    const Wrapper = createWrapper(cols);
    render(
      <Wrapper>
        <table>
          <thead>
            <tr>
              <Th column={cols[0]} />
            </tr>
          </thead>
        </table>
      </Wrapper>,
    );

    const th = screen.getByText('Name').closest('th');
    const handle = th!.querySelector('.trellis-resize-handle');
    expect(handle).toBeNull();
  });

  it('未啟用插件時不顯示 ResizeHandle', () => {
    function WrapperNoPlugin({ children }: { children: ReactNode }) {
      const { api } = useTrellis<User>({ data, columns });
      return (
        <TrellisContext.Provider value={api}>
          {children}
        </TrellisContext.Provider>
      );
    }

    render(
      <WrapperNoPlugin>
        <table>
          <thead>
            <tr>
              <Th column={columns[0]} />
            </tr>
          </thead>
        </table>
      </WrapperNoPlugin>,
    );

    const th = screen.getByText('Name').closest('th');
    const handle = th!.querySelector('.trellis-resize-handle');
    expect(handle).toBeNull();
  });

  it('設定 defaultWidth 當 column 沒有 width 時', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <table>
          <thead>
            <tr>
              <Th column={columns[0]} />
            </tr>
          </thead>
        </table>
      </Wrapper>,
    );

    const th = screen.getByText('Name').closest('th');
    expect(th!.style.width).toBe('150px');
  });

  it('調整欄寬後 Th 的 width 更新', () => {
    let apiRef: any;
    function WrapperWithApi({ children }: { children: ReactNode }) {
      const { api } = useTrellis<User>({
        data,
        columns,
        plugins: [createColumnResizingPlugin()],
      });
      apiRef = api;
      return (
        <TrellisContext.Provider value={api}>
          {children}
        </TrellisContext.Provider>
      );
    }

    const { rerender } = render(
      <WrapperWithApi>
        <table>
          <thead>
            <tr>
              <Th column={columns[0]} />
            </tr>
          </thead>
        </table>
      </WrapperWithApi>,
    );

    // 調整寬度
    apiRef.emit('resize:column', { columnId: 'name', width: 200 });

    // 重新渲染
    rerender(
      <WrapperWithApi>
        <table>
          <thead>
            <tr>
              <Th column={columns[0]} />
            </tr>
          </thead>
        </table>
      </WrapperWithApi>,
    );

    const th = screen.getByText('Name').closest('th');
    expect(th!.style.width).toBe('200px');
  });
});
