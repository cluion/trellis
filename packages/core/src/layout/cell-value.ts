import type { ColumnDef } from '../types/column';
import type { DataRow } from '../types/data';

/** 依欄位的 accessor（屬性鍵或函式）取出儲存格的值。 */
export function getCellValue<T>(
    row: DataRow<T>,
    column: ColumnDef<T>,
): unknown {
    const { accessor } = column;

    if (typeof accessor === 'function') {
        return accessor(row.original);
    }

    return row.original[accessor];
}
