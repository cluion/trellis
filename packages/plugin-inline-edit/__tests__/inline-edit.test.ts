import { Trellis } from '@trellisjs/core';
import { describe, it, expect } from 'vitest';
import { createInlineEditPlugin } from '../src/inline-edit-plugin';
import type {
    InlineEditSavePayload,
    InlineEditErrorPayload,
    InlineEditPluginOptions,
} from '../src/inline-edit-plugin';

interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

const data: User[] = [
    { id: '1', name: 'Alice', email: 'alice@test.com', age: 30 },
    { id: '2', name: 'Bob', email: 'bob@test.com', age: 25 },
    { id: '3', name: 'Charlie', email: 'charlie@test.com', age: 35 },
];

const columns = [
    { id: 'id', accessor: 'id' as const, header: 'ID' },
    { id: 'name', accessor: 'name' as const, header: 'Name' },
    { id: 'email', accessor: 'email' as const, header: 'Email' },
    { id: 'age', accessor: 'age' as const, header: 'Age' },
];

function setup(options: InlineEditPluginOptions = {}) {
    const plugin = createInlineEditPlugin(options);
    const trellis = new Trellis<User>({
        data,
        columns,
        rowId: 'id',
        plugins: [plugin],
    });

    return { trellis, plugin };
}

function collectEvents(api: ReturnType<Trellis<User>['api']>) {
    const events: { name: string; payload: unknown }[] = [];
    const off1 = api.on('inline-edit:start', (p) =>
        events.push({ name: 'start', payload: p }),
    );
    const off2 = api.on('inline-edit:save', (p) =>
        events.push({ name: 'save', payload: p }),
    );
    const off3 = api.on('inline-edit:stop', (p) =>
        events.push({ name: 'stop', payload: p }),
    );
    const off4 = api.on('inline-edit:error', (p) =>
        events.push({ name: 'error', payload: p }),
    );

    return {
        events,
        cleanup: () => {
            off1();
            off2();
            off3();
            off4();
        },
    };
}

describe('cell editing - trigger modes', () => {
    it('dblclick triggers inline-edit:start', () => {
        const { trellis, plugin } = setup({ trigger: 'dblclick' });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });

        expect(events).toHaveLength(1);
        expect(events[0].name).toBe('start');
        expect(events[0].payload).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        cleanup();
        plugin.destroy?.();
    });

    it('click triggers inline-edit:start', () => {
        const { trellis, plugin } = setup({ trigger: 'click' });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });

        expect(events).toHaveLength(1);
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        cleanup();
        plugin.destroy?.();
    });

    it('does not re-enter same cell', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });

        // Plugin should only process the first start, second is ignored
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        // No save/stop/error events — plugin didn't try to switch
        expect(events.filter((e) => e.name !== 'start')).toHaveLength(0);
        cleanup();
        plugin.destroy?.();
    });
});

describe('cell editing - editable callback', () => {
    it('editable returning false prevents edit start', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'id',
            value: '1',
        });

        // Plugin should not enter editing mode
        expect(plugin.getEditingCell()).toBeNull();
        // No further events (save/stop/error)
        expect(events.filter((e) => e.name !== 'start')).toHaveLength(0);
        cleanup();
        plugin.destroy?.();
    });

    it('editable returning true allows edit start', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });

        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        expect(events).toHaveLength(1);
        cleanup();
        plugin.destroy?.();
    });
});

describe('cell editing - Enter confirms edit', () => {
    it('Enter sends save then stop', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:keydown', { key: 'Enter' });

        const saveEvents = events.filter((e) => e.name === 'save');
        const stopEvents = events.filter((e) => e.name === 'stop');
        expect(saveEvents).toHaveLength(1);
        expect(stopEvents).toHaveLength(1);
        expect(saveEvents[0].payload).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alicia',
            oldValue: 'Alice',
        });
        expect(stopEvents[0].payload).toEqual({ rowId: '1', columnId: 'name' });
        expect(plugin.getEditingCell()).toBeNull();
        cleanup();
        plugin.destroy?.();
    });
});

describe('cell editing - Escape cancels edit', () => {
    it('Escape sends stop without save', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:keydown', { key: 'Escape' });

        expect(events.filter((e) => e.name === 'save')).toHaveLength(0);
        expect(events.filter((e) => e.name === 'stop')).toHaveLength(1);
        expect(events.find((e) => e.name === 'stop')!.payload).toEqual({
            rowId: '1',
            columnId: 'name',
        });
        expect(plugin.getEditingCell()).toBeNull();
        cleanup();
        plugin.destroy?.();
    });
});

