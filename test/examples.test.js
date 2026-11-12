// The examples of README.md, line by line. A change of an example in README.md needs the same change here.
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { PathMask } from '../src/index.js';

describe('Quick start', () => {
  test('creates a mask from patterns and tests each path', () => {
    const mask = new PathMask([
      'src/**/*.js',
      'docs/',
      '*.md',
      '!CHANGELOG.md',
    ]);

    expect(mask.matches('src/index.js')).toBe(true);
    expect(mask.matches('src/cli/run.js')).toBe(true);
    expect(mask.matches('test/index.js')).toBe(false);

    expect(mask.matches('docs/logo.png')).toBe(true);
    expect(mask.matches('local/logo.png')).toBe(false);

    expect(mask.matches('README.md')).toBe(true);
    expect(mask.matches('test/README.md')).toBe(true);
    expect(mask.matches('CHANGELOG.md')).toBe(false);
  });
});

describe('API', () => {
  test('a mask of one pattern', () => {
    expect(new PathMask(['*.log']).matches('data/error.log')).toBe(true);
  });
});

describe('Exclude paths', () => {
  test('keeps the paths that the mask does not match', () => {
    const excluded = new PathMask(['node_modules/', '*.log', '.*']);
    const paths = ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js'];

    const files = paths.filter((file) => !excluded.matches(file));

    expect(files).toEqual(['README.md', 'src/index.js']);
  });
});

describe('Exclude files in a directory', () => {
  test('keeps the files of the directory that the mask does not match', () => {
    const tempPath = mkdtempSync(path.join(tmpdir(), 'pathmask-'));

    try {
      const rootPath = path.join(tempPath, 'my-project');

      // The same files as in the list of "Exclude paths".
      for (const file of ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js']) {
        mkdirSync(path.dirname(path.join(rootPath, file)), { recursive: true });
        writeFileSync(path.join(rootPath, file), '');
      }

      const excluded = new PathMask(['node_modules/', '*.log', '.*']);
      const entries = readdirSync(rootPath, { recursive: true });

      const files = [];

      for (const file of entries) {
        if (!statSync(path.join(rootPath, file)).isFile()) {
          continue;
        }

        if (!excluded.matches(file)) {
          files.push(file);
        }
      }

      // The order of readdir() depends on the file system.
      expect(files.sort()).toEqual(['README.md', 'src/index.js']);
    } finally {
      rmSync(tempPath, { recursive: true, force: true });
    }
  });
});

describe('Include paths', () => {
  const paths = [
    'README.md',
    'docs/guide.md',
    'package.json',
    'src/index.js',
    'src/cli/run.js',
    'test/run.test.js',
  ];

  test('keeps the paths that the mask matches', () => {
    const included = new PathMask(['src/**/*.js', '*.md']);

    const files = paths.filter((file) => included.matches(file));

    expect(files).toEqual(['README.md', 'docs/guide.md', 'src/index.js', 'src/cli/run.js']);
  });

  test('/*.md matches only the Markdown files of the root', () => {
    const included = new PathMask(['src/**/*.js', '/*.md']);

    expect(paths.filter((file) => included.matches(file))).toEqual(['README.md', 'src/index.js', 'src/cli/run.js']);
  });
});

describe('Paths', () => {
  test('a path with \\ between its path segments matches after the replace', () => {
    const mask = new PathMask(['data/*.log']);
    const file = ['data', 'error.log'].join('\\');

    expect(mask.matches(file.replaceAll('\\', '/'))).toBe(true);
  });
});

describe('Patterns', () => {
  // The table of README.md: a pattern, the paths it matches, the paths it does not match.
  const table = [
    ['a', ['a', 'c/a', 'c/d/a/'], ['ab', 'c/a.txt']],
    ['/a', ['a', 'a/'], ['c/a']],
    ['a/b', ['a/b', 'a/b/'], ['c/a/b']],
    ['a/', ['a/', 'c/a/'], ['a', 'c/a']],
    ['**/a/b', ['a/b', 'c/a/b', 'c/d/a/b'], ['a/c/b']],
    ['a/**', ['a/c', 'a/c/d'], ['a/', 'a']],
    ['a/**/b', ['a/b', 'a/c/b', 'a/c/d/b'], ['b', 'c/a/b']],
    ['*.log', ['a.log', 'c/a.log', 'c/d/a.log'], ['a.txt']],
    ['/*.log', ['a.log'], ['c/a.log']],
    ['a/*.log', ['a/b.log'], ['b.log', 'a/c/b.log']],
    ['a/**/*.log', ['a/b.log', 'a/c/b.log', 'a/c/d/b.log'], ['b.log', 'c/a/b.log']],
  ];

  test.each(table)('%s matches the paths', (pattern, matchedPaths) => {
    const mask = new PathMask([pattern]);

    for (const file of matchedPaths) {
      expect(mask.matches(file), file).toBe(true);
    }
  });

  test.each(table)('%s does not match the paths', (pattern, matchedPaths, otherPaths) => {
    const mask = new PathMask([pattern]);

    for (const file of otherPaths) {
      expect(mask.matches(file), file).toBe(false);
    }
  });

  test('a matched directory matches everything inside it', () => {
    const mask = new PathMask(['data/']);

    expect(mask.matches('data/')).toBe(true);
    expect(mask.matches('data/log/error.log')).toBe(true);
  });
});

describe('Lines', () => {
  test('a comment and an empty line match nothing', () => {
    const mask = new PathMask(['# logs', '*.log', '', 'tmp/']);

    expect(mask.matches('error.log')).toBe(true);
    expect(mask.matches('tmp/')).toBe(true);
    expect(mask.matches('# logs')).toBe(false);
  });
});

describe('Negation', () => {
  test('the last line that matches a path wins', () => {
    const mask = new PathMask(['*.log', '!keep.log']);

    expect(mask.matches('error.log')).toBe(true);
    expect(mask.matches('keep.log')).toBe(false);
  });

  test('! brings back nothing inside a matched directory', () => {
    expect(new PathMask(['data/', '!data/keep.json']).matches('data/keep.json')).toBe(true);
    expect(new PathMask(['data/*', '!data/keep.json']).matches('data/keep.json')).toBe(false);
  });

  test('! with /** excludes all paths inside a directory', () => {
    expect(new PathMask(['*.md', '!drafts/']).matches('drafts/a.md')).toBe(true);
    expect(new PathMask(['*.md', '!drafts/**']).matches('drafts/a.md')).toBe(false);
  });
});

describe('Escapes', () => {
  test('a name that starts with ! needs the \\', () => {
    expect(new PathMask(['!important']).matches('!important')).toBe(false);
    expect(new PathMask(['\\!important']).matches('!important')).toBe(true);
  });
});

describe('Errors', () => {
  test('patterns that are not an array of strings', () => {
    expect(() => new PathMask('*.log')).toThrow(new TypeError('PathMask: patterns must be an array of strings'));
  });

  test('a path that is not relative or not normalized', () => {
    const mask = new PathMask(['*.log']);

    expect(() => mask.matches('/a')).toThrow(new TypeError('PathMask: path must be a relative path, got "/a"'));
    expect(() => mask.matches('a/../b')).toThrow(
      new TypeError('PathMask: path must be a normalized path without empty path segments, . or .., got "a/../b"'),
    );
  });
});
