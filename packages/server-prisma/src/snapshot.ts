/** Root-client subset; transaction delegates cannot open a new snapshot. */
export interface PrismaSnapshotClient<Transaction> {
    $connect(): Promise<void>;
    $transaction<Result>(
        operation: (transaction: Transaction) => Promise<Result>,
        options: { isolationLevel: 'RepeatableRead' },
    ): Promise<Result>;
}

/** Read counts and rows from one MySQL/PostgreSQL snapshot. */
export async function withPrismaSnapshot<Transaction, Result>(
    client: PrismaSnapshotClient<Transaction>,
    operation: (transaction: Transaction) => Promise<Result>,
): Promise<Result> {
    if (
        typeof client?.$connect !== 'function' ||
        typeof client.$transaction !== 'function'
    ) {
        throw new TypeError(
            'withPrismaSnapshot requires a root Prisma client.',
        );
    }

    return client.$transaction(operation, { isolationLevel: 'RepeatableRead' });
}
