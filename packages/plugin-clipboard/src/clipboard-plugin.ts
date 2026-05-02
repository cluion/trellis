import type { TrellisPlugin, TrellisAPI, ColumnDef, DataRow } from '@trellisjs/core';

export interface ClipboardPluginOptions {
  copyHeaders?: boolean;
  delimiter?: '\t' | ',';
  headerAccessor?: (col: ColumnDef) => string;
}

export interface ClipboardCopiedPayload<T = Record<string, unknown>> {
  rows: DataRow<T>[];
  text: string;
}

export interface ClipboardPastePayload {
  rows: Record<string, string>[];
  raw: string;
}

export interface ClipboardErrorPayload {
  action: 'copy' | 'paste';
  error: Error;
}

const DEFAULT_OPTIONS: Required<ClipboardPluginOptions> = {
  copyHeaders: true,
  delimiter: '\t',
  headerAccessor: (col) => col.header,
};

function getCellValue<T>(row: DataRow<T>, column: ColumnDef<T>): unknown {
  const { accessor } = column;
  if (typeof accessor === 'function') {
    return accessor(row.original);
  }
  return row.original[accessor];
}

export function toTSV<T>(
  rows: DataRow<T>[],
  columns: ColumnDef<T>[],
  options: ClipboardPluginOptions = {},
): string {
  const { copyHeaders, delimiter, headerAccessor } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const visibleColumns = columns.filter((col) => col.visible !== false);
  if (visibleColumns.length === 0) return '';

  const lines: string[] = [];

  if (copyHeaders) {
    lines.push(visibleColumns.map((col) => headerAccessor(col as ColumnDef)).join(delimiter));
  }

  for (const row of rows) {
    lines.push(
      visibleColumns.map((col) => String(getCellValue(row, col) ?? '')).join(delimiter),
    );
  }

  return lines.join('\n');
}

export function parseTSV(
  text: string,
  columns: ColumnDef[],
  options: ClipboardPluginOptions = {},
): Record<string, string>[] {
  const { delimiter } = { ...DEFAULT_OPTIONS, ...options };
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const visibleColumns = columns.filter((col) => col.visible !== false);
  if (visibleColumns.length === 0) return [];

  const colIds = visibleColumns.map((col) => col.id);
  const headers = visibleColumns.map((col) => col.header.toLowerCase());

  let startIdx = 0;
  const firstLineFields = lines[0].split(delimiter);
  if (
    firstLineFields.length === headers.length &&
    firstLineFields.every((field, i) => field.trim().toLowerCase() === headers[i])
  ) {
    startIdx = 1;
  }

  const result: Record<string, string>[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const fields = lines[i].split(delimiter);
    const record: Record<string, string> = {};
    for (let j = 0; j < colIds.length; j++) {
      record[colIds[j]] = fields[j] ?? '';
    }
    result.push(record);
  }

  return result;
}

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox', 'radio', 'submit', 'button', 'reset', 'image',
  'file', 'hidden', 'range', 'color',
]);

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || !!el.isContentEditable) return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type?.toLowerCase() ?? '';
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

export function createClipboardPlugin(options: ClipboardPluginOptions = {}): TrellisPlugin {
  let handleCopy: ((e: ClipboardEvent) => void) | null = null;
  let handlePaste: ((e: ClipboardEvent) => void) | null = null;

  return {
    name: 'clipboard',

    install(api: TrellisAPI) {
      const getRowsToCopy = (): DataRow[] => {
        const state = api.getState();
        const selection = state.selection;
        if (selection && selection.size > 0) {
          return state.data.filter((row) => selection.has(row.id));
        }
        return api.getFilteredData();
      };

      const doCopy = async () => {
        const state = api.getState();
        const rows = getRowsToCopy();
        const text = toTSV(rows, state.columns, options);

        try {
          await navigator.clipboard.writeText(text);
          api.emit('clipboard:copied', { rows, text } as ClipboardCopiedPayload);
        } catch (err) {
          api.emit('clipboard:error', {
            action: 'copy',
            error: err instanceof Error ? err : new Error(String(err)),
          } as ClipboardErrorPayload);
        }
      };

      const doPaste = async () => {
        try {
          const raw = await navigator.clipboard.readText();
          if (!raw || raw.trim() === '') return;

          const state = api.getState();
          const rows = parseTSV(raw, state.columns, options);
          if (rows.length === 0) return;

          api.emit('clipboard:paste', { rows, raw } as ClipboardPastePayload);
        } catch (err) {
          api.emit('clipboard:error', {
            action: 'paste',
            error: err instanceof Error ? err : new Error(String(err)),
          } as ClipboardErrorPayload);
        }
      };

      api.on('clipboard:copy', (payload) => {
        if (payload && typeof payload === 'object' && 'text' in payload) return;
        doCopy();
      });

      api.on('clipboard:paste', (payload) => {
        if (payload && typeof payload === 'object' && 'rows' in payload) return;
        doPaste();
      });

      handleCopy = (e: ClipboardEvent) => {
        if (isEditable(e.target)) return;
        e.preventDefault();

        const state = api.getState();
        const rows = getRowsToCopy();
        const text = toTSV(rows, state.columns, options);

        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', text);
          api.emit('clipboard:copied', { rows, text } as ClipboardCopiedPayload);
        } else {
          navigator.clipboard.writeText(text).then(
            () => api.emit('clipboard:copied', { rows, text } as ClipboardCopiedPayload),
            (err) => api.emit('clipboard:error', {
              action: 'copy',
              error: err instanceof Error ? err : new Error(String(err)),
            } as ClipboardErrorPayload),
          );
        }
      };

      handlePaste = (e: ClipboardEvent) => {
        if (isEditable(e.target)) return;
        e.preventDefault();

        const raw = e.clipboardData?.getData('text/plain') ?? '';
        if (!raw || raw.trim() === '') return;

        const state = api.getState();
        const rows = parseTSV(raw, state.columns, options);
        if (rows.length === 0) return;

        api.emit('clipboard:paste', { rows, raw } as ClipboardPastePayload);
      };

      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
    },

    destroy() {
      if (handleCopy) {
        document.removeEventListener('copy', handleCopy);
        handleCopy = null;
      }
      if (handlePaste) {
        document.removeEventListener('paste', handlePaste);
        handlePaste = null;
      }
    },
  };
}
