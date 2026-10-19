import type { SlotContext } from '@trellisjs/core';
import { defineComponent } from 'vue';
import type { PropType, VNodeChild } from 'vue';
import { useTrellisContext } from '../context';

/**
 * 渲染 Trellis 插槽註冊表裡的具名插槽。
 * 未註冊或渲染器回傳 null 時，改用 fallback 屬性或預設插槽。
 */
export const TlSlotRenderer = defineComponent({
    name: 'TlSlotRenderer',
    props: {
        /** 要渲染的插槽名稱 */
        name: { type: String, required: true },
        /** 傳給插槽渲染器的 context */
        context: { type: Object as PropType<SlotContext>, default: undefined },
        /** 插槽未註冊時的備用內容 */
        fallback: {
            type: null as unknown as PropType<VNodeChild>,
            default: null,
        },
    },
    setup(props, { slots }) {
        const api = useTrellisContext();

        return () => {
            const renderer = api.getSlot(props.name);
            const content = renderer?.(props.context ?? {});

            if (content !== null && content !== undefined) {
                return content as VNodeChild;
            }

            return props.fallback ?? slots.default?.() ?? null;
        };
    },
});
