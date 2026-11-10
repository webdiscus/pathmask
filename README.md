# pathmask

[![npm](https://img.shields.io/npm/v/pathmask?logo=npm&color=brightgreen "npm package")](https://www.npmjs.com/package/pathmask "download npm package")
[![Test](https://github.com/webdiscus/pathmask/actions/workflows/test.yml/badge.svg)](https://github.com/webdiscus/pathmask/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/webdiscus/pathmask/branch/master/graph/badge.svg)](https://codecov.io/gh/webdiscus/pathmask)
[![downloads](https://img.shields.io/npm/dm/pathmask)](https://www.npmjs.com/package/pathmask)
[![install size](https://packagephobia.com/badge?p=pathmask)](https://packagephobia.com/result?p=pathmask)

Match relative paths using [.gitignore](https://git-scm.com/docs/gitignore) pattern syntax.

Use `pathmask` to filter file lists by including or excluding matching paths.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [API](#api)
- [Usage examples](#usage-examples)
- [Paths](#paths)
- [Patterns](#patterns)
- [Negation](#negation)
- [Escaping](#escaping)
- [Errors](#errors)
- [TypeScript](#typescript)

## Install

```sh
npm install pathmask
```

Required Node.js 22 or newer.

## Quick start

This mask matches `.log` files except `keep.log`, and the `tmp` directory and all its contents.

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

Creates a path matcher from an array of gitignore-style patterns.

| Parameter | Type | Description |
|---|---|---|
| `patterns` | `string[]` | Patterns in gitignore syntax. See [Patterns](#patterns). |

Throws a `TypeError` when `patterns` is not an array of strings.

### mask.matches(path)

Tests a relative path against the configured patterns.

| Parameter | Type | Description |
|---|---|---|
| `path` | `string` | A path relative to the root of the mask, see [Paths](#paths). |

Returns `true` if the path matches the mask. Otherwise, returns `false`.

Throws a `TypeError` when the path is empty, starts with `/`, or contains an empty segment, `.` or `..`.

## Usage examples

### Filter a list of paths

Reuse the same instance to test multiple paths.

```js
const ignored = new PathMask(['node_modules/', '*.log', '.*']);
const paths = ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js'];

const files = paths.filter((file) => !ignored.matches(file));
// ['README.md', 'src/index.js']
```

### Filter files in a directory

Read files recursively from `my-project` and its subfolders, then keeps the files that the mask does not match.

```js
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PathMask } from 'pathmask';

const myPath = './my-project';
const ignored = new PathMask(['node_modules/', '*.log', '.*']);
const entries = await readdir(rootPath, { recursive: true, withFileTypes: true });

const files = [];
for (const entry of entries) {
  if (!entry.isFile()) continue;

  const file = path.relative(myPath, path.join(entry.parentPath, entry.name));

  if (!ignored.matches(file)) {
    files.push(file);
  }
}
// ['README.md', 'src/index.js']
```

### Select files

Retain paths that match the mask. This mask selects JavaScript files in `src` and Markdown files at any subfolder.

```js
const selected = new PathMask(['src/**/*.js', '*.md']);
const paths = ['README.md', 'docs/guide.md', 'package.json', 'src/index.js', 'src/cli/run.js', 'test/run.test.js'];

const files = paths.filter((file) => selected.matches(file));
// ['README.md', 'docs/guide.md', 'src/index.js', 'src/cli/run.js']
```

Use `/*.md` to match Markdown files only in the root. This pattern matches `README.md` and does not match `docs/guide.md`.

## Paths

Paths are relative to a root chosen by the caller. The root is not passed to `PathMask`.
Use `/` between path segments and a trailing `/` to identify a directory.

| Path | Description |
|---|---|
| `README.md` | a file in the root |
| `data/error.log` | a file in the directory `data` |
| `data/` | the directory `data` |
| `data/log/` | the directory `log` in the directory `data` |

Paths must not start with `/` or contain empty segments, `.` or `..`. Use `path.relative()` to obtain a relative path
and normalize its separators to `/`. A backslash is treated as a literal character in a name.

On Windows, `path.relative()` uses backslashes as separators. Convert them to `/` before calling `matches()`.

```js
mask.matches(file.replaceAll(path.sep, '/'));
```

## Patterns

Patterns use gitignore syntax.

| Pattern | Matches |
|---|---|
| `name` | every file or directory with this name, in any directory |
| `/name` | only `name` in the root |
| `a/b` | only this path from the root, a `/` at the start or inside anchors the pattern |
| `name/` | directories named `name` at any depth |
| `*` | zero or more characters except `/`, including leading dots |
| `?` | one character except `/` |
| `[abc]`, `[a-z]` | one of the characters |
| `[!abc]`, `[^abc]` | one character that is not in the set |
| `[[:digit:]]` | one digit |
| `**/name` | `name` in any directory, also in the root |
| `a/**` | everything inside `a` |
| `a/**/b` | `b` in `a` or in any directory inside `a` |

Supported character classes are `alnum`, `alpha`, `blank`, `cntrl`, `digit`, `graph`, `lower`, `print`, `punct`,
`space`, `upper`, and `xdigit`.

A matched directory also matches all paths within it.

```js
const mask = new PathMask(['data/']);

mask.matches('data/'); // true
mask.matches('data/log/error.log'); // true
```

Matching is case-sensitive.

Patterns with an unclosed character class, an unknown character class such as `[[:name:]]`, or a trailing backslash never match.

### Pattern syntax

Empty strings and strings beginning with `#` are ignored. 
Trailing spaces are removed unless escaped with `\`.
To match a name ending with a space, escape the trailing space, for example `notes\ ` matches the name `notes `.

```js
const mask = new PathMask(['# logs', '*.log', '', 'tmp/']);
```

## Negation

A pattern prefixed with `!` negates a previous match. Patterns are evaluated in array order.
The last matching pattern determines the result for an entry.

```js
const mask = new PathMask(['*.log', '!keep.log']);

mask.matches('error.log'); // true
mask.matches('keep.log'); // false
```

Negation cannot override a matched parent directory. 
To allow exceptions within a directory, match its contents instead of the directory itself.

```js
new PathMask(['data/', '!data/keep.json']).matches('data/keep.json'); // true
new PathMask(['data/*', '!data/keep.json']).matches('data/keep.json'); // false
```

A negated pattern has no effect without a previous match. A mask containing only negated patterns matches nothing.

## Escaping

A backslash escapes the next character, causing it to be treated literally.

| Pattern | Matches |
|---|---|
| `\!important` | the name `!important` |
| `\#notes` | the name `#notes` |
| `\*.txt` | the name `*.txt` |
| `name\ ` | the name `name ` with a space at the end |

Escape a leading `!` or `#` to match it literally. Without escaping, a leading `!` indicates negation and a leading `#` indicates a comment.

```js
new PathMask(['!important']).matches('!important'); // false
new PathMask(['\\!important']).matches('!important'); // true
```

In a JavaScript string, write `\\` to represent a single backslash.

## Errors

`new PathMask(patterns)` throws a `TypeError` when `patterns` is not an array of strings.

```text
PathMask: patterns must be an array of strings
```

`mask.matches(path)` throws a `TypeError` when the path is empty, starts with `/`, or contains an empty segment, `.` or `..`.

```text
PathMask: path must be a relative path, got "/a"
PathMask: path must be a normalized path without empty parts, . or .., got "a/../b"
```

## TypeScript

TypeScript declarations are included in the package.

```ts
import { PathMask } from 'pathmask';

const mask: PathMask = new PathMask(['*.log']);
const matched: boolean = mask.matches('error.log');
```
