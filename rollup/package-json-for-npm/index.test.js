import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rollup } from 'rollup';
import { expect, test } from 'vitest';
import { packageJsonForNpm } from './index.js';

async function withManifest(content, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'pathmask-manifest-'));
  const src = path.join(root, 'package.json');
  await writeFile(src, content);
  const build = await rollup({
    input: 'entry',
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => id === 'entry' ? id : null,
        load: (id) => id === 'entry' ? 'export const value = 1;' : null,
      },
      packageJsonForNpm({
        src,
        main: './index.js',
        types: './index.d.ts',
        exports: { '.': { types: './index.d.ts', import: './index.js' } },
        files: ['index.js', 'index.d.ts'],
      }),
    ],
  });

  try {
    await run(build, src);
  } finally {
    await build.close();
    await rm(root, { recursive: true, force: true });
  }
}

async function generate(build) {
  const { output } = await build.generate({ format: 'es' });
  const manifest = output.find((file) => file.fileName === 'package.json');

  return JSON.parse(manifest.source);
}

test('copies package metadata and replaces output paths', async () => {
  const source = JSON.parse(await readFile('package.json', 'utf8'));
  source.scripts = { postinstall: 'do-not-publish' };
  source.devDependencies = { tool: '1.0.0' };
  source.customBuildSetting = true;

  await withManifest(JSON.stringify(source), async (build, src) => {
    const result = await generate(build);
    const { scripts, devDependencies, customBuildSetting, ...expected } = source;

    expect(result).toEqual({
      ...expected,
      main: './index.js',
      types: './index.d.ts',
      exports: { '.': { types: './index.d.ts', import: './index.js' } },
      files: ['index.js', 'index.d.ts'],
    });
    expect(build.watchFiles).toContain(src);
  });
});

test('keeps runtime dependencies and publication settings', async () => {
  const source = {
    name: 'example',
    version: '1.0.0',
    private: true,
    sideEffects: false,
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' },
    dependencies: { runtime: '^1.0.0' },
    optionalDependencies: { optional: '^2.0.0' },
    peerDependencies: { peer: '^3.0.0' },
    peerDependenciesMeta: { peer: { optional: true } },
    bundledDependencies: ['runtime'],
  };

  await withManifest(JSON.stringify(source), async (build) => {
    expect(await generate(build)).toMatchObject(source);
  });
});

test('reads updated metadata on each output without adding missing fields', async () => {
  await withManifest('{"name":"example","version":"1.0.0"}', async (build, src) => {
    const first = await generate(build);

    expect(first.version).toBe('1.0.0');
    expect(first).not.toHaveProperty('dependencies');
    await writeFile(src, '{"name":"example","version":"1.0.1"}');
    expect((await generate(build)).version).toBe('1.0.1');
  });
});

test.each(['{', 'null', '[]', '"text"'])('rejects an invalid manifest, %s', async (content) => {
  await withManifest(content, async (build) => {
    await expect(generate(build)).rejects.toThrow();
  });
});
