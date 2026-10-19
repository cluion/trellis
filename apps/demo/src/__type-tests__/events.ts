/**
 * 事件型別的編譯期測試，由 `pnpm types:check` 檢查，不會被 app 載入。
 * 透過套件名稱 import dist，跟真實使用者的環境一樣。
 * 每個 @ts-expect-error 都必須真的報錯，否則 tsc 會失敗。
 */
import { Trellis } from '@trellisjs/core';
import type { DataId, EventHandler } from '@trellisjs/core';
import { createClipboardPlugin } from '@trellisjs/plugin-clipboard';
import type {
    ClipboardCopiedPayload,
    ClipboardErrorPayload,
    ClipboardPastePayload,
} from '@trellisjs/plugin-clipboard';
import { createColumnPinningPlugin } from '@trellisjs/plugin-column-pinning';
import type {
    PinSetPayload,
    PinTogglePayload,
} from '@trellisjs/plugin-column-pinning';
import { createColumnResizingPlugin } from '@trellisjs/plugin-column-resizing';
import type {
    ResizeColumnPayload,
    ResizeStartPayload,
} from '@trellisjs/plugin-column-resizing';
import { createColumnVisibilityPlugin } from '@trellisjs/plugin-column-visibility';
import type { ColumnVisibilityPayload } from '@trellisjs/plugin-column-visibility';
import { createExportCSVPlugin } from '@trellisjs/plugin-export-csv';
import type {
    ExportCSVOptions,
    ExportCSVStringPayload,
} from '@trellisjs/plugin-export-csv';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import type {
    FilterChangePayload,
    FilterColumnPayload,
} from '@trellisjs/plugin-filter';
import { createInlineEditPlugin } from '@trellisjs/plugin-inline-edit';
import type {
    InlineEditErrorPayload,
    InlineEditKeydownPayload,
    InlineEditSavePayload,
    InlineEditStartPayload,
    InlineEditStopPayload,
    InlineEditUpdatePayload,
} from '@trellisjs/plugin-inline-edit';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import type {
    PaginationGotoPayload,
    PaginationPageSizePayload,
} from '@trellisjs/plugin-pagination';
import { createRowExpansionPlugin } from '@trellisjs/plugin-row-expansion';
import type { ExpansionTogglePayload } from '@trellisjs/plugin-row-expansion';
import { createSelectionPlugin } from '@trellisjs/plugin-selection';
import type {
    SelectionAllPayload,
    SelectionRangePayload,
    SelectionTogglePayload,
} from '@trellisjs/plugin-selection';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import type { SortChangePayload } from '@trellisjs/plugin-sort';
import { createStateSavePlugin } from '@trellisjs/plugin-state-save';

interface User {
    id: number;
    name: string;
}

const { api } = new Trellis<User>({
    data: [],
    columns: [],
    plugins: [
        createClipboardPlugin(),
        createColumnPinningPlugin(),
        createColumnResizingPlugin(),
        createColumnVisibilityPlugin(),
        createExportCSVPlugin(),
        createFilterPlugin(),
        createInlineEditPlugin(),
        createPaginationPlugin(),
        createRowExpansionPlugin(),
        createSelectionPlugin(),
        createSortPlugin(),
        createStateSavePlugin(),
    ],
});

