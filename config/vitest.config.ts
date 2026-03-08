import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '../node_modules/',
        '../dist/',
        '../build/',
        '../reports/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    include: [
      '../apps/**/*.test.ts',
      '../apps/**/*.spec.ts',
      '../services/**/*.test.ts',
      '../services/**/*.spec.ts',
      '../packages/**/*.test.ts',
      '../packages/**/*.spec.ts',
      '../scripts/**/*.test.ts',
      '../scripts/**/*.spec.ts'
    ],
    exclude: ['../**/node_modules/**', '../**/dist/**', '../**/build/**', '../**/reports/**']
  }
});
