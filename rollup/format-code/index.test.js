import vm from 'node:vm';
import { rollup } from 'rollup';
import terser from '@rollup/plugin-terser';
import { expect, test } from 'vitest';
import { formatCode } from './index.js';
import { terserPrettyOptions } from '../../rollup.config.js';

async function generate(code) {
  const build = await rollup({
    input: 'entry',
    treeshake: false,
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => id === 'entry' ? id : null,
        load: (id) => id === 'entry' ? code : null,
      },
      terser(terserPrettyOptions),
      formatCode(),
    ],
  });

  try {
    const { output } = await build.generate({ format: 'es' });

    return output[0].code;
  } finally {
    await build.close();
  }
}

test('keeps names and expressions with tab indentation and no comments or empty lines', async () => {
  const output = await generate(`
    // remove this comment
    export function calculateValue(alpha, beta) {

      /* remove this too */
      const unusedValue = 1 + 2;
      return alpha + ++beta;
    }
  `);

  expect(output).toContain('function calculateValue(alpha, beta)');
  expect(output).toContain('\tconst unusedValue = 1 + 2;');
  expect(output).toContain('\treturn alpha + ++beta;');
  expect(output).not.toContain('remove this');
  expect(output).not.toMatch(/^[\t ]*\n/m);
  expect(output).not.toMatch(/^ +\S/m);
});

test.each([
  '`first\n  second\n\n    last`',
  'String.raw`first\n  second\n\n    last`',
  '`first\n  ${`inner\n    text`}\n\n  last`',
  '"first\\\n  second"',
  String.raw`JSON.stringify(['/* keep */', 'https://example.com', /\/\//.test('//')])`,
])('keeps string values and regular expressions, %s', async (expression) => {
  const code = `globalThis.result = ${expression};`;
  const output = await generate(code);
  const original = {};
  const formatted = {};
  vm.runInNewContext(code, original);
  vm.runInNewContext(output, formatted);

  expect(formatted.result).toBe(original.result);
});
