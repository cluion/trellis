import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlotRegistry } from '../src/slot/slot-registry';

describe('SlotRegistry', () => {
  let registry: SlotRegistry;

  beforeEach(() => {
    registry = new SlotRegistry();
  });

  it('registers and retrieves a slot renderer', () => {
    const renderer = vi.fn(() => 'rendered');
    registry.register('headerCell', renderer);

    const result = registry.get('headerCell');
    expect(result).toBe(renderer);
  });

  it('returns undefined for unregistered slot', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('has() returns true for registered slots', () => {
    registry.register('headerCell', () => null);
    expect(registry.has('headerCell')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('register returns an unregister function', () => {
    const renderer = vi.fn();
    const unregister = registry.register('headerCell', renderer);

    unregister();
    expect(registry.get('headerCell')).toBeUndefined();
    expect(registry.has('headerCell')).toBe(false);
  });

  it('register overwrites previous renderer for same name', () => {
    const renderer1 = vi.fn(() => 'first');
    const renderer2 = vi.fn(() => 'second');

    registry.register('headerCell', renderer1);
    registry.register('headerCell', renderer2);

    expect(registry.get('headerCell')).toBe(renderer2);
  });

  it('render() calls the registered renderer with context', () => {
    const renderer = vi.fn((ctx) => `Hello ${ctx.name}`);
    registry.register('greeting', renderer);

    const result = registry.render('greeting', { name: 'World' });

    expect(renderer).toHaveBeenCalledWith({ name: 'World' });
    expect(result).toBe('Hello World');
  });

  it('render() returns undefined for unregistered slot', () => {
    const result = registry.render('nonexistent');
    expect(result).toBeUndefined();
  });
});
