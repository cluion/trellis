import { TableHead } from './thead';
import { TableBody } from './tbody';
import { VirtualScrollBody } from './virtual-scroll-body';
import { useTrellisContext } from '../context';

export interface TableProps {
  /** 啟用後表頭在垂直滾動時固定於容器頂部 */
  stickyHeader?: boolean;
  /** 啟用虛擬滾動，使用 VirtualScrollBody 取代 TableBody */
  virtualScroll?: boolean;
}

/**
 * 無頭式 Table 元件。
 * 渲染 <table> 包含 <thead> 和 <tbody>。
 */
export function Table({ stickyHeader = false, virtualScroll = false }: TableProps) {
  const api = useTrellisContext();

  const BodyComponent = virtualScroll ? VirtualScrollBody : TableBody;
  const state = api.getState();
  const hasPinnedColumns =
    state.columnPinning &&
    (state.columnPinning.left.length > 0 || state.columnPinning.right.length > 0);

  const wrapperStyle: React.CSSProperties = {};
  if (virtualScroll) wrapperStyle.overflowY = 'auto';
  if (hasPinnedColumns) wrapperStyle.overflowX = 'auto';

  return (
    <div style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}>
      <table>
        <TableHead
          columns={api.getState().columns}
          stickyHeader={stickyHeader}
        />
        <BodyComponent
          data={api.getState().data}
          columns={api.getState().columns}
        />
      </table>
    </div>
  );
}
