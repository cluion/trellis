import { useTrellisContext } from '../context';
import { useTrellisState } from '../hooks/use-trellis-state';
import { TableBody } from './tbody';
import { TableHead } from './thead';
import { VirtualScrollBody } from './virtual-scroll-body';

export interface TableProps {
    /** 啟用後表頭在垂直滾動時固定於容器頂部 */
    stickyHeader?: boolean;
    /** 啟用虛擬滾動，使用 VirtualScrollBody 取代 TableBody */
    virtualScroll?: boolean;
    /** 外層元素的 class */
    className?: string;
    /**
     * 外層元素的樣式，會覆蓋內建的 overflow 設定。
     * 有釘選欄時外層本身就是捲動容器，max-height 要設在這裡固定表頭才會生效。
     */
    style?: React.CSSProperties;
}

/**
 * 無頭式 Table 元件。
 * 渲染 <table> 包含 <thead> 和 <tbody>。
 */
export function Table({
    stickyHeader = false,
    virtualScroll = false,
    className,
    style,
}: TableProps) {
    const api = useTrellisContext();
    const state = useTrellisState();

    const BodyComponent = virtualScroll ? VirtualScrollBody : TableBody;
    const hasPinnedColumns =
        state.columnPinning &&
        (state.columnPinning.left.length > 0 ||
            state.columnPinning.right.length > 0);

    const wrapperStyle: React.CSSProperties = {};

    if (virtualScroll) {
        wrapperStyle.overflowY = 'auto';
    }

    if (hasPinnedColumns) {
        wrapperStyle.overflowX = 'auto';
    }

    const mergedStyle = { ...wrapperStyle, ...style };

    return (
        <div
            className={className}
            style={
                Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined
            }
        >
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
