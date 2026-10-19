import { Trellis } from '@trellisjs/core';
import type { TrellisAPI, TrellisOptions } from '@trellisjs/core';
import {
    getCurrentInstance,
    getCurrentScope,
    isRef,
    onScopeDispose,
    toRaw,
    toValue,
    watch,
} from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { createTrellisState, provideTrellis } from '../context';
import type { TrellisStateRef } from '../context';

export interface UseTrellisOptions<T> extends Omit<TrellisOptions<T>, 'data'> {
    /**
     * 資料列：陣列、ref 或 getter。
     * 換成新陣列，或陣列本身增刪（push、splice）時會自動同步；
     * 列物件內部的屬性變動不會追蹤，請用 api.updateRow()。
     */
    data: MaybeRefOrGetter<T[]>;
}

export interface UseTrellisReturn<T> {
    api: TrellisAPI<T>;
    state: TrellisStateRef<T>;
}

function snapshot<T>(data: MaybeRefOrGetter<T[]>): T[] {
    // 拿掉 Vue 的 reactive proxy，讓 Trellis 持有原始物件
    return [...toRaw(toValue(data))];
}

/**
 * 建立 Trellis 實例，並提供給子元件使用。
 *
 * - 在元件 setup 裡呼叫時會自動 provide，子元件可直接使用 TlTable 等元件
 * - 元件卸載時自動銷毀實例（插件與事件監聽器）
 */
export function useTrellis<T extends object>(
    options: UseTrellisOptions<T>,
): UseTrellisReturn<T> {
    const { data, ...rest } = options;
    const trellis = new Trellis<T>({ ...rest, data: snapshot(data) });
    const { api } = trellis;
    const state = createTrellisState(api);

    if (isRef(data) || typeof data === 'function') {
        // deep: 1 只追蹤陣列這一層的增刪，不深入列物件
        watch(
            () => toValue(data),
            () => api.updateSourceData(snapshot(data)),
            { deep: 1 },
        );
    }

    if (getCurrentInstance()) {
        provideTrellis(api, state);
    }

    if (getCurrentScope()) {
        onScopeDispose(() => trellis.destroy());
    }

    return { api, state };
}
