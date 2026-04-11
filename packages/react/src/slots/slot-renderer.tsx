import type { ReactNode } from 'react';
import { useTrellisContext } from '../context';
import type { SlotContext } from '@trellisjs/core';

interface SlotRendererProps {
  /** 要渲染的插槽名稱 */
  name: string;
  /** 傳遞給插槽渲染器的 context */
  context?: SlotContext;
  /** 插槽未註冊時的備用內容 */
  fallback?: ReactNode;
}

/**
 * 從 Trellis 插槽註冊表渲染具名插槽。
 * 若未註冊則使用 `fallback` 屬性或渲染空內容。
 */
export function SlotRenderer({
  name,
  context,
  fallback = null,
}: SlotRendererProps) {
  const api = useTrellisContext();
  const renderer = api.getSlot(name);

  if (!renderer) {
    return <>{fallback}</>;
  }

  const content = renderer(context ?? {});

  if (content !== null && content !== undefined) {
    return <>{content}</>;
  }

  return <>{fallback}</>;
}
