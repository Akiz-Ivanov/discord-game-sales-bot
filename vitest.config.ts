// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./src/test/setup-env.ts'],
          exclude: ['src/repositories/**', 'node_modules/**'],
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
    ],
  },
})
