# Contributing

Thanks for your help with `pathmask`.

## Setup

```sh
git clone https://github.com/webdiscus/pathmask.git
cd pathmask
npm install
```

## Checks

| Command | Checks |
|---|---|
| `npm test` | the tests, including the answers of `git check-ignore` and the examples of the README |
| `npm run test:coverage` | the tests with the coverage of `src`, the report is in `coverage/` |
| `npm run test:types` | the types in `src/index.d.ts` |
| `npm run lint` | the code format, `npm run lint:fix` fixes what a tool can fix |

`npm run check` runs lint, tests and types in one go. A pull request passes it.

## Changes

- A change of the behavior comes with a test. The test of a pattern compares the answer with `git check-ignore`.
- A change of an example in the README comes with the same change in `test/examples.test.js`.
- A bug report has the patterns, the path and the expected answer.
