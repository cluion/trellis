import type { TrellisAPI, TrellisPlugin } from '@trellisjs/core';
import type { ColumnResizingState } from '@trellisjs/core';

export interface ColumnResizingOptions {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

export interface ResizeColumnPayload {
  columnId: string;
  width: number;
}

export interface ResizeStartPayload {
  columnId: string;
}

export function clampWidth(
  width: number,
  minWidth: number,
  maxWidth?: number,
): number {
  let result = Math.max(width, minWidth);
  if (maxWidth !== undefined) {
    result = Math.min(result, maxWidth);
  }
  return result;
}

export function createColumnResizingPlugin(
  options: ColumnResizingOptions = {},
): TrellisPlugin {
  const { minWidth = 50, maxWidth, defaultWidth = 150 } = options;

  return {
    name: 'column-resizing',

    install(api: TrellisAPI) {
      // 初始化 columnResizing 狀態
      const initialResizing: ColumnResizingState = {
        columnWidths: {},
        resizingColumn: null,
        minWidth,
        defaultWidth,
        maxWidth,
      };

      api.setState((prev) => ({
        ...prev,
        columnResizing: initialResizing,
      }));

      // 監聽 resize:start
      api.on('resize:start', (payload) => {
        const { columnId } = payload as ResizeStartPayload;
        api.setState((prev) => ({
          ...prev,
          columnResizing: prev.columnResizing
            ? { ...prev.columnResizing, resizingColumn: columnId }
            : undefined,
        }));
      });

      // 監聽 resize:column
      api.on('resize:column', (payload) => {
        const { columnId, width } = payload as ResizeColumnPayload;
        const clamped = clampWidth(width, minWidth, maxWidth);
        api.setState((prev) => ({
          ...prev,
          columnResizing: prev.columnResizing
            ? {
                ...prev.columnResizing,
                columnWidths: {
                  ...prev.columnResizing.columnWidths,
                  [columnId]: clamped,
                },
              }
            : undefined,
        }));
      });

      // 監聽 resize:end
      api.on('resize:end', () => {
        api.setState((prev) => ({
          ...prev,
          columnResizing: prev.columnResizing
            ? { ...prev.columnResizing, resizingColumn: null }
            : undefined,
        }));
      });

      // 監聽 resize:reset
      api.on('resize:reset', () => {
        api.setState((prev) => ({
          ...prev,
          columnResizing: prev.columnResizing
            ? { ...prev.columnResizing, columnWidths: {} }
            : undefined,
        }));
      });
    },
  };
}
