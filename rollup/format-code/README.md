# formatCode

A Rollup plugin for formatting JavaScript output.

- Replaces two-space indentation with tabs.
- Removes empty lines outside strings.
- Keeps text and empty lines inside strings and template strings.
- Keeps names, expressions, and spaces between code tokens.

## Usage

```js
import terser from '@rollup/plugin-terser';
import { formatCode } from './rollup/format-code/index.js';

const terserPrettyOptions = {
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
  output: { dir: 'dist', format: 'es' },
  plugins: [terser(terserPrettyOptions), formatCode()],
};
```

## Options

The plugin takes no options. Input code must use two spaces per indentation level.
The Terser settings in the example provide this format and remove comments.
It keeps names and expressions without compression.

## Output

The plugin runs through `renderChunk`. It reads JavaScript tokens with `@babel/parser`
and changes only whitespace outside those tokens.
Names, expressions, and spaces between code tokens are kept.

The plugin does not create source maps or update existing source maps.
Invalid JavaScript stops the build.
