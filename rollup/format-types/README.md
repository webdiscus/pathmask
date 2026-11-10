# formatTypes

A Rollup plugin for formatting TypeScript declaration files.

- Processes `.d.ts` files added to the Rollup output.
- Removes comments and empty lines outside string types.
- Replaces two-space indentation with tabs.
- Keeps text and empty lines inside string types and template types.
- Keeps TypeScript reference directives needed by the declarations.
- Keeps type names and declarations.

## Usage

```js
import { copyFiles } from './rollup/copy-files/index.js';
import { formatTypes } from './rollup/format-types/index.js';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [
    copyFiles([{ src: 'src', patterns: ['/*.d.ts'] }]),
    formatTypes(),
  ],
};
```

## Options

The plugin takes no options. Input declarations use two spaces per indentation level.
It uses `@babel/parser` to read TypeScript syntax.

## Output

The plugin runs in the post stage of `generateBundle`, after files are added by plugins such as `copyFiles`.
It changes only output assets with names ending in `.d.ts`. Source files and other output files stay unchanged.

Both text and byte assets are supported. Declaration output uses UTF-8 text.
Invalid TypeScript syntax stops the build.
