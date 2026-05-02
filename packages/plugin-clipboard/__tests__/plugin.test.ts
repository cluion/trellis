import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createClipboardPlugin } from '../src/clipboard-plugin';

type MockHandler = (e: Record<string, unknown>) => void;
const eventListeners: Record<string, Set<MockHandler>> = {};

function resetListeners() {
  for (const key of Object.keys(eventListeners)) {
    eventListeners[key].clear();
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'document', {
    value: {
      addEventListener: (_event: string, handler: (e: unknown) => void) => {
        if (!eventListeners[_event]) eventListeners[_event] = new Set();
        eventListeners[_event].add(handler as MockHandler);
      },
      removeEventListener: (_event: string, handler: (e: unknown) => void) => {
        eventListeners[_event]?.delete(handler as MockHandler);
      },
    },
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).document;
  resetListeners();
});

beforeEach(() => {
  resetListeners();
});

function makeTarget(tagNameOrTarget?: string | Record<string, unknown>): Record<string, unknown> {
  if (!tagNameOrTarget) return { tagName: 'DIV', isContentEditable: false };
  if (typeof tagNameOrTarget === 'string') return { tagName: tagNameOrTarget, isContentEditable: false };
  return tagNameOrTarget;
}

function dispatchCopy(tagNameOrTarget?: string | Record<string, unknown>) {
  const target = makeTarget(tagNameOrTarget);
  const clipboardData = { setData: vi.fn(), getData: vi.fn().mockReturnValue('') };
  const handlers = eventListeners['copy'] ?? new Set();
  for (const h of handlers) h({ target, preventDefault: () => {}, clipboardData });
  return clipboardData;
}

function dispatchPaste(tagNameOrTarget?: string | Record<string, unknown>, clipboardText = '') {
  const target = makeTarget(tagNameOrTarget);
  const clipboardData = {
    setData: vi.fn(),
    getData: vi.fn((type: string) => type === 'text/plain' ? clipboardText : ''),
  };
  const handlers = eventListeners['paste'] ?? new Set();
  for (const h of handlers) h({ target, preventDefault: () => {}, clipboardData });
  return clipboardData;
}

interface User {
  name: string;
  email: string;
  age: number;
}

const data: User[] = [
  { name: 'Alice', email: 'alice@test.com', age: 30 },
  { name: 'Bob', email: 'bob@test.com', age: 25 },
  { name: 'Charlie', email: 'charlie@test.com', age: 35 },
];

const columns = [
  { id: 'name', accessor: 'name' as const, header: 'Name' },
  { id: 'email', accessor: 'email' as const, header: 'Email' },
  { id: 'age', accessor: 'age' as const, header: 'Age' },
];

function mockClipboard(readResult = '') {
  const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const readText = vi.fn<() => Promise<string>>().mockResolvedValue(readResult);
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText, readText } },
    writable: true,
    configurable: true,
  });
  return { writeText, readText };
}

function setup(readResult = '') {
  const { writeText, readText } = mockClipboard(readResult);
  const plugin = createClipboardPlugin();
  const trellis = new Trellis<User>({ data, columns, plugins: [plugin] });
  return { trellis, writeText, readText, plugin };
}

describe('clipboard plugin - copy', () => {
  it('copies all data as TSV when no selection', async () => {
    const { trellis, writeText, plugin } = setup();
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const text = writeText.mock.calls[0][0] as string;
    expect(text.split('\n')[0]).toBe('Name\tEmail\tAge');
    expect(text.split('\n')).toHaveLength(4);
    plugin.destroy?.();
  });

  it('copies only selected rows', async () => {
    const { trellis, writeText, plugin } = setup();
    const state = trellis.api.getState();
    trellis.api.setState((prev) => ({
      ...prev,
      selection: new Set([state.data[0].id, state.data[2].id]),
    }));
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const text = writeText.mock.calls[0][0] as string;
    const lines = text.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('Alice');
    expect(lines[2]).toContain('Charlie');
    plugin.destroy?.();
  });

  it('includes headers by default', async () => {
    const { trellis, writeText, plugin } = setup();
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0][0].split('\n')[0]).toBe('Name\tEmail\tAge');
    plugin.destroy?.();
  });

  it('excludes headers when copyHeaders is false', async () => {
    mockClipboard();
    const plugin = createClipboardPlugin({ copyHeaders: false });
    const trellis = new Trellis<User>({ data, columns, plugins: [plugin] });
    trellis.api.emit('clipboard:copy', undefined);
    const nav = (globalThis as unknown as { navigator: { clipboard: { writeText: ReturnType<typeof vi.fn> } } }).navigator;
    await vi.waitFor(() => expect(nav.clipboard.writeText).toHaveBeenCalledOnce());
    const text = nav.clipboard.writeText.mock.calls[0][0] as string;
    expect(text.split('\n')).toHaveLength(3);
    expect(text.split('\n')[0]).not.toBe('Name\tEmail\tAge');
    plugin.destroy?.();
  });

  it('emits clipboard:copied event', async () => {
    const { trellis, plugin } = setup();
    const handler = vi.fn();
    trellis.api.on('clipboard:copied', handler);
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(handler.mock.calls[0][0].rows).toBeDefined();
    expect(handler.mock.calls[0][0].text).toBeDefined();
    plugin.destroy?.();
  });
});

