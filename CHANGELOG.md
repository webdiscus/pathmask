# Changelog

## 0.1.0 (2026-11-05)

- feat: `PathMask` matches relative paths against patterns in the syntax of `.gitignore`
- feat: a folder path ends with `/`, a matched folder matches everything inside it
- feat: lines as in `.gitignore`: empty lines, comments with `#`, spaces at the end, escapes with `\`
- feat: negation with `!`, the last matching line wins
- feat: `*`, `?`, `**`, sets like `[a-z]` and `[!a-z]`, classes like `[[:digit:]]`
- feat: `TypeError` for patterns that are not an array of strings and for paths that are not relative and normalized