describe('cell editing - programmatic commit/cancel', () => {
    it('inline-edit:commit sends save + stop', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:commit', undefined);

        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        expect(events.filter((e) => e.name === 'stop')).toHaveLength(1);
        expect(
            (
                events.find((e) => e.name === 'save')!
                    .payload as InlineEditSavePayload
            ).value,
        ).toBe('Alicia');
        expect(plugin.getEditingCell()).toBeNull();
        cleanup();
        plugin.destroy?.();
    });

    it('inline-edit:cancel sends stop without save', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:cancel', undefined);

        expect(events.filter((e) => e.name === 'save')).toHaveLength(0);
        expect(events.filter((e) => e.name === 'stop')).toHaveLength(1);
        expect(plugin.getEditingCell()).toBeNull();
        cleanup();
        plugin.destroy?.();
    });
});

describe('cell editing - editBehavior', () => {
    it('cancel behavior cancels previous edit when switching cells', () => {
        const { trellis, plugin } = setup({ editBehavior: 'cancel' });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:start', {
            rowId: '2',
            columnId: 'email',
            value: 'bob@test.com',
        });

        const stopEvents = events.filter((e) => e.name === 'stop');
        const saveEvents = events.filter((e) => e.name === 'save');
        expect(stopEvents).toHaveLength(1);
        expect(saveEvents).toHaveLength(0);
        expect(stopEvents[0].payload).toEqual({ rowId: '1', columnId: 'name' });
        expect(plugin.getEditingCell()).toEqual({
            rowId: '2',
            columnId: 'email',
            value: 'bob@test.com',
        });
        cleanup();
        plugin.destroy?.();
    });

    it('commit behavior commits previous edit when switching cells', () => {
        const { trellis, plugin } = setup({ editBehavior: 'commit' });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:start', {
            rowId: '2',
            columnId: 'email',
            value: 'bob@test.com',
        });

        const saveEvents = events.filter((e) => e.name === 'save');
        expect(saveEvents).toHaveLength(1);
        expect((saveEvents[0].payload as InlineEditSavePayload).value).toBe(
            'Alicia',
        );
        expect((saveEvents[0].payload as InlineEditSavePayload).oldValue).toBe(
            'Alice',
        );
        expect(plugin.getEditingCell()).toEqual({
            rowId: '2',
            columnId: 'email',
            value: 'bob@test.com',
        });
        cleanup();
        plugin.destroy?.();
    });
});

describe('cell editing - destroy', () => {
    it('destroy cancels in-progress edit and sends stop', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        plugin.destroy?.();

        expect(events.filter((e) => e.name === 'stop')).toHaveLength(1);
        expect(events.filter((e) => e.name === 'save')).toHaveLength(0);
        cleanup();
    });

    it('destroy when no editing does not emit events', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        plugin.destroy?.();

        expect(events).toHaveLength(0);
        cleanup();
    });
});

describe('validation', () => {
    it('validate returning null allows save', () => {
        const { trellis, plugin } = setup({ validate: () => null });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:commit', undefined);

        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        expect(events.filter((e) => e.name === 'error')).toHaveLength(0);
        cleanup();
        plugin.destroy?.();
    });

    it('validate returning error string prevents save and emits error', () => {
        const { trellis, plugin } = setup({
            validate: (_colId, value) => {
                if (typeof value === 'string' && value.trim() === '') {
                    return '此欄位必填';
                }

                return null;
            },
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: '' });
        trellis.api.emit('inline-edit:commit', undefined);

        expect(events.filter((e) => e.name === 'save')).toHaveLength(0);
        expect(events.filter((e) => e.name === 'error')).toHaveLength(1);
        expect(
            (
                events.find((e) => e.name === 'error')!
                    .payload as InlineEditErrorPayload
            ).error,
        ).toBe('此欄位必填');
        expect(events.filter((e) => e.name === 'stop')).toHaveLength(0);
        // Still in editing mode
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'name',
            value: '',
        });
        cleanup();
        plugin.destroy?.();
    });

    it('no validate function means all values pass', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: '' });
        trellis.api.emit('inline-edit:commit', undefined);

        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        expect(events.filter((e) => e.name === 'error')).toHaveLength(0);
        cleanup();
        plugin.destroy?.();
    });

    it('different columns can have different validation rules', () => {
        const { trellis, plugin } = setup({
            validate: (colId, value) => {
                if (colId === 'age' && typeof value === 'number' && value < 0) {
                    return '年齡不能為負數';
                }

                if (
                    colId === 'name' &&
                    typeof value === 'string' &&
                    value.trim() === ''
                ) {
                    return '此欄位必填';
                }

                return null;
            },
        });
        const { events, cleanup } = collectEvents(trellis.api);

        // Invalid age
        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'age',
            value: 30,
        });
        trellis.api.emit('inline-edit:update', { value: -1 });
        trellis.api.emit('inline-edit:commit', undefined);
        expect(events.filter((e) => e.name === 'error')).toHaveLength(1);

        events.length = 0;

        // Valid name change
        trellis.api.emit('inline-edit:start', {
            rowId: '2',
            columnId: 'name',
            value: 'Bob',
        });
        trellis.api.emit('inline-edit:update', { value: 'Bobby' });
        trellis.api.emit('inline-edit:commit', undefined);
        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);

        cleanup();
        plugin.destroy?.();
    });
});

