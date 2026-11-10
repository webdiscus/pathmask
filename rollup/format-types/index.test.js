import { rollup } from 'rollup';
import { expect, test } from 'vitest';
import { formatTypes } from './index.js';

async function generate(declarations) {
  const build = await rollup({
    input: 'entry',
    plugins: [
      formatTypes(),
      {
        name: 'declarations',
        resolveId: (id) => id === 'entry' ? id : null,
        load: (id) => id === 'entry' ? 'export const value = 1;' : null,
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'types/index.d.ts', source: declarations });
          this.emitFile({ type: 'asset', fileName: 'data.txt', source: '/* keep */\n\n  text' });
        },
      },
    ],
  });

  try {
    const { output } = await build.generate({ format: 'es' });

    return output;
  } finally {
    await build.close();
  }
}

test.each([false, true])('formats emitted declarations after other plugins, byte input %s', async (bytes) => {
  const input = `/** remove */
export declare class Example {

  // remove
  value: string;
  run(input: readonly string[]): boolean;
}
`;
  const output = await generate(bytes ? Buffer.from(input) : input);
  const declaration = output.find((file) => file.fileName === 'types/index.d.ts');

  expect(declaration.source).toBe('export declare class Example {\n\tvalue: string;\n\trun(input: readonly string[]): boolean;\n}\n');
  expect(output.find((file) => file.fileName === 'data.txt').source).toBe('/* keep */\n\n  text');
});

test('keeps strings, template types, and reference directives', async () => {
  const input = '/// <reference types="node" />\n/** remove */\n' +
    'export type Url = "https://example.com";\nexport type Text = "/* keep */";\n' +
    'export type Template = `first\n  second\n\n    last`;\n';
  const output = await generate(input);
  const declaration = output.find((file) => file.fileName === 'types/index.d.ts').source;

  expect(declaration).not.toContain('remove');
  expect(declaration).toContain('/// <reference types="node" />');
  expect(declaration).toContain('"https://example.com"');
  expect(declaration).toContain('"/* keep */"');
  expect(declaration).toContain('`first\n  second\n\n    last`');
});

test('rejects broken declarations', async () => {
  await expect(generate('export type X = {')).rejects.toThrow();
});
