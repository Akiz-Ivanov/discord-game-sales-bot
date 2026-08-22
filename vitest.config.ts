// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./src/test/setup-env.ts'],
          exclude: [
            'src/repositories/**',
            '**/*.e2e.test.ts',
            'node_modules/**',
          ],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'repositories',
          environment: 'node',
          setupFiles: ['./src/test/setup-env.ts'],
          include: ['src/repositories/**/*.test.ts'],
          fileParallelism: false,
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'e2e',
          environment: 'node',
          setupFiles: ['./src/test/setup-env.ts', './src/test/e2e/setup.ts'],
          include: ['**/*.e2e.test.ts'],
          fileParallelism: false,
          testTimeout: 20000,
        },
      },
    ],
  },
})
