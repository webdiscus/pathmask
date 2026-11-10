import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['rollup/**/*.test.js'],
  },
});
