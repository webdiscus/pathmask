// The examples of README.md, line by line. A change of an example in README.md needs the same change here.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { PathMask } from '../src/index.js';

describe('Quick start', () => {
  test('matches logs except keep.log, and the folder tmp with all its content', () => {
    const mask = new PathMask(['*.log', '!keep.log', 'tmp/']);

    expect(mask.matches('error.log')).toBe(true);
    expect(mask.matches('keep.log')).toBe(false);
    expect(mask.matches('tmp/')).toBe(true);
    expect(mask.matches('tmp/cache/a.json')).toBe(true);
    expect(mask.matches('src/index.js')).toBe(false);
  });
});

describe('API', () => {
  test('a mask of one pattern', () => {
    expect(new PathMask(['*.log']).matches('data/error.log')).toBe(true);
  });
});

describe('Filter a list of paths', () => {
  test('keeps the paths that the mask does not match', () => {
    const ignored = new PathMask(['node_modules/', '*.log', '.*']);
    const paths = ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js'];

    const files = paths.filter((file) => !ignored.matches(file));

    expect(files).toEqual(['README.md', 'src/index.js']);
  });
});

describe('Filter the files of a folder', () => {
  test('keeps the files of the folder that the mask does not match', async () => {
    const tempPath = mkdtempSync(path.join(tmpdir(), 'pathmask-'));

    try {
      const rootPath = path.join(tempPath, 'my-project');

      // The same files as in the list of "Filter a list of paths".
      for (const file of ['README.md', 'debug.log', '.env', 'src/index.js', 'node_modules/ansis/index.js']) {
        mkdirSync(path.dirname(path.join(rootPath, file)), { recursive: true });
        writeFileSync(path.join(rootPath, file), '');
      }

      const ignored = new PathMask(['node_modules/', '*.log', '.*']);
      const entries = await readdir(rootPath, { recursive: true, withFileTypes: true });

      const files = [];

      for (const entry of entries) {
        if (!entry.isFile()) {
          continue;
        }

        // PathMask needs a path relative to the root.
        const file = path.relative(rootPath, path.join(entry.parentPath, entry.name));

        if (!ignored.matches(file)) {
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

describe('Select files', () => {
  const paths = ['README.md', 'docs/guide.md', 'package.json', 'src/index.js', 'src/cli/run.js', 'test/run.test.js'];

  test('keeps the paths that the mask matches', () => {
    const selected = new PathMask(['src/**/*.js', '*.md']);

    const files = paths.filter((file) => selected.matches(file));

    expect(files).toEqual(['README.md', 'docs/guide.md', 'src/index.js', 'src/cli/run.js']);
  });

  test('/*.md matches only the Markdown files of the root', () => {
    const selected = new PathMask(['src/**/*.js', '/*.md']);

    expect(paths.filter((file) => selected.matches(file))).toEqual(['README.md', 'src/index.js', 'src/cli/run.js']);
  });
});

describe('Paths', () => {
  test('a path with \\ between its parts matches after the replace', () => {
    const mask = new PathMask(['data/*.log']);
    const file = ['data', 'error.log'].join('\\');

    expect(mask.matches(file.replaceAll('\\', '/'))).toBe(true);
  });
});

describe('Patterns', () => {
  test('a matched folder matches everything inside it', () => {
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

  test('! brings back nothing inside a matched folder', () => {
    expect(new PathMask(['data/', '!data/keep.json']).matches('data/keep.json')).toBe(true);
    expect(new PathMask(['data/*', '!data/keep.json']).matches('data/keep.json')).toBe(false);
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
      new TypeError('PathMask: path must be a normalized path without empty parts, . or .., got "a/../b"'),
    );
  });
});
