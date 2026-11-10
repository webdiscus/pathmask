import vm from 'node:vm';
import { describe, expect, test } from 'vitest';
import { minifySpaces } from './index.js';

describe('Minify spaces', () => {
  test.each([
    'let a = 1, b = 2; JSON.stringify([a + ++b, a, b]);',
    'let a = 1, b = 2; JSON.stringify([a - --b, a, b]);',
    String.raw`JSON.stringify([/https?:\/\//.test('https://example.com'), '/* text */', '// text']);`,
    'const name = "world"; `hello ${name.toUpperCase()}\n  text`;',
    'function value() { return\n { a: 1 }; } String(value());',
    'const a = 12, b = 3; a / b / 2;',
  ])('keeps the meaning of JavaScript, %s', async (code) => {
    const { code: output } = await minifySpaces().renderChunk(code);

    expect(vm.runInNewContext(output)).toEqual(vm.runInNewContext(code));
  });

  test('removes JavaScript comments without changing strings or regular expressions', async () => {
    const code = String.raw`/* remove block */ const url = 'https://example.com';
      // remove line
      JSON.stringify([url, '/* keep */', /\/\//.test('//')]);`;
    const { code: output } = await minifySpaces().renderChunk(code);

    expect(output).not.toContain('remove block');
    expect(output).not.toContain('remove line');
    expect(vm.runInNewContext(output)).toEqual(vm.runInNewContext(code));
  });
});
