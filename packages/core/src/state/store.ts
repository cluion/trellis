/**
 * 不可變狀態儲存庫，使用訂閱/通知模式。
 *
 * - 狀態一律是凍結的淺層複本。
 * - `setState` 產生新物件；前一個快照永遠不會被修改。
 * - 每次狀態變更後同步通知訂閱者。
 */
export class StateStore<T extends Record<string, unknown>> {
  private state: Readonly<T>;
  private listeners = new Set<(state: T) => void>();

  constructor(initialState: T) {
    this.state = Object.freeze({ ...initialState });
  }

  /** 回傳目前不可變的狀態快照。 */
  getState(): Readonly<T> {
    return this.state;
  }

  /**
   * 更新狀態。更新函式接收目前狀態並回傳部分物件來合併。
   * 會建立新的凍結快照。
   */
  setState(updater: (prev: Readonly<T>) => Partial<T>): void {
    const partial = updater(this.state);
    this.state = Object.freeze({ ...this.state, ...partial });
    this.notify();
  }

  /**
   * 訂閱狀態變更。
   * 回傳取消訂閱函式。
   */
  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
