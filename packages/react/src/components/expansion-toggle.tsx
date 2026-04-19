import { useTrellisContext } from '../context';
import { useTrellisState } from '../hooks/use-trellis-state';
import type { DataId } from '@trellisjs/core';

interface ExpansionToggleProps {
  rowId: DataId;
  expandIcon?: React.ReactNode;
  collapseIcon?: React.ReactNode;
}

const DEFAULT_EXPAND_ICON = '\u25B6';   // ▶
const DEFAULT_COLLAPSE_ICON = '\u25BC'; // ▼

/**
 * 展開/收合切換按鈕元件。
 * 根據 expandedRows 狀態渲染箭頭圖示，點擊觸發 expansion:toggle。
 */
export function ExpansionToggle({
  rowId,
  expandIcon,
  collapseIcon,
}: ExpansionToggleProps) {
  const api = useTrellisContext();
  const state = useTrellisState();
  const isExpanded = state.expandedRows.has(rowId);

  const handleClick = () => {
    api.emit('expansion:toggle', { rowId });
  };

  const icon = isExpanded
    ? (collapseIcon ?? DEFAULT_COLLAPSE_ICON)
    : (expandIcon ?? DEFAULT_EXPAND_ICON);

  return (
    <button
      type="button"
      className="trellis-expansion-toggle"
      onClick={handleClick}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? '收合' : '展開'}
    >
      {icon}
    </button>
  );
}
