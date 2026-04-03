import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/*.spec.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-secret-key',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.*/**',
      '**/attached_assets/**',
      '**/artifacts/mockup-sandbox/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.*/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/attached_assets/**',
        '**/artifacts/mockup-sandbox/**',
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
});