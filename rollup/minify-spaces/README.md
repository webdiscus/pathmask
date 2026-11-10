# minifySpaces

A Rollup plugin for removing extra spaces from JavaScript output with Terser.

- Removes extra spaces, line breaks, and indentation.
- Removes comments.
- Keeps spaces needed between code tokens, including `+` and `++`.
- Keeps the meaning of strings, regular expressions, and template strings.
- Keeps names and does not compress expressions.

## Usage

```js
import { minifySpaces } from './rollup/minify-spaces/index.js';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [minifySpaces()],
};
```

## Options

The plugin takes no options. It depends only on `terser` and has no imports from other local files.

## Output

The plugin processes each JavaScript chunk through `renderChunk`.
It uses ESM mode and ECMAScript 2022 syntax settings, suitable for Node.js 20 or later.

This step removes extra spaces and comments. It does not compress expressions or shorten names.
Use `@rollup/plugin-terser` before this plugin when those changes are needed.

Strings, regular expressions, and template strings keep their meaning.
Line breaks and indentation are not preserved. The plugin adds a final newline.

The plugin does not create source maps or update existing source maps.
Invalid JavaScript stops the build.
