import type { TrellisPlugin, TrellisAPI, ColumnDef, DataRow } from '@trellisjs/core';

export interface ExportCSVOptions {
  /** 自訂檔名（預設：'export.csv'） */
  filename?: string;
  /** 自訂分隔符（預設：','） */
  delimiter?: string;
  /** 是否包含表頭（預設：true） */
  includeHeader?: boolean;
  /** 只匯出指定欄位（預設：所有 visible 欄位） */
  columns?: string[];
  /** 只匯出當前頁（預設：false，匯出全部篩選後資料） */
  currentPageOnly?: boolean;
}

export interface ExportCSVStringPayload {
  /** CSV 選項 */
  options?: ExportCSVOptions;
  /** 回呼函式，接收 CSV 字串 */
  callback: (csv: string) => void;
}

function getCellValue<T>(row: DataRow<T>, column: ColumnDef<T>): unknown {
  const { accessor } = column;
  if (typeof accessor === 'function') {
    return accessor(row.original);
  }
  return row.original[accessor];
}

export function escapeCSVValue(value: unknown, delimiter: string): string {
  if (value == null) return '';
  const str = String(value);
  const needsQuoting =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');
  if (!needsQuoting) return str;
  return '"' + str.replace(/"/g, '""') + '"';
}

export function toCSV<T>(
  rows: DataRow<T>[],
  columns: ColumnDef<T>[],
  options: ExportCSVOptions = {},
): string {
  const {
    delimiter = ',',
    includeHeader = true,
    columns: selectedColumns,
  } = options;

  const visibleColumns = selectedColumns
    ? columns.filter((col) => selectedColumns.includes(col.id))
    : columns.filter((col) => col.visible !== false);

  if (visibleColumns.length === 0) return '';

  const lines: string[] = [];

  if (includeHeader) {
    lines.push(
      visibleColumns.map((col) => escapeCSVValue(col.header, delimiter)).join(delimiter),
    );
  }

  for (const row of rows) {
    lines.push(
      visibleColumns
        .map((col) => escapeCSVValue(getCellValue(row, col), delimiter))
        .join(delimiter),
    );
  }

  return lines.join('\n');
}

export function downloadCSV(csvString: string, filename: string): void {
  const bom = '﻿';
  const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createExportCSVPlugin(): TrellisPlugin {
  return {
    name: 'export-csv',

    install(api: TrellisAPI) {
      api.on('export:csv', (payload) => {
        const opts = (payload as ExportCSVOptions | undefined) ?? {};
        const {
          filename = 'export.csv',
          currentPageOnly = false,
          ...csvOptions
        } = opts;

        const state = api.getState();
        const rows = currentPageOnly ? state.data : api.getFilteredData();
        const csv = toCSV(rows, state.columns, csvOptions);
        downloadCSV(csv, filename);
      });

      api.on('export:csv-string', (payload) => {
        const { callback, options = {} } = payload as ExportCSVStringPayload;
        const { currentPageOnly = false, ...csvOptions } = options;
        const state = api.getState();
        const rows = currentPageOnly ? state.data : api.getFilteredData();
        const csv = toCSV(rows, state.columns, csvOptions);
        callback(csv);
      });
    },
  };
}
