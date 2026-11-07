# pathmask

[![npm](https://img.shields.io/npm/v/pathmask?logo=npm&color=brightgreen "npm package")](https://www.npmjs.com/package/pathmask "download npm package")
[![Test](https://github.com/webdiscus/pathmask/actions/workflows/test.yml/badge.svg)](https://github.com/webdiscus/pathmask/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/webdiscus/pathmask/branch/master/graph/badge.svg)](https://codecov.io/gh/webdiscus/pathmask)
[![downloads](https://img.shields.io/npm/dm/pathmask)](https://www.npmjs.com/package/pathmask)
[![install size](https://packagephobia.com/badge?p=pathmask)](https://packagephobia.com/result?p=pathmask)

Match relative paths against patterns in the syntax of [.gitignore](https://git-scm.com/docs/gitignore).

`pathmask` checks paths as text and never reads the file system. Use it to filter a list of files the way git does.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [API](#api)
- [Paths](#paths)
- [Patterns](#patterns)
- [Lines](#lines)
- [Negation](#negation)
- [Escapes](#escapes)
- [Errors](#errors)
- [Types](#types)

## Install

```sh
npm install pathmask
```

Node.js 22 or newer.

## Quick start

The mask matches logs except `keep.log`, and the folder `tmp` with all its content:

```js
import { PathMask } from 'pathmask';

const mask = new PathMask(['*.log', '!keep.log', 'tmp/']);

mask.matches('error.log'); // true
mask.matches('keep.log'); // false
mask.matches('tmp/'); // true
mask.matches('tmp/cache/a.json'); // true
mask.matches('src/index.js'); // false
```

## API

### new PathMask(patterns)

Creates a mask from the lines of a `.gitignore` file.

| Parameter | Type | Description |
|---|---|---|
| `patterns` | `string[]` | The lines of the mask, see [Patterns](#patterns) and [Lines](#lines). |

Throws a `TypeError` when `patterns` is not an array of strings.

### mask.matches(path)

Checks one path.

| Parameter | Type | Description |
|---|---|---|
| `path` | `string` | A path relative to the root of the mask, see [Paths](#paths). |

Returns `true` when the mask matches the path or a folder that contains it.

Throws a `TypeError` when the path is empty, starts with `/`, or has an empty part, `.` or `..`.

### Filter a list of paths

The constructor reads the patterns, `matches()` only checks the path. Create one mask and use it for all paths:

```js
const ignored = new PathMask(['node_modules/', '*.log', '.*']);
const paths = ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js'];

const files = paths.filter((file) => !ignored.matches(file));
// ['README.md', 'src/index.js']
```

### Filter the files of a folder

This example reads all files of the folder `my-project` and its subfolders, then keeps the files that the mask
does not match. The folder has the same files as the list above.

```js
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PathMask } from 'pathmask';

const rootPath = './my-project';
const ignored = new PathMask(['node_modules/', '*.log', '.*']);
const entries = await readdir(rootPath, { recursive: true, withFileTypes: true });

const files = [];
for (const entry of entries) {
  if (!entry.isFile()) continue;

  // PathMask needs a path relative to the root.
  const file = path.relative(rootPath, path.join(entry.parentPath, entry.name));

  if (!ignored.matches(file)) {
    files.push(file);
  }
}
// ['README.md', 'src/index.js']
```

### Select files

A mask can also pick the files to keep. Here the mask matches the JavaScript files of `src` and all Markdown files:

```js
const selected = new PathMask(['src/**/*.js', '*.md']);
const paths = ['README.md', 'docs/guide.md', 'package.json', 'src/index.js', 'src/cli/run.js', 'test/run.test.js'];

const files = paths.filter((file) => selected.matches(file));
// ['README.md', 'docs/guide.md', 'src/index.js', 'src/cli/run.js']
```

With `/*.md` only the Markdown files of the root are matched: `README.md`, without `docs/guide.md`.

## Paths

A path is relative to the root of the mask, with `/` between its parts. A folder ends with `/`.

| Path | Is |
|---|---|
| `README.md` | a file in the root |
| `data/error.log` | a file in the folder `data` |
| `data/` | the folder `data` |
| `data/log/` | the folder `log` in the folder `data` |

A path never starts with `/` and has no empty parts, no `.` and no `..`. Make a path relative with `path.relative()`
and use `/` between its parts. A `\` is a character of a name.

On Windows `path.relative()` gives `\` between the parts. Replace it with `/` before `matches()`:

```js
mask.matches(file.replaceAll(path.sep, '/'));
```

## Patterns

The patterns follow the rules of `.gitignore`.

| Pattern | Matches |
|---|---|
| `name` | every file or folder with this name, in any folder |
| `/name` | only `name` in the root |
| `a/b` | only this path from the root, a `/` at the start or inside anchors the pattern |
| `name/` | only folders |
| `*` | any characters except `/`, also a name that starts with a dot |
| `?` | one character except `/` |
| `[abc]`, `[a-z]` | one of the characters |
| `[!abc]`, `[^abc]` | one character that is not in the set |
| `[[:digit:]]` | one character of a class: `alnum`, `alpha`, `blank`, `cntrl`, `digit`, `graph`, `lower`, `print`, `punct`, `space`, `upper`, `xdigit` |
| `**/name` | `name` in any folder, also in the root |
| `a/**` | everything inside `a` |
| `a/**/b` | `b` in `a` or in any folder inside `a` |

A matched folder matches everything inside it:

```js
const mask = new PathMask(['data/']);

mask.matches('data/'); // true
mask.matches('data/log/error.log'); // true
```

Names are case sensitive.

A pattern with an open `[`, an unknown class like `[[:name:]]` or a `\` at the end never matches.

## Lines

The lines are read as in a `.gitignore` file:

- An empty line matches nothing.
- A line that starts with `#` is a comment.
- Spaces at the end of a line are removed, so a space typed by mistake changes nothing. A name that really ends with a
  space needs `\ ` at the end, for example `notes\ ` for the name `notes `.

```js
const mask = new PathMask(['# logs', '*.log', '', 'tmp/']);
```

## Negation

A line that starts with `!` brings back a path that a line above matched. The last line that matches a path wins.

```js
const mask = new PathMask(['*.log', '!keep.log']);

mask.matches('error.log'); // true
mask.matches('keep.log'); // false
```

`!` brings back nothing inside a matched folder. To bring back one file of a folder, match the content of the folder:

```js
new PathMask(['data/', '!data/keep.json']).matches('data/keep.json'); // true
new PathMask(['data/*', '!data/keep.json']).matches('data/keep.json'); // false
```

A `!` line without a match above it changes nothing. A mask of only `!` lines matches nothing.

## Escapes

A `\` before a character makes it a plain character.

| Pattern | Matches |
|---|---|
| `\!important` | the name `!important` |
| `\#notes` | the name `#notes` |
| `\*.txt` | the name `*.txt` |
| `name\ ` | the name `name ` with a space at the end |

A name that starts with `!` or `#` needs the `\`. Without it, the line is a negation or a comment:

```js
new PathMask(['!important']).matches('!important'); // false
new PathMask(['\\!important']).matches('!important'); // true
```

In a JavaScript string a `\` is written as `\\`.

## Errors

`new PathMask(patterns)` throws a `TypeError` when `patterns` is not an array of strings:

```text
PathMask: patterns must be an array of strings
```

`mask.matches(path)` throws a `TypeError` when the path is empty, starts with `/`, or has an empty part, `.` or `..`:

```text
PathMask: path must be a relative path, got "/a"
PathMask: path must be a normalized path without empty parts, . or .., got "a/../b"
```

## Types

The package has types in `src/index.d.ts`.

```ts
import { PathMask } from 'pathmask';

const mask: PathMask = new PathMask(['*.log']);
const matched: boolean = mask.matches('error.log');
```
