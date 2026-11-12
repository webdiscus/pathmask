# pathmask

[![npm](https://img.shields.io/npm/v/pathmask?logo=npm&color=brightgreen "npm package")](https://www.npmjs.com/package/pathmask "download npm package")
[![Test](https://github.com/webdiscus/pathmask/actions/workflows/test.yml/badge.svg)](https://github.com/webdiscus/pathmask/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/webdiscus/pathmask/branch/master/graph/badge.svg)](https://codecov.io/gh/webdiscus/pathmask)
[![downloads](https://img.shields.io/npm/dm/pathmask)](https://www.npmjs.com/package/pathmask)
[![install size](https://packagephobia.com/badge?p=pathmask)](https://packagephobia.com/result?p=pathmask)

Match paths using [.gitignore](https://git-scm.com/docs/gitignore) syntax.

Use `pathmask` to filter files by including or excluding matching paths.

## Install

```sh
npm install pathmask
```

Requires Node.js 20 or newer. ESM only.

## Quick start

Create a mask from patterns and test each path with `matches()`.

```js
import { PathMask } from 'pathmask';

const mask = new PathMask([
  'src/**/*.js',
  'docs/',
  '*.md',
  '!CHANGELOG.md',
]);

mask.matches('src/index.js'); // true
mask.matches('src/cli/run.js'); // true
mask.matches('test/index.js'); // false

mask.matches('docs/logo.png'); // true
mask.matches('local/logo.png'); // false

mask.matches('README.md'); // true
mask.matches('test/README.md'); // true
mask.matches('CHANGELOG.md'); // false
```

## Why pathmask

Tools often get a list of paths from a config and need to filter it, for example to choose which files to build, lint or deploy.
The `.gitignore` syntax is the format every developer already knows for such rules.
It is based on the basic POSIX glob syntax with `*`, `?` and `[...]`, and adds a few simple rules for lists of paths.
`pathmask` tests a given path against these rules and follows the behavior of git, so a pattern means the same here and in `.gitignore`.

- Short rules: a pattern without `/` matches at any depth, `dist/` matches a directory with all its contents.
- Exceptions: patterns are applied in order, `!` brings a path back.
- Dotfiles: `*` matches names that start with `.`, no options needed.
- One reference: git defines the behavior, there are no library-specific options.

For common rules, the `.gitignore` syntax is shorter and easier to read than glob.

| glob | pathmask |
|---|---|
| `['**/node_modules/**', '**/*.log']` | `['node_modules/', '*.log']` |
| `['**/*.log', '!**/keep.log']` | `['*.log', '!keep.log']` |
| `['**/dist', '**/dist/**']` | `['dist/']` |
| `['**/.*']` with the option `{ dot: true }` | `['.*']` |

To write glob patterns with `{a,b}` and extglob in pathmask, see [Glob equivalents](#glob-equivalents).

## Contents

- [API](#api)
- [Usage examples](#usage-examples)
- [Paths](#paths)
- [Patterns](#patterns)
- [Negation](#negation)
- [Escaping](#escaping)
- [Glob equivalents](#glob-equivalents)
- [Errors](#errors)
- [TypeScript](#typescript)

## API

### new PathMask(patterns)

Creates a path matcher from an array of patterns in `.gitignore` syntax.

| Parameter | Type | Description |
|---|---|---|
| `patterns` | `string[]` | Patterns in `.gitignore` syntax, see [Patterns](#patterns). |

Throws a `TypeError` when `patterns` is not an array of strings, see [Errors](#errors).

### mask.matches(path)

Tests a relative path against the patterns.

| Parameter | Type | Description |
|---|---|---|
| `path` | `string` | A path relative to the root, see [Paths](#paths). |

Returns `true` if the mask matches the path or a directory that contains it. Otherwise, returns `false`.

Throws a `TypeError` when the path is invalid, see [Errors](#errors).

## Usage examples

### Exclude paths

Keep the paths that the mask does not match. Create the mask once and reuse it for all paths.

```js
const excluded = new PathMask(['node_modules/', '*.log', '.*']);
const paths = ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js'];

const files = paths.filter((file) => !excluded.matches(file));
// ['README.md', 'src/index.js']
```

### Exclude files in a directory

Read the files of `my-project` and keep the files that the mask does not match.

```js
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { PathMask } from 'pathmask';

const rootPath = './my-project';
const excluded = new PathMask(['node_modules/', '*.log', '.*']);
const entries = readdirSync(rootPath, { recursive: true });

const files = [];
for (const file of entries) {
  if (!statSync(path.join(rootPath, file)).isFile()) continue;

  if (!excluded.matches(file)) {
    files.push(file);
  }
}
// ['README.md', 'src/index.js']
```

### Include paths

Keep the paths that the mask matches. This mask matches JavaScript files in `src` and Markdown files in any directory.

```js
const included = new PathMask(['src/**/*.js', '*.md']);
const paths = [
  'README.md',
  'docs/guide.md',
  'package.json',
  'src/index.js',
  'src/cli/run.js',
  'test/run.test.js',
];

const files = paths.filter((file) => included.matches(file));
// ['README.md', 'docs/guide.md', 'src/index.js', 'src/cli/run.js']
```

Use `/*.md` to match Markdown files only in the root. This pattern matches `README.md` and does not match `docs/guide.md`.

## Paths

Paths are relative to a root chosen by the caller. The root is not passed to `PathMask`.
Use `/` between path segments. A path that ends with `/` is a directory. Any other path is a file.

| Path | Description |
|---|---|
| `README.md` | a file in the root |
| `data/error.log` | a file in the directory `data` |
| `data/` | the directory `data` |
| `data/log/` | the directory `log` in the directory `data` |

A pattern that ends with `/` matches only directories.
Pass a directory as `data/` to match it with the pattern `data/`.

A path must not start with `/` or contain empty path segments, `.` or `..`. Use `path.relative()` to get a relative path
and normalize its separators to `/`. In a path, a backslash is a normal character.

On Windows, `path.relative()` uses backslashes as separators. Convert them to `/` before calling `matches()`.

```js
mask.matches(file.replaceAll(path.sep, '/'));
```

## Patterns

Patterns use `.gitignore` syntax.

| Wildcard | Matches |
|---|---|
| `*` | zero or more characters except `/`, including leading dots |
| `?` | one character except `/` |
| `[abc]`, `[a-z]` | one of the characters |
| `[!abc]`, `[^abc]` | one character that is not in the set |
| `[[:digit:]]` | one digit |

Supported character classes: `alnum`, `alpha`, `blank`, `cntrl`, `digit`, `graph`, `lower`, `print`, `punct`, `space`, `upper`, `xdigit`.

| Pattern | Matches the paths | Does not match the paths |
|---|---|---|
| `a` | `a`, `c/a`, `c/d/a/` | `ab`, `c/a.txt` |
| `/a` | `a`, `a/` | `c/a` |
| `a/b` | `a/b`, `a/b/` | `c/a/b` |
| `a/` | `a/`, `c/a/` | `a`, `c/a` |
| `**/a/b` | `a/b`, `c/a/b`, `c/d/a/b` | `a/c/b` |
| `a/**` | `a/c`, `a/c/d` | `a/`, `a` |
| `a/**/b` | `a/b`, `a/c/b`, `a/c/d/b` | `b`, `c/a/b` |
| `*.log` | `a.log`, `c/a.log`, `c/d/a.log` | `a.txt` |
| `/*.log` | `a.log` | `c/a.log` |
| `a/*.log` | `a/b.log` | `b.log`, `a/c/b.log` |
| `a/**/*.log` | `a/b.log`, `a/c/b.log`, `a/c/d/b.log` | `b.log`, `c/a/b.log` |

A `/` at the start or inside a pattern anchors it to the root, as in `/a` and `a/b`.
A pattern without such a `/` matches at any depth, as in `a` and `a/`.
Paths passed to `matches()` never start with `/`, see [Paths](#paths).

A matched directory also matches all paths within it.

```js
const mask = new PathMask(['data/']);

mask.matches('data/'); // true
mask.matches('data/log/error.log'); // true
```

Matching is case-sensitive.

Patterns with an unclosed character class, an unknown character class such as `[[:name:]]`, or a trailing backslash never match.
The constructor does not throw on them.

### Pattern syntax

Empty strings, strings that start with `#`, and a single `!` are ignored.
Spaces at the end of a pattern are removed. To keep a space at the end, escape it with `\`, see [Escaping](#escaping).

```js
const mask = new PathMask(['# logs', '*.log', '', 'tmp/']);
```

## Negation

Patterns are applied in array order. The last matching pattern determines the result for a path.
A pattern prefixed with `!` negates a previous match.

```js
const mask = new PathMask(['*.log', '!keep.log']);

mask.matches('error.log'); // true
mask.matches('keep.log'); // false
```

Negation cannot override a matched parent directory.
To allow exceptions within a directory, match its contents, for example `data/*`.

```js
new PathMask(['data/', '!data/keep.json']).matches('data/keep.json'); // true
new PathMask(['data/*', '!data/keep.json']).matches('data/keep.json'); // false
```

To exclude all paths inside a directory, negate its contents with `/**`, for example `!drafts/**`.

```js
new PathMask(['*.md', '!drafts/']).matches('drafts/a.md'); // true
new PathMask(['*.md', '!drafts/**']).matches('drafts/a.md'); // false
```

A negated pattern has no effect without a previous match.

## Escaping

A backslash escapes the next character, so the character is matched literally.
The table shows patterns as plain text. In a JavaScript string, write `\\` for one backslash.

| Pattern | Matches |
|---|---|
| `\!important` | the name `!important` |
| `\#notes` | the name `#notes` |
| `\*.txt` | the name `*.txt` |
| `name\ ` | the name `name ` with a space at the end |

Escape a leading `!` or `#` to match it literally. Without escaping, a leading `!` starts a negation and a leading `#` starts a comment.

```js
new PathMask(['!important']).matches('!important'); // false
new PathMask(['\\!important']).matches('!important'); // true
```

## Glob equivalents

Brace expansion and extglob patterns of glob can be written as a list of patterns, a character set or a negation.
A glob pattern always starts at the root, so a pattern without `/` gets a leading `/` to match the same paths.

| glob | pathmask |
|---|---|
| `*.{j,t}s` | `['/*.[jt]s']` |
| `app.log.{1..3}` | `['/app.log.[1-3]']` |
| `src/*.{js,json}` | `['src/*.js', 'src/*.json']` |
| `src/*.@(ts\|tsx)` | `['src/*.ts', 'src/*.tsx']` |
| `app?(.min).js` | `['/app.js', '/app.min.js']` |
| `src/!(*.test).js` | `['src/*.js', '!src/*.test.js']` |
| `!(vendor)/*.js` | `['*/*.js', '!vendor/*.js']` |
| `app.log.+([0-9])` | `['/app.log.[0-9]', '/app.log.[0-9][0-9]']`, up to two digits |
| `app*([0-9]).log` | `['/app.log', '/app[0-9].log', '/app[0-9][0-9].log']`, up to two digits |

## Errors

`new PathMask(patterns)` throws a `TypeError` when `patterns` is not an array of strings.

```text
PathMask: patterns must be an array of strings
```

`mask.matches(path)` throws a `TypeError` when the path is not a string, is empty, starts with `/`,
or contains an empty path segment, `.` or `..`.

```text
PathMask: path must be a relative path, got "/a"
PathMask: path must be a normalized path without empty path segments, . or .., got "a/../b"
```

## TypeScript

TypeScript declarations are included in the package.

```ts
import { PathMask } from 'pathmask';

const mask: PathMask = new PathMask(['*.log']);
const matched: boolean = mask.matches('error.log');
```
