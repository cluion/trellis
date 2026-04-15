import { TableHead } from './thead';
import { TableBody } from './tbody';
import { useTrellisContext } from '../context';

export interface TableProps {
  /** 啟用後表頭在垂直滾動時固定於容器頂部 */
  stickyHeader?: boolean;
}

/**
 * 無頭式 Table 元件。
 * 渲染 <table> 包含 <thead> 和 <tbody>。
 */
export function Table({ stickyHeader = false }: TableProps) {
  const api = useTrellisContext();

  return (
    <table>
      <TableHead
        columns={api.getState().columns}
        stickyHeader={stickyHeader}
      />
      <TableBody
        data={api.getState().data}
        columns={api.getState().columns}
      />
    </table>
  );
}
