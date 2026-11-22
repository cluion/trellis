type SortCriterion = { columnId: string; direction: 'asc' | 'desc' };

export function orderUserPages(
    sort: readonly SortCriterion[] = [],
): SortCriterion[] {
    return sort.some(({ columnId }) => columnId === 'id')
        ? [...sort]
        : [...sort, { columnId: 'id', direction: 'asc' }];
}
