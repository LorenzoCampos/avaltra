// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ListPaginationControls } from './ListPaginationControls';
import type { ListPaginationState } from '@/lib/listPagination';

const labels = { showing: 'Showing 21-40 of 45', page: 'Page 2 of 3', previous: 'Previous', next: 'Next', localFilterNotice: 'Filters apply to this page only.' };
const page = (overrides: Partial<ListPaginationState> = {}): ListPaginationState => ({
  total_count: 45, page: 2, limit: 20, total_pages: 3, from: 21, to: 40, hasPrevious: true, hasNext: true, ...overrides,
});

const renderControls = (pagination = page(), showLocalFilterNotice = false) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const onPrevious = vi.fn();
  const onNext = vi.fn();
  document.body.appendChild(container);
  act(() => root.render(<ListPaginationControls pagination={pagination} labels={labels} showLocalFilterNotice={showLocalFilterNotice} onPrevious={onPrevious} onNext={onNext} />));
  return { buttons: () => Array.from(container.querySelectorAll('button')), container, onNext, onPrevious, root };
};

describe('ListPaginationControls', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it.each([
    ['previous', page({ page: 1, from: 1, to: 20, hasPrevious: false }), true, false],
    ['next', page({ page: 3, from: 41, to: 45, hasNext: false }), false, true],
  ])('disables %s at the matching boundary', (_, pagination, previousDisabled, nextDisabled) => {
    const { buttons, container, root } = renderControls(pagination);
    const [previous, next] = buttons();

    expect(container.textContent).toContain(labels.page);
    expect(previous.disabled).toBe(previousDisabled);
    expect(next.disabled).toBe(nextDisabled);
    act(() => root.unmount());
  });

  it('emits callbacks for valid page actions and renders the local-filter notice only when requested', () => {
    const hidden = renderControls(page(), false);
    expect(hidden.container.textContent).not.toContain(labels.localFilterNotice);
    act(() => hidden.root.unmount());

    const visible = renderControls(page(), true);
    const [previous, next] = visible.buttons();
    act(() => { previous.click(); next.click(); });

    expect(visible.container.textContent).toContain(labels.localFilterNotice);
    expect(visible.onPrevious).toHaveBeenCalledTimes(1);
    expect(visible.onNext).toHaveBeenCalledTimes(1);
    act(() => visible.root.unmount());
  });
});
