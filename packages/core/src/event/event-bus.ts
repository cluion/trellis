import type { EventHandler } from '../types/event';

/**
 * 輕量型別安全 pub/sub 事件匯流排。
 * 用於內部表格事件和插件通訊。
 */
export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  /**
   * 訂閱事件。
   * 回傳取消訂閱函式。
   * 同一個處理器在每個事件上只會被註冊一次。
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * 取消訂閱某個事件的處理器。
   */
  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * 向所有已註冊的監聽器發送事件。
   * 單一監聽器的錯誤不會阻止其他監聽器被觸發。
   */
  emit(event: string, payload: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch {
        // 刻意吞掉錯誤 — 一個壞掉的監聽器不能影響其他的。
      }
    }
  }

  /**
   * 移除所有事件的所有監聽器。
   */
  clear(): void {
    this.listeners.clear();
  }
}
