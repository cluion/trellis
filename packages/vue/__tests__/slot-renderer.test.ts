import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { TlSlotRenderer } from '../src';
import { mountWithTrellis } from './helpers';

const base = { data: [], columns: [] };

describe('TlSlotRenderer', () => {
    it('渲染已註冊的插槽並傳入 context', () => {
        const { wrapper } = mountWithTrellis(base, ({ api }) => {
            api.registerSlot('greeting', (ctx) =>
                h('b', `Hi ${String(ctx.value)}`),
            );

            return h(TlSlotRenderer, {
                name: 'greeting',
                context: { value: 'Ann' },
            });
        });

        expect(wrapper.find('b').text()).toBe('Hi Ann');
    });

    it('未註冊時使用 fallback 屬性', () => {
        const { wrapper } = mountWithTrellis(base, () =>
            h('div', [
                h(TlSlotRenderer, { name: 'missing', fallback: 'none' }),
            ]),
        );

        expect(wrapper.text()).toBe('none');
    });

    it('未註冊時也可以用預設插槽當 fallback', () => {
        const { wrapper } = mountWithTrellis(base, () =>
            h('div', [
                h(TlSlotRenderer, { name: 'missing' }, () => h('i', 'empty')),
            ]),
        );

        expect(wrapper.find('i').text()).toBe('empty');
    });

    it('渲染器回傳 null 且沒有 fallback 時不渲染內容', () => {
        const { wrapper } = mountWithTrellis(base, ({ api }) => {
            api.registerSlot('blank', () => null);

            return h('div', [h(TlSlotRenderer, { name: 'blank' })]);
        });

        expect(wrapper.text()).toBe('');
    });
});
