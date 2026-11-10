import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: fileURLToPath(new URL('./src/index.js', import.meta.url)),
        replacement: fileURLToPath(new URL('./dist/index.js', import.meta.url)),
      },
    ],
  },
  test: {
    include: ['test/pathmask.test.js', 'test/examples.test.js'],
  },
});
