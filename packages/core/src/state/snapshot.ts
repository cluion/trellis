/** Copy owned containers while keeping application payloads opaque. */
export function createSnapshotter(
    isOpaque: (value: object) => boolean = () => false,
): <T>(value: T) => T {
    const protectedValues = new WeakSet<object>();

    return function snapshot<T>(value: T): T {
        if (
            value === null ||
            typeof value !== 'object' ||
            isOpaque(value) ||
            protectedValues.has(value)
        ) {
            return value;
        }

        const seen = new WeakMap<object, object>();

        function visit(value: unknown): unknown {
            if (
                value === null ||
                typeof value !== 'object' ||
                isOpaque(value) ||
                protectedValues.has(value)
            ) {
                return value;
            }

            if (seen.has(value)) {
                return seen.get(value);
            }

            if (value instanceof Set) {
                const target = new Set<unknown>();
                const reject = () => {
                    throw new TypeError(
                        'State snapshots are readonly; use the table API to update state.',
                    );
                };
                const proxy = new Proxy(target, {
                    get(target, key, receiver) {
                        if (
                            key === 'add' ||
                            key === 'delete' ||
                            key === 'clear'
                        ) {
                            return reject;
                        }

                        if (key === 'size') {
                            return target.size;
                        }

                        if (key === 'forEach') {
                            return (
                                callback: (
                                    value: unknown,
                                    key: unknown,
                                    set: Set<unknown>,
                                ) => void,
                                thisArg?: unknown,
                            ) => {
                                target.forEach((item) =>
                                    callback.call(
                                        thisArg,
                                        item,
                                        item,
                                        receiver,
                                    ),
                                );
                            };
                        }

                        if (
                            key === Symbol.iterator ||
                            key === 'values' ||
                            key === 'has' ||
                            key === 'keys' ||
                            key === 'entries'
                        ) {
                            return Reflect.get(target, key, target).bind(
                                target,
                            );
                        }

                        if (
                            typeof key === 'string' &&
                            [
                                'union',
                                'intersection',
                                'difference',
                                'symmetricDifference',
                                'isSubsetOf',
                                'isSupersetOf',
                                'isDisjointFrom',
                            ].includes(key)
                        ) {
                            const method = Reflect.get(target, key, target);

                            return typeof method === 'function'
                                ? method.bind(target)
                                : method;
                        }

                        return Reflect.get(target, key, receiver);
                    },
                    set: reject,
                    defineProperty: reject,
                    deleteProperty: reject,
                    setPrototypeOf: reject,
                });
                seen.set(value, proxy);

                for (const item of value) {
                    target.add(visit(item));
                }

                Object.freeze(target);
                protectedValues.add(proxy);

                return proxy;
            }

            const prototype = Object.getPrototypeOf(value);

            if (
                !Array.isArray(value) &&
                prototype !== Object.prototype &&
                prototype !== null
            ) {
                return value;
            }

            const copy = Array.isArray(value) ? [] : Object.create(prototype);
            seen.set(value, copy);

            for (const key of Reflect.ownKeys(value)) {
                if (Array.isArray(value) && key === 'length') {
                    continue;
                }

                const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
                Object.defineProperty(copy, key, {
                    value: visit(Reflect.get(value, key)),
                    enumerable: descriptor.enumerable,
                    configurable: true,
                    writable: true,
                });
            }

            if (Array.isArray(value)) {
                copy.length = value.length;
            }

            Object.freeze(copy);
            protectedValues.add(copy);

            return copy;
        }

        return visit(value) as T;
    };
}
