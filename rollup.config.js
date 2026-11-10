import terser from '@rollup/plugin-terser';
import { formatCode } from './rollup/format-code/index.js';
import { copyFiles } from './rollup/copy-files/index.js';
import { packageJsonForNpm } from './rollup/package-json-for-npm/index.js';
import { formatTypes } from './rollup/format-types/index.js';

export const terserPrettyOptions = {
  ecma: 2022,
  module: true,
  compress: false,
  mangle: false,
  format: {
    comments: false,
    beautify: true,
    indent_level: 2,
  },
};

export default {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    entryFileNames: 'index.js',
    format: 'es',
  },
  plugins: [
    terser(terserPrettyOptions),
    formatCode(),
    formatTypes(),
    packageJsonForNpm({
      main: './index.js',
      types: './index.d.ts',
      exports: {
        '.': {
          types: './index.d.ts',
          import: './index.js',
        },
      },
      files: ['index.js', 'index.d.ts'],
    }),
    copyFiles([
      {
        src: 'src',
        patterns: ['/*.d.ts'],
      },
      { src: 'README.npm.md', rename: 'README.md' },
      { src: 'LICENSE' },
    ]),
  ],
};
