import type { TableState, TrellisAPI } from '@trellisjs/core';
import {
    getCurrentScope,
    inject,
    onScopeDispose,
    provide,
    shallowRef,
} from 'vue';
import type { InjectionKey, ShallowRef } from 'vue';

/** 隨 Trellis 狀態更新的唯讀 ref；每次更新都會換成新的不可變快照。 */
export type TrellisStateRef<T = Record<string, unknown>> = Readonly<
    ShallowRef<TableState<T>>
>;

export interface TrellisContextValue<T = Record<string, unknown>> {
    api: TrellisAPI<T>;
    state: TrellisStateRef<T>;
}

/** provide / inject 用的 key。 */
export const TrellisKey: InjectionKey<TrellisContextValue<any>> =
    Symbol('trellis');

/**
 * 建立跟 api 狀態同步的 ref。
 * 在 effect scope（例如元件 setup）裡呼叫時，scope 結束會自動取消訂閱。
 */
export function createTrellisState<T>(api: TrellisAPI<T>): TrellisStateRef<T> {
    const state = shallowRef(api.getState());
    const unsubscribe = api.subscribe((next) => {
        state.value = next;
    });

    if (getCurrentScope()) {
        onScopeDispose(unsubscribe);
    }

    return state;
}

/**
 * 把 api 提供給子元件，讓它們可以用 useTrellisContext() 與 useTrellisState()。
 * useTrellis() 會自動呼叫，只有 api 是在別處建立時才需要手動使用。
 */
export function provideTrellis<T>(
    api: TrellisAPI<T>,
    state: TrellisStateRef<T> = createTrellisState(api),
): TrellisContextValue<T> {
    const value = { api, state };

    provide(TrellisKey, value);

    return value;
}

function injectTrellis(): TrellisContextValue<any> {
    const value = inject(TrellisKey, null);

    if (!value) {
        throw new Error(
            'useTrellisContext must be used inside a component that called useTrellis() or provideTrellis()',
        );
    }

    return value;
}

/** 取得祖先元件提供的 Trellis API。 */
export function useTrellisContext<
    T = Record<string, unknown>,
>(): TrellisAPI<T> {
    return injectTrellis().api as TrellisAPI<T>;
}

/** 取得祖先元件提供的 Trellis 狀態 ref。 */
export function useTrellisState<
    T = Record<string, unknown>,
>(): TrellisStateRef<T> {
    return injectTrellis().state as TrellisStateRef<T>;
}
