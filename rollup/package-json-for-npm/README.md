# packageJsonForNpm

A Rollup plugin for creating an npm package manifest.

- Reads the project `package.json`, including the current name and version.
- Copies package metadata, runtime settings, and publication settings.
- Keeps runtime, peer, and optional dependencies.
- Leaves out source scripts, devDependencies, and other fields outside the supported list.
- Applies field values set in the plugin options.
- Adds the generated `package.json` to the output directory.

## Usage

```js
import { packageJsonForNpm } from './rollup/package-json-for-npm/index.js';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [
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
  ],
};
```

## Options

| Option | Description |
|---|---|
| `src` | Source manifest path. Defaults to `package.json` in the working directory. This option is not copied to the output. |
| Other fields | Values added to the output manifest or used to replace copied fields. |

Options replace whole field values. For example, `exports` replaces the source `exports` object.
Paths are copied as given. Set output paths explicitly when the package layout changes.

## Copied fields

Only the following source fields are copied when present.

| Group | Fields |
|---|---|
| Package metadata | `name`, `version`, `description`, `keywords`, `homepage`, `repository`, `bugs`, `license`, `author`, `contributors`, `funding` |
| Runtime and publication | `private`, `type`, `sideEffects`, `engines`, `os`, `cpu`, `libc`, `publishConfig` |
| Package files | `main`, `module`, `types`, `exports`, `imports`, `typesVersions`, `bin`, `files` |
| Dependencies | `dependencies`, `peerDependencies`, `peerDependenciesMeta`, `optionalDependencies`, `bundleDependencies`, `bundledDependencies` |

Source `scripts`, `devDependencies`, and other fields outside this list are not copied.
Options can explicitly add fields outside the list.

## Build behavior

The plugin reads the source manifest during each `generateBundle` call and adds it to the watch list.
It emits `package.json` with tab indentation and a final newline.

A missing source, invalid JSON, or a source value that is not an object stops the build.
