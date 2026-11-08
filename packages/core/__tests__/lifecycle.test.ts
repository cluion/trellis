import { describe, expect, it, vi } from 'vitest';
import { Trellis } from '../src';

describe('插件資源生命週期', () => {
    it('停止會立即釋放資源，重新啟動仍保留實例且不重複停止', () => {
        const start = vi.fn();
        const stop = vi.fn();
        const table = new Trellis({
            data: [],
            columns: [],
            plugins: [{ name: 'resource', install() {}, start, stop }],
        });
        const api = table.api;
        expect(start).toHaveBeenCalledOnce();
        table.stop();
        table.stop();
        expect(stop).toHaveBeenCalledOnce();
        table.start();
        expect(start).toHaveBeenCalledTimes(2);
        expect(table.api).toBe(api);
        table.destroy();
        expect(stop).toHaveBeenCalledTimes(2);
    });

    it('所有插件安裝和初始管線完成後才 start', () => {
        const calls: string[] = [];
        const table = new Trellis({
            data: [{ id: 1 }],
            columns: [],
            plugins: [
                {
                    name: 'first',
                    install() {
                        calls.push('install:first');
                    },
                    start() {
                        calls.push('start:first');
                    },
                },
                {
                    name: 'last',
                    install(api) {
                        calls.push('install:last');
                        api.registerTransform('track', 10, (data) => {
                            calls.push('pipeline');

                            return data;
                        });
                    },
                    start() {
                        calls.push('start:last');
                    },
                },
            ],
        });
        expect(calls).toEqual([
            'install:first',
            'install:last',
            'pipeline',
            'start:first',
            'start:last',
        ]);
        table.start();
        expect(calls).toHaveLength(5);
        table.destroy();
    });

    it('可以延後啟動；銷毀後不再啟動資源', () => {
        const start = vi.fn();
        const table = new Trellis({
            data: [],
            columns: [],
            autoStart: false,
            plugins: [{ name: 'resource', install() {}, start }],
        });
        expect(start).not.toHaveBeenCalled();
        table.start();
        table.start();
        expect(start).toHaveBeenCalledOnce();
        table.destroy();
        const cancelled = new Trellis({
            data: [],
            columns: [],
            autoStart: false,
            plugins: [{ name: 'resource', install() {}, start }],
        });
        cancelled.destroy();
        cancelled.start();
        expect(start).toHaveBeenCalledOnce();
    });
});
