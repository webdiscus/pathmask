# copyFiles

A Rollup plugin for copying files into the output directory.

- Copies individual files or files from directories.
- Selects files with PathMask patterns.
- Renames output files.
- Applies text transforms, including async functions.
- Copies files as bytes when no transform is set.

## Usage

```js
import { copyFiles } from './rollup/copy-files/index.js';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [
    copyFiles([
      { src: 'src', patterns: ['/*.d.ts'] },
      { src: 'README.npm.md', rename: 'README.md' },
      { src: 'LICENSE' },
    ]),
  ],
};
```

## Targets

Pass an array of target objects to `copyFiles`.

| Option | Type | Description |
|---|---|---|
| `src` | `string` | Required file or directory path. Relative paths start at the working directory. |
| `patterns` | `string[]` | Patterns used to select files inside a directory. Defaults to `['**']`. |
| `rename` | `string` | Output file name. Defaults to the source file name or its path within the source directory. |
| `transform` | `(content) => string \| Promise<string>` | Function that receives UTF-8 text and returns the new content. |

## Patterns

Directory targets use PathMask with gitignore-style patterns. Paths use `/` separators
and are relative to the source directory.

`*.d.ts` selects matching files at any depth. `/*.d.ts` selects matching files only
in the source directory. A pattern starting with `!` removes a previous match.

The plugin reads subdirectories and keeps their paths in the output.
Patterns do not apply to a target that points to a single file.
Use `src` for the source path and `patterns` for file selection.

## Transforms

Transforms receive text. Files without a transform are copied as bytes, including binary files.
Async transforms are supported.

```js
copyFiles([
  {
    src: 'settings.json',
    transform: (content) => JSON.stringify(JSON.parse(content)),
  },
]);
```

## Build behavior

The plugin adds files through `generateBundle`. Rollup writes them into the output directory.
Source files and visited directories are added to the watch list.
The directory scan skips symbolic links.

A missing source, a failed transform, or duplicate output names within this plugin stops the build.
A fixed `rename` applies to every selected file, so use it only when the target selects one file.