type IsEqual<A, B> =
    (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
        ? true
        : false;

/** 斷言 handler 收到的 payload 型別恰好是 P；不相等（包含 any）時會多要一個 never 參數而報錯。 */
function expectPayload<P>() {
    return <A>(
        _actual: A,
        ..._mismatch: IsEqual<A, P> extends true ? [] : [never]
    ) => {};
}

// ── 1. 每個已知事件的 payload 都帶型別 ──────────────────────────────
api.on('data:added', (p) => expectPayload<DataId>()(p));
api.on('data:removed', (p) => expectPayload<DataId>()(p));
api.on('data:updated', (p) => expectPayload<DataId>()(p));
api.on('sort:change', (p) => expectPayload<SortChangePayload>()(p));
api.on('filter:change', (p) => expectPayload<FilterChangePayload>()(p));
api.on('filter:column', (p) => expectPayload<FilterColumnPayload>()(p));
api.on('pagination:goto', (p) => expectPayload<PaginationGotoPayload>()(p));
api.on('pagination:pageSize', (p) =>
    expectPayload<PaginationPageSizePayload>()(p),
);
api.on('selection:toggle', (p) => expectPayload<SelectionTogglePayload>()(p));
api.on('selection:all', (p) => expectPayload<SelectionAllPayload>()(p));
api.on('selection:range', (p) => expectPayload<SelectionRangePayload>()(p));
api.on('column:toggle', (p) => expectPayload<ColumnVisibilityPayload>()(p));
api.on('column:show', (p) => expectPayload<ColumnVisibilityPayload>()(p));
api.on('column:hide', (p) => expectPayload<ColumnVisibilityPayload>()(p));
api.on('column-pin:toggle', (p) => expectPayload<PinTogglePayload>()(p));
api.on('column-pin:set', (p) => expectPayload<PinSetPayload>()(p));
api.on('resize:start', (p) => expectPayload<ResizeStartPayload>()(p));
api.on('resize:column', (p) => expectPayload<ResizeColumnPayload>()(p));
api.on('expansion:toggle', (p) => expectPayload<ExpansionTogglePayload>()(p));
api.on('expansion:expand', (p) => expectPayload<ExpansionTogglePayload>()(p));
api.on('expansion:collapse', (p) => expectPayload<ExpansionTogglePayload>()(p));
api.on('export:csv', (p) => expectPayload<ExportCSVOptions | undefined>()(p));
api.on('export:csv-string', (p) => expectPayload<ExportCSVStringPayload>()(p));
api.on('clipboard:copied', (p) => expectPayload<ClipboardCopiedPayload>()(p));
api.on('clipboard:error', (p) => expectPayload<ClipboardErrorPayload>()(p));
api.on('clipboard:paste', (p) =>
    expectPayload<ClipboardPastePayload | undefined>()(p),
);
api.on('inline-edit:start', (p) => expectPayload<InlineEditStartPayload>()(p));
api.on('inline-edit:save', (p) => expectPayload<InlineEditSavePayload>()(p));
api.on('inline-edit:stop', (p) => expectPayload<InlineEditStopPayload>()(p));
api.on('inline-edit:error', (p) => expectPayload<InlineEditErrorPayload>()(p));
api.on('inline-edit:keydown', (p) =>
    expectPayload<InlineEditKeydownPayload>()(p),
);
api.on('inline-edit:update', (p) =>
    expectPayload<InlineEditUpdatePayload>()(p),
);

// ── 2. 已知事件的 payload 寫錯會報錯 ────────────────────────────────
// @ts-expect-error direction 只能是 asc / desc / null
api.emit('sort:change', { columnId: 'name', direction: 'up' });
// @ts-expect-error 不會退回寬鬆的 string overload
api.emit('sort:change', 123);
// @ts-expect-error payload 必填
api.emit('filter:change');
// @ts-expect-error page 必須是 number
api.emit('pagination:goto', { page: '2' });
// @ts-expect-error export:csv 的選項會檢查
api.emit('export:csv', { fileName: 'typo.csv' });
api.on('clipboard:paste', (p) => {
    // @ts-expect-error clipboard:paste 也是無 payload 的指令，要先判斷
    void p.rows;
});
api.emit('sort:change', { columnId: 'name', direction: 'desc' });
api.emit('filter:column', { columnId: 'name', value: 'A' });
api.emit('export:csv', { filename: 'users.csv', currentPageOnly: true });
api.emit('export:csv');

// ── 3. 無 payload 的指令維持寬鬆：省略或傳 null / {} / undefined 都可以 ─
api.emit('pagination:next');
api.emit('pagination:next', null);
api.emit('pagination:prev', {});
api.emit('state:save', undefined);
api.emit('column-pin:clear', null);
api.emit('resize:end', undefined);
api.emit('expansion:expandAll');
api.emit('inline-edit:commit', undefined);
api.emit('clipboard:copy', undefined);
api.emit('clipboard:paste');

// ── 4. 未知事件維持原本的寬鬆行為 ───────────────────────────────────
api.emit('custom:thing', { anything: 1 });
api.emit('custom:thing');
api.on('custom:thing', (p) => {
    // @ts-expect-error 未知事件的 payload 是 unknown
    void p.foo;
});

// ── 5. 既有寫法仍可編譯 ─────────────────────────────────────────────
const legacy: EventHandler = () => {};
const dynamicName: string = 'sort:change';
api.on('sort:change', (p: unknown) => void p);
api.on('sort:change', legacy);
api.on(dynamicName, legacy);
api.emit(dynamicName, 1);
