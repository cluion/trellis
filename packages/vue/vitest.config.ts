import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';
import { compileScript, parse } from 'vue/compiler-sfc';

export default defineConfig({
    plugins: [
        {
            name: 'vue-test-sfc',
            resolveId(id, importer) {
                if (!importer?.endsWith('.vue')) {
                    return;
                }

                if (id.startsWith('@trellisjs/')) {
                    return fileURLToPath(
                        new URL(
                            `../${id.slice('@trellisjs/'.length)}/dist/index.mjs`,
                            import.meta.url,
                        ),
                    );
                }

                return this.resolve(id, fileURLToPath(import.meta.url));
            },
            transform(source, filename) {
                if (!filename.endsWith('.vue')) {
                    return;
                }

                const { descriptor, errors } = parse(source, { filename });

                if (errors.length) {
                    throw errors[0];
                }

                const script = compileScript(descriptor, {
                    id: filename,
                    inlineTemplate: true,
                });

                return ts.transpileModule(script.content, {
                    compilerOptions: {
                        target: ts.ScriptTarget.ES2020,
                        module: ts.ModuleKind.ESNext,
                    },
                }).outputText;
            },
        },
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80,
            },
        },
    },
});
