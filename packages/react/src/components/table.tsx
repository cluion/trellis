import { TableHead } from './thead';
import { TableBody } from './tbody';
import { useTrellisContext } from '../context';

/**
 * 無頭式 Table 元件。
 * 渲染 <table> 包含 <thead> 和 <tbody>。
 */
export function Table() {
  const api = useTrellisContext();

  return (
    <table>
      <TableHead columns={api.getState().columns} />
      <TableBody
        data={api.getState().data}
        columns={api.getState().columns}
      />
    </table>
  );
}
