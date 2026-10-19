import { Trellis } from '@trellisjs/core';
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { provideTrellis, TlTable } from '../src';

describe('provideTrellis', () => {
    it('把在別處建立的 api 提供給元件，並跟著狀態更新', async () => {
        const trellis = new Trellis({
            data: [{ name: 'Alice' }],
            columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
        });
        const Host = defineComponent({
            setup() {
                provideTrellis(trellis.api);

                return () => h(TlTable);
            },
        });
        const wrapper = mount(Host);

        trellis.api.addRow({ name: 'Bob' });
        await nextTick();

        expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    });
});
