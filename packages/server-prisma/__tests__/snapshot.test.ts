import { describe, expect, it, vi } from 'vitest';
import { withPrismaSnapshot } from '../src/snapshot';

describe('Prisma 快照交易', () => {
    it('使用 RepeatableRead 並把交易 client 傳給讀取函式', async () => {
        const transaction = { user: { count: async () => 3 } };
        const client = {
            $connect: vi.fn(),
            $transaction: vi.fn(async (operation) => operation(transaction)),
        };
        const result = await withPrismaSnapshot(
            client,
            async (tx: typeof transaction) => tx.user.count(),
        );
        expect(result).toBe(3);
        expect(client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
            isolationLevel: 'RepeatableRead',
        });
    });

    it('傳遞交易錯誤且不自動重試 callback', async () => {
        const failure = new Error('transaction aborted');
        const client = {
            $connect: vi.fn(),
            $transaction: vi.fn().mockRejectedValue(failure),
        };
        const operation = vi.fn();
        await expect(withPrismaSnapshot(client, operation)).rejects.toBe(
            failure,
        );
        expect(client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('拒絕將交易 client 當成 root client，以免繼承較弱的隔離層級', async () => {
        const transaction = { $transaction: vi.fn() };
        await expect(
            withPrismaSnapshot(transaction as never, async () => 1),
        ).rejects.toThrow(/root Prisma client/);
        expect(transaction.$transaction).not.toHaveBeenCalled();
    });
});