describe('clipboard plugin - paste', () => {
  it('parses clipboard TSV and emits clipboard:paste', async () => {
    const clipboardText = 'Name\tEmail\tAge\nAlice\ta@t.com\t30\nBob\tb@t.com\t25';
    const { trellis, readText, plugin } = setup(clipboardText);
    const handler = vi.fn();
    trellis.api.on('clipboard:paste', (payload) => {
      if (payload && typeof payload === 'object' && 'rows' in payload) {
        handler(payload);
      }
    });
    trellis.api.emit('clipboard:paste', undefined);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(readText).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0];
    expect(payload.rows).toEqual([
      { name: 'Alice', email: 'a@t.com', age: '30' },
      { name: 'Bob', email: 'b@t.com', age: '25' },
    ]);
    expect(payload.raw).toBe(clipboardText);
    plugin.destroy?.();
  });

  it('does not emit paste when clipboard is empty', async () => {
    const { trellis, plugin } = setup('');
    const handler = vi.fn();
    trellis.api.on('clipboard:paste', (payload) => {
      if (payload && typeof payload === 'object' && 'rows' in payload) {
        handler(payload);
      }
    });
    trellis.api.emit('clipboard:paste', undefined);
    await new Promise((r) => setTimeout(r, 50));
    expect(handler).not.toHaveBeenCalled();
    plugin.destroy?.();
  });

  it('does not emit paste when clipboard is whitespace only', async () => {
    const { trellis, plugin } = setup('   \n  ');
    const handler = vi.fn();
    trellis.api.on('clipboard:paste', (payload) => {
      if (payload && typeof payload === 'object' && 'rows' in payload) {
        handler(payload);
      }
    });
    trellis.api.emit('clipboard:paste', undefined);
    await new Promise((r) => setTimeout(r, 50));
    expect(handler).not.toHaveBeenCalled();
    plugin.destroy?.();
  });
});

describe('clipboard plugin - DOM events', () => {
  it('uses clipboardData.setData on copy event', () => {
    const { writeText, plugin } = setup();
    const clipboardData = dispatchCopy();
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', expect.any(String));
    expect(writeText).not.toHaveBeenCalled();
    plugin.destroy?.();
  });

  it('uses clipboardData.getData on paste event', () => {
    const { plugin } = setup();
    const handler = vi.fn();
    const trellis = new Trellis<User>({ data, columns, plugins: [createClipboardPlugin()] });
    trellis.api.on('clipboard:paste', (payload) => {
      if (payload && typeof payload === 'object' && 'rows' in payload) handler(payload);
    });
    const clipboardData = dispatchPaste(undefined, 'Alice\t30');
    expect(clipboardData.getData).toHaveBeenCalledWith('text/plain');
    expect(handler).toHaveBeenCalledOnce();
    plugin.destroy?.();
  });

  it('skips copy when target is text INPUT', () => {
    const { plugin } = setup();
    const clipboardData = dispatchCopy({ tagName: 'INPUT', isContentEditable: false, type: 'text' });
    expect(clipboardData.setData).not.toHaveBeenCalled();
    plugin.destroy?.();
  });

  it('triggers copy when target is checkbox INPUT', () => {
    const { plugin } = setup();
    const clipboardData = dispatchCopy({ tagName: 'INPUT', isContentEditable: false, type: 'checkbox' });
    expect(clipboardData.setData).toHaveBeenCalled();
    plugin.destroy?.();
  });

  it('skips paste when target is TEXTAREA', () => {
    const { plugin } = setup();
    const clipboardData = dispatchPaste({ tagName: 'TEXTAREA', isContentEditable: false }, 'text');
    expect(clipboardData.getData).not.toHaveBeenCalled();
    plugin.destroy?.();
  });

  it('skips when target is contentEditable', () => {
    const { plugin } = setup();
    const clipboardData = dispatchCopy({ tagName: 'DIV', isContentEditable: true });
    expect(clipboardData.setData).not.toHaveBeenCalled();
    plugin.destroy?.();
  });
});

describe('clipboard plugin - programmatic trigger', () => {
  it('clipboard:copy triggers copy flow', async () => {
    const { trellis, writeText, plugin } = setup();
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    plugin.destroy?.();
  });

  it('clipboard:paste triggers paste flow', async () => {
    const { trellis, readText, plugin } = setup('Alice\t30');
    const handler = vi.fn();
    trellis.api.on('clipboard:paste', (payload) => {
      if (payload && typeof payload === 'object' && 'rows' in payload) {
        handler(payload);
      }
    });
    trellis.api.emit('clipboard:paste', undefined);
    await vi.waitFor(() => expect(readText).toHaveBeenCalled());
    expect(handler).toHaveBeenCalledOnce();
    plugin.destroy?.();
  });
});

describe('clipboard plugin - error handling', () => {
  it('emits clipboard:error when API unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true, configurable: true });
    const plugin = createClipboardPlugin();
    const trellis = new Trellis<User>({ data, columns, plugins: [plugin] });
    const handler = vi.fn();
    trellis.api.on('clipboard:error', handler);
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(handler.mock.calls[0][0].action).toBe('copy');
    expect(handler.mock.calls[0][0].error).toBeInstanceOf(Error);
    plugin.destroy?.();
  });

  it('emits clipboard:error when writeText rejects', async () => {
    const writeText = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('denied'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText, readText: vi.fn() } },
      writable: true,
      configurable: true,
    });
    const plugin = createClipboardPlugin();
    const trellis = new Trellis<User>({ data, columns, plugins: [plugin] });
    const handler = vi.fn();
    trellis.api.on('clipboard:error', handler);
    trellis.api.emit('clipboard:copy', undefined);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    expect(handler.mock.calls[0][0].action).toBe('copy');
    plugin.destroy?.();
  });
});

describe('clipboard plugin - destroy', () => {
  it('removes copy and paste listeners', () => {
    const { writeText, plugin } = setup();
    plugin.destroy?.();
    dispatchCopy();
    expect(writeText).not.toHaveBeenCalled();
  });
});
