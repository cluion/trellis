import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotRenderer } from '../src/slots/slot-renderer';
import type { TrellisAPI } from '@trellisjs/core';
import { TrellisContext } from '../src/context';

function createMockApiWithSlot(
  slotName: string,
  renderer: (ctx: unknown) => unknown,
): TrellisAPI {
  return {
    getState: () => ({ data: [], columns: [] }) as any,
    setState: () => {},
    subscribe: () => () => {},
    on: () => () => {},
    emit: () => {},
    registerSlot: () => () => {},
    getSlot: (name: string) => (name === slotName ? renderer : undefined),
  };
}

describe('SlotRenderer', () => {
  it('renders slot content when slot is registered', () => {
    const api = createMockApiWithSlot('custom', () => 'Custom Content');

    render(
      <TrellisContext.Provider value={api}>
        <SlotRenderer name="custom" />
      </TrellisContext.Provider>,
    );

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('renders fallback when slot is not registered', () => {
    const api = createMockApiWithSlot('other', () => 'Other');

    render(
      <TrellisContext.Provider value={api}>
        <SlotRenderer name="custom" fallback={<span>Default</span>} />
      </TrellisContext.Provider>,
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders nothing when slot is not registered and no fallback', () => {
    const api = createMockApiWithSlot('other', () => 'Other');

    const { container } = render(
      <TrellisContext.Provider value={api}>
        <SlotRenderer name="custom" />
      </TrellisContext.Provider>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('passes context to the slot renderer', () => {
    const api = createMockApiWithSlot('cell', (ctx: any) => `Value: ${ctx.value}`);

    render(
      <TrellisContext.Provider value={api}>
        <SlotRenderer name="cell" context={{ value: 42 }} />
      </TrellisContext.Provider>,
    );

    expect(screen.getByText('Value: 42')).toBeInTheDocument();
  });
});
