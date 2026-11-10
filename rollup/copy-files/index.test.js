import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rollup } from 'rollup';
import { describe, expect, test } from 'vitest';
import { copyFiles } from './index.js';

async function generate(targets) {
  const build = await rollup({
    input: 'entry',
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => id === 'entry' ? id : null,
        load: (id) => id === 'entry' ? 'export const value = 1;' : null,
      },
      copyFiles(targets),
    ],
  });

  try {
    return await build.generate({ format: 'es' });
  } finally {
    await build.close();
  }
}

describe('Copy files', () => {
  test('selects paths with PathMask and supports renaming and async transforms', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pathmask-copy-'));

    try {
      await mkdir(path.join(root, 'nested'));
      await writeFile(path.join(root, 'index.d.ts'), 'types');
      await writeFile(path.join(root, 'skip.d.ts'), 'skip');
      await writeFile(path.join(root, 'nested', 'child.d.ts'), 'nested');
      await writeFile(path.join(root, 'data.bin'), Buffer.from([0, 255, 128]));
      const { output } = await generate([
        { src: root, patterns: ['/*.d.ts', '!skip.d.ts'], transform: async (content) => content.toUpperCase() },
        { src: path.join(root, 'data.bin'), rename: 'renamed.bin' },
      ]);
      const assets = output.filter((file) => file.type === 'asset');

      expect(assets.map((file) => file.fileName).sort()).toEqual(['index.d.ts', 'renamed.bin']);
      expect(assets.find((file) => file.fileName === 'index.d.ts').source).toBe('TYPES');
      expect(assets.find((file) => file.fileName === 'renamed.bin').source).toEqual(await readFile(path.join(root, 'data.bin')));
      const nested = await generate([{ src: root, patterns: ['*.d.ts', '!skip.d.ts'] }]);

      expect(nested.output.filter((file) => file.type === 'asset').map((file) => file.fileName).sort())
        .toEqual(['index.d.ts', 'nested/child.d.ts']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('fails when a source is missing', async () => {
    await expect(generate([{ src: 'missing-source-file-for-build-test' }])).rejects.toThrow('ENOENT');
  });

  test('fails when output names conflict', async () => {
    await expect(generate([{ src: 'LICENSE' }, { src: 'LICENSE' }])).rejects.toThrow('Duplicate output file');
  });

  test('reports transform failures', async () => {
    await expect(generate([{
      src: 'LICENSE',
      transform: async () => {
        throw new Error('Transform failed');
      },
    }])).rejects.toThrow('Transform failed');
  });
});
