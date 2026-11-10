# Changelog

## 0.1.1 (2026-11-10)

- chore(build): reduce npm package size.
- chore(build): build an ESM package with readable JavaScript and tab indentation.
- chore(build): remove comments and empty lines from JavaScript and type declarations.
- chore(build): generate a minimal package manifest and a shorter npm README.
- refactor(build): replace rollup-plugin-copy with local Rollup plugins.
- test(build): separate build plugin tests from library tests.

## 0.1.0 (2026-11-05)

- feat: `PathMask` matches relative paths against patterns in the syntax of `.gitignore`
- feat: a folder path ends with `/`, a matched folder matches everything inside it
- feat: lines as in `.gitignore`: empty lines, comments with `#`, spaces at the end, escapes with `\`
- feat: negation with `!`, the last matching line wins
- feat: `*`, `?`, `**`, sets like `[a-z]` and `[!a-z]`, classes like `[[:digit:]]`
- feat: `TypeError` for patterns that are not an array of strings and for paths that are not relative and normalized
