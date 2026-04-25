import { useCallback, useRef } from 'react';
import { useTrellisContext } from '../context';

export interface ResizeHandleProps {
  columnId: string;
}

export function ResizeHandle({ columnId }: ResizeHandleProps) {
  const api = useTrellisContext();
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 使用實際 DOM 寬度而非 defaultWidth，避免點擊時跳到錯誤寬度
      const th = (e.target as HTMLElement).closest('th');
      const state = api.getState();
      const currentWidth =
        th?.getBoundingClientRect().width ??
        state.columnResizing?.columnWidths[columnId] ??
        state.columnResizing?.defaultWidth ??
        150;

      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;

      api.emit('resize:start', { columnId });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const newWidth = startWidthRef.current + delta;
        api.emit('resize:column', { columnId, width: newWidth });
      };

      const handleMouseUp = () => {
        api.emit('resize:end', undefined);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [api, columnId],
  );

  return (
    <div
      className="trellis-resize-handle"
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 5,
        cursor: 'col-resize',
        zIndex: 1,
      }}
    />
  );
}
