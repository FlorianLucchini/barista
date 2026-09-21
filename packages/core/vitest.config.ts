import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // The engine is pure TypeScript with no DOM dependency — that constraint is
    // enforced by `pnpm deps:check`, and running tests in a bare Node
    // environment is what keeps it honest.
    environment: 'node',
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/index.ts'],
    },
  },
});
