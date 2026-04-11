import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../src/event/event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('calls a listener when an event is emitted', () => {
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.emit('test:event', { value: 42 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('calls multiple listeners for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on('test:event', handler1);
    bus.on('test:event', handler2);
    bus.emit('test:event', null);

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('does not call listeners for different events', () => {
    const handler = vi.fn();
    bus.on('test:other', handler);
    bus.emit('test:event', null);

    expect(handler).not.toHaveBeenCalled();
  });

  it('returns an unsubscribe function from on()', () => {
    const handler = vi.fn();
    const unsubscribe = bus.on('test:event', handler);

    unsubscribe();
    bus.emit('test:event', null);

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports unsubscribing while other listeners remain', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsub1 = bus.on('test:event', handler1);
    bus.on('test:event', handler2);

    unsub1();
    bus.emit('test:event', null);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('clear removes all listeners', () => {
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.on('test:other', handler);

    bus.clear();
    bus.emit('test:event', null);
    bus.emit('test:other', null);

    expect(handler).not.toHaveBeenCalled();
  });

  it('the same handler cannot be registered twice for the same event', () => {
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.on('test:event', handler);
    bus.emit('test:event', null);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('emit with no listeners does not throw', () => {
    expect(() => bus.emit('nonexistent', null)).not.toThrow();
  });

  it('handles errors in listeners without breaking other listeners', () => {
    const errorHandler = vi.fn(() => {
      throw new Error('boom');
    });
    const normalHandler = vi.fn();

    bus.on('test:event', errorHandler);
    bus.on('test:event', normalHandler);
    bus.emit('test:event', null);

    expect(errorHandler).toHaveBeenCalled();
    expect(normalHandler).toHaveBeenCalledOnce();
  });
});