describe('Tab navigation', () => {
    it('Tab moves to next editable column in same row', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab' });

        const saveEvents = events.filter((e) => e.name === 'save');
        expect(saveEvents).toHaveLength(1);
        expect(saveEvents[0].payload).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alicia',
            oldValue: 'Alice',
        });
        // Plugin now editing next editable column (email)
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'email',
            value: 'alice@test.com',
        });
        cleanup();
        plugin.destroy?.();
    });

    it('Tab from last editable column moves to next row first editable', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'age',
            value: 30,
        });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab' });

        expect(plugin.getEditingCell()).toEqual({
            rowId: '2',
            columnId: 'name',
            value: 'Bob',
        });
        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        cleanup();
        plugin.destroy?.();
    });

    it('Tab at last editable cell confirms and stops without starting new edit', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '3',
            columnId: 'age',
            value: 35,
        });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab' });

        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        expect(plugin.getEditingCell()).toBeNull();
        cleanup();
        plugin.destroy?.();
    });

    it('Shift+Tab moves to previous editable column', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'email',
            value: 'alice@test.com',
        });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab', shiftKey: true });

        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        cleanup();
        plugin.destroy?.();
    });

    it('Shift+Tab from first editable column moves to previous row last editable', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '2',
            columnId: 'name',
            value: 'Bob',
        });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab', shiftKey: true });

        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'age',
            value: 30,
        });
        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        cleanup();
        plugin.destroy?.();
    });

    it('skips non-editable columns in Tab navigation', () => {
        const { trellis, plugin } = setup({
            editable: (colId) => colId !== 'id' && colId !== 'email',
        });
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab' });

        // Skips email (not editable), lands on age
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'age',
            value: 30,
        });
        expect(events.filter((e) => e.name === 'save')).toHaveLength(1);
        cleanup();
        plugin.destroy?.();
    });
});

describe('column accessor', () => {
    const aliasedColumns = [
        { id: 'fullName', accessor: 'name' as const, header: 'Name' },
        {
            id: 'shout',
            accessor: (row: User) => row.name.toUpperCase(),
            header: 'Shout',
        },
        { id: 'years', accessor: 'age' as const, header: 'Age' },
    ];

    function setupAliased() {
        const plugin = createInlineEditPlugin();
        const trellis = new Trellis<User>({
            data,
            columns: aliasedColumns,
            rowId: 'id',
            plugins: [plugin],
        });

        return { trellis, plugin };
    }

    it('reads oldValue through a key accessor that differs from the column id', () => {
        const { trellis, plugin } = setupAliased();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'fullName',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:update', { value: 'Alicia' });
        trellis.api.emit('inline-edit:commit', undefined);

        const save = events.find((e) => e.name === 'save')!
            .payload as InlineEditSavePayload;
        expect(save.oldValue).toBe('Alice');
        cleanup();
        plugin.destroy?.();
    });

    it('reads Tab target values through function and key accessors', () => {
        const { trellis, plugin } = setupAliased();

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'fullName',
            value: 'Alice',
        });
        trellis.api.emit('inline-edit:keydown', { key: 'Tab' });
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'shout',
            value: 'ALICE',
        });

        trellis.api.emit('inline-edit:keydown', { key: 'Tab' });
        expect(plugin.getEditingCell()).toEqual({
            rowId: '1',
            columnId: 'years',
            value: 30,
        });
        plugin.destroy?.();
    });
});

describe('editing row disappears', () => {
    it('emits inline-edit:stop without saving when the row is gone', () => {
        const { trellis, plugin } = setup();
        const { events, cleanup } = collectEvents(trellis.api);

        trellis.api.emit('inline-edit:start', {
            rowId: '1',
            columnId: 'name',
            value: 'Alice',
        });
        trellis.api.removeRow('1');
        trellis.api.emit('inline-edit:commit', undefined);

        expect(events.map((e) => e.name)).toEqual(['start', 'stop']);
        expect(events[1].payload).toEqual({ rowId: '1', columnId: 'name' });
        expect(plugin.getEditingCell()).toBeNull();
        cleanup();
        plugin.destroy?.();
    });
});
