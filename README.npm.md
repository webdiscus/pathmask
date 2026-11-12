# pathmask

Match paths using [.gitignore](https://git-scm.com/docs/gitignore) syntax.

Use `pathmask` to filter files by including or excluding matching paths.

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

See [full documentation](https://github.com/webdiscus/pathmask).
