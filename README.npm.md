# pathmask

Match relative paths using [.gitignore](https://git-scm.com/docs/gitignore) pattern syntax.

Use `pathmask` to filter file lists by including or excluding matching paths.

## Install

```sh
npm install pathmask
```

Requires Node.js 20 or later. ESM only. TypeScript types are included.

## Match paths

```js
import { PathMask } from 'pathmask';

const mask = new PathMask(['*.log', '!keep.log', 'tmp/']);

mask.matches('error.log'); // true
mask.matches('keep.log'); // false
mask.matches('tmp/cache/a.json'); // true
mask.matches('src/index.js'); // false
```

## Filter files

```js
import { PathMask } from 'pathmask';

const ignored = new PathMask(['node_modules/', '*.log']);
const paths = ['README.md', 'debug.log', 'src/index.js', 'node_modules/ansis/index.js'];

const files = paths.filter((file) => !ignored.matches(file));
// ['README.md', 'src/index.js']
```

Paths must be relative and use `/` separators. Directory paths must end with `/`.
Patterns are case-sensitive.

See [full documentation](https://github.com/webdiscus/pathmask).
