import {
    trellisPrismaQuery,
    withPrismaSnapshot,
} from '../../../packages/server-prisma/dist/index.mjs';
import type { PrismaClient } from './generated/client/client.ts';

declare const client: PrismaClient;

void withPrismaSnapshot(client, async (tx) => {
    await tx.user.count();
    // @ts-expect-error The callback receives a transaction client, not any.
    await tx.missingModel.findMany();
    // @ts-expect-error Transaction callbacks cannot disconnect the root client.
    await tx.$disconnect();
    // @ts-expect-error An existing transaction cannot establish a new snapshot.
    await withPrismaSnapshot(tx, async () => 1);

    return trellisPrismaQuery<{ id: number }>(
        tx.user,
        { page: 1, pageSize: 5 },
        { select: { id: true } },
    );
});
