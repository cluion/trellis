import type { TrellisPlugin, TrellisAPI } from '../types/plugin';

/**
 * 管理插件的註冊、生命週期和清除。
 */
export class PluginManager<T = Record<string, unknown>> {
  private plugins = new Map<string, TrellisPlugin<T>>();

  constructor(private api: TrellisAPI<T>) {}

  /**
   * 註冊插件。會立即呼叫其 `install` 方法。
   * 若同名插件已註冊則拋出錯誤。
   */
  register(plugin: TrellisPlugin<T>): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }
    this.plugins.set(plugin.name, plugin);
    plugin.install(this.api);
  }

  /** 依名稱取得已註冊的插件。 */
  get(name: string): TrellisPlugin<T> | undefined {
    return this.plugins.get(name);
  }

  /**
   * 依名稱取消註冊插件。
   * 會呼叫插件的 `destroy` 方法（若有定義）。
   */
  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    plugin.destroy?.();
    this.plugins.delete(name);
  }

  /**
   * 銷毀所有已註冊的插件並清空註冊表。
   */
  destroyAll(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy?.();
    }
    this.plugins.clear();
  }
}
