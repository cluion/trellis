import type { TrellisPlugin, TrellisAPI } from '@trellisjs/core';
import type { VirtualScrollOptions, VirtualScrollState } from './types';

/** 預設 overscan 行數 */
const DEFAULT_OVERSCAN = 5;

/** 預設行高 (px) */
const DEFAULT_ROW_HEIGHT = 40;

/** 擴充的 TrellisPlugin 介面，提供 scroll container 綁定 */
export interface VirtualScrollPlugin extends TrellisPlugin {
    /** 綁定滾動容器元素 */
    attachScrollContainer: (element: HTMLElement) => void;
    /** 解除滾動容器綁定 */
    detachScrollContainer: () => void;
}

/**
 * 計算可視範圍的 startIndex / endIndex。
 */
function computeVisibleRange(
    scrollTop: number,
    containerHeight: number,
    totalItems: number,
    rowHeight: number,
    overscan: number,
): Pick<VirtualScrollState, 'startIndex' | 'endIndex'> {
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const rawStart = Math.floor(scrollTop / rowHeight);
    const rawEnd = rawStart + visibleCount;

    const startIndex = Math.max(0, rawStart - overscan);
    const endIndex = Math.min(totalItems, rawEnd + overscan);

    return { startIndex, endIndex };
}

/**
 * 建立虛擬滾動插件實例。
 * 透過 transform pipeline 只渲染可視區域的行。
 */
export function createVirtualScrollPlugin(
    options: VirtualScrollOptions = {},
): VirtualScrollPlugin {
    const overscan = options.overscan ?? DEFAULT_OVERSCAN;
    const rowHeight =
        options.rowHeight === 'auto' || options.rowHeight === undefined
            ? DEFAULT_ROW_HEIGHT
            : options.rowHeight;

    if (!Number.isFinite(rowHeight) || rowHeight <= 0) {
        throw new TypeError('rowHeight must be a positive finite number.');
    }

    if (!Number.isSafeInteger(overscan) || overscan < 0) {
        throw new TypeError('overscan must be a non-negative safe integer.');
    }

    // 內部狀態
    let scrollElement: HTMLElement | null = null;
    let rafId: number | null = null;
    let dirty = false;
    let apiRef: TrellisAPI | null = null;
    let lastQuery: string | undefined;

    function handleScroll(): void {
        if (!dirty) {
            dirty = true;
            rafId = requestAnimationFrame(() => {
                dirty = false;
                rafId = null;
                recalculate();
            });
        }
    }

    function recalculate(): void {
        if (!scrollElement || !apiRef) {
            return;
        }

        apiRef.recompute();
    }

    const plugin: VirtualScrollPlugin = {
        name: 'virtualScroll',

        install(api: TrellisAPI) {
            apiRef = api;

            // 註冊 transform (priority=35)，在 pagination 之後執行
            api.registerTransform('virtualScroll', 35, (data, state) => {
                let vs = state.virtualScroll;

                if (scrollElement) {
                    const query = JSON.stringify([
                        state.pagination.page,
                        state.pagination.pageSize,
                        state.filtering,
                        state.sorting,
                    ]);

                    if (lastQuery !== undefined && query !== lastQuery) {
                        scrollElement.scrollTop = 0;
                    }

                    lastQuery = query;
                    const maxScrollTop = Math.max(
                        0,
                        data.length * rowHeight - scrollElement.clientHeight,
                    );
                    const scrollTop = Math.max(
                        0,
                        Math.min(scrollElement.scrollTop, maxScrollTop),
                    );
                    scrollElement.scrollTop = scrollTop;
                    vs = {
                        ...computeVisibleRange(
                            scrollTop,
                            scrollElement.clientHeight,
                            data.length,
                            rowHeight,
                            overscan,
                        ),
                        totalHeight: data.length * rowHeight,
                        rowHeight,
                    };
                }

                if (!vs) {
                    return data;
                }

                const { startIndex, endIndex } = vs;

                // Clamp 到有效範圍
                const clampedStart = Math.min(
                    data.length,
                    Math.max(0, startIndex),
                );
                const clampedEnd = Math.min(data.length, endIndex);

                return {
                    data: data.slice(clampedStart, clampedEnd),
                    state: {
                        virtualScroll: {
                            ...vs,
                            startIndex: clampedStart,
                            endIndex: Math.max(clampedStart, clampedEnd),
                            totalHeight: data.length * vs.rowHeight,
                        },
                    },
                };
            });
        },

        attachScrollContainer(element: HTMLElement) {
            // 先清理舊的
            this.detachScrollContainer();

            scrollElement = element;
            lastQuery = undefined;
            scrollElement.addEventListener('scroll', handleScroll, {
                passive: true,
            });

            // 初始計算
            recalculate();
        },

        detachScrollContainer() {
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', handleScroll);
                scrollElement = null;
            }

            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
                dirty = false;
            }
        },

        destroy() {
            this.detachScrollContainer();
            apiRef = null;
        },
    };

    return plugin;
}
