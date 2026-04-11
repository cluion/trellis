import type { SlotRenderer, SlotContext } from '../types/slot';

/**
 * 具名插槽渲染器的註冊表。
 * 讓框架適配器可以在特定位置覆寫渲染方式。
 */
export class SlotRegistry {
  private slots = new Map<string, SlotRenderer>();

  /**
   * 為插槽名稱註冊渲染器。
   * 會覆寫同一名稱的先前渲染器。
   * 回傳取消註冊函式。
   */
  register(name: string, renderer: SlotRenderer): () => void {
    this.slots.set(name, renderer);
    return () => {
      this.slots.delete(name);
    };
  }

  /** 取得插槽的渲染器，若無則回傳 undefined。 */
  get(name: string): SlotRenderer | undefined {
    return this.slots.get(name);
  }

  /** 檢查插槽是否已註冊。 */
  has(name: string): boolean {
    return this.slots.has(name);
  }

  /**
   * 以給定的 context 呼叫插槽渲染器。
   * 若插槽未註冊則回傳 undefined。
   */
  render(name: string, ctx?: SlotContext): unknown {
    const renderer = this.slots.get(name);
    return renderer ? renderer(ctx ?? {}) : undefined;
  }
}
