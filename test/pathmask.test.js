import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { PathMask } from '../src/index.js';

/**
 * Patterns, a path and the answer of git: true when `git check-ignore` reports the path.
 * A path that ends with `/` is a directory.
 * The test "git gives the same answers" checks every line with git itself.
 *
 * @type {[string[], string, boolean][]}
 */
const CASES = [
  [['README.md'], 'README.md', true],
  [['README.md'], 'docs/README.md', true],
  [['README.md'], 'README.md.bak', false],
  [['/README.md'], 'README.md', true],
  [['/README.md'], 'docs/README.md', false],
  [['data/log'], 'data/log', true],
  [['data/log'], 'app/data/log', false],
  [['*.log'], 'error.log', true],
  [['*.log'], 'data/log/error.log', true],
  [['*.log'], 'error.log.1', false],
  [['/*.sh'], 'run.sh', true],
  [['/*.sh'], 'bin/run.sh', false],
  [['*'], '.env', true],
  [['.*'], '.env', true],
  [['?.txt'], 'a.txt', true],
  [['?.txt'], 'ab.txt', false],
  [['[ab].txt'], 'b.txt', true],
  [['[!ab].txt'], 'b.txt', false],
  [['[!ab].txt'], 'c.txt', true],
  [['[^ab].txt'], 'c.txt', true],
  [['\\*.txt'], '*.txt', true],
  [['\\*.txt'], 'a.txt', false],
  [['**/tmp'], 'tmp', true],
  [['**/tmp'], 'a/b/tmp', true],
  [['a/**'], 'a/b', true],
  [['a/**'], 'a/b/c', true],
  [['a/**'], 'a/', false],
  [['a/**/b'], 'a/b', true],
  [['a/**/b'], 'a/x/y/b', true],
  [['a/**/b'], 'x/a/b', false],
  [['data/**/*.json'], 'data/x/y.json', true],
  [['data/**/*.json'], 'data/y.json', true],
  [['data/*.json'], 'data/x/y.json', false],
  [['a.b'], 'axb', false],
  [['(x)'], '(x)', true],
  [['tmp/'], 'tmp/', true],
  [['tmp/'], 'tmp', false],
  [['tmp/'], 'a/tmp/', true],
  [['tmp/'], 'tmp/x', true],
  [['data'], 'data/log/error.log', true],
  [['data'], 'app/data/x', true],
  [['data'], 'database/', false],
  [['/data'], 'app/data/', false],
  [['/data'], 'data/x', true],
  [['[abc'], '[abc', false],
  [['[abc'], 'a', false],
  [['a['], 'a[', false],
  [['foo\\'], 'foo\\', false],
  [['foo\\'], 'foo', false],
  [['[]'], '[]', false],
  [['[]a]'], 'a', true],
  [['[]a]'], ']', true],
  [['[!]a]x'], ']x', false],
  [['[!]a]x'], 'bx', true],
  [['[!]a]x'], 'ax', false],
  [['[\\]]x'], ']x', true],
  [['[\\]]x'], '\\x', false],
  [['[a-c]x'], 'bx', true],
  [['[a-c]x'], 'dx', false],
  [['[a\\-c]x'], '-x', true],
  [['[a\\-c]x'], 'bx', false],
  [['[[:digit:]]x'], '5x', true],
  [['[[:digit:]]x'], 'ax', false],
  [['[[:bogus:]]x'], 'ax', false],
  [['[[:alpha:]'], 'a', false],
  [['[[:alpha:]'], '[', false],
  [['[a\\'], 'a', false],
  [['[[:ab]x'], 'ax', true],
  [['[[:ab]x'], '[x', true],
  [['[[:ab]x'], 'cx', false],
  [['***'], 'a', true],
  [['***'], 'a/b', true],
  [['a**b'], 'axxb', true],
  [['a**b'], 'a/b', false],
  [['a/**b'], 'a/xb', true],
  [['a/**b'], 'a/x/b', false],
  [['**'], 'x/y', true],
  [['**/'], 'x/', true],
  [['**/'], 'x', false],
  [['/**'], 'x/y', true],
  [['a/**/'], 'a/b/', true],
  [['a/**/'], 'a/b', false],
  [['!'], '!', false],
  [['\\!x'], '!x', true],
  [['\\#x'], '#x', true],
  [['#x'], '#x', false],
  [[' x'], ' x', true],
  [['x '], 'x', true],
  [['x\\ '], 'x ', true],
  [['x\\ '], 'x', false],
  [['x \\ '], 'x  ', true],
  [['x\t'], 'x', false],
  [['x\t'], 'x\t', true],
  [['\\[x'], '[x', true],
  [['[[]x'], '[x', true],
  [['[a^]x'], '^x', true],
  [['[!!]x'], '!x', false],
  [['[!!]x'], 'ax', true],
  [['*/'], 'a/', true],
  [['*/'], 'a', false],
  [['a/*'], 'a/b/', true],
  [['a/*'], 'a/b/c', true],
  [['a[/]b'], 'a/b', false],
  [['a?b'], 'a/b', false],
  [['a*b'], 'a/b', false],
  [['\\a'], 'a', true],
  [['a\\/b'], 'a/b', true],
  [['*.LOG'], 'a.log', false],
  [['[A-Z]x'], 'ax', false],
  [['foo/'], 'foo', false],
  [['foo//'], 'foo/', false],
  [['/'], 'x', false],
  [['//x'], 'x', false],
  [['.'], 'x/', false],
  [['./x'], 'x', false],
  [['x/'], 'x/y/', true],
  [['!x'], 'x', false],
  [['*.log', '!keep.log'], 'keep.log', false],
  [['*.log', '!keep.log'], 'a.log', true],
  [['*.log', '!keep.log', 'keep.log'], 'keep.log', true],
  [['data/log', '!data/log/keep.log'], 'data/log/keep.log', true],
  [['data/log/*', '!data/log/keep.log'], 'data/log/keep.log', false],
  [['data/log/*', '!data/log/keep.log'], 'data/log/x.log', true],
  [['data/', '!data/'], 'data/x', false],
  [['!x', 'x'], 'x', true],
  [['x', '!x'], 'x', false],
  [['*', '!*/'], 'a/', false],
  [['*', '!*/'], 'a/b', true],
  [['*', '!*/', '!*.c'], 'a/b.c', false],
  [['.dkit', '!.dkit'], '.dkit/vault/beta.env', false],
  [['!.dkit', '.dkit'], '.dkit/vault/beta.env', true],
  [['#c', '', '  ', 'x'], 'x', true],
  [['\\!x'], '!x', true]];

describe('PathMask.matches', () => {
  test.each(CASES)('%j matches %j: %s', (patterns, file, expected) => {
    expect(new PathMask(patterns).matches(file)).toBe(expected);
  });
});

const hasGit = spawnSync('git', ['--version']).status === 0;

describe.skipIf(!hasGit)('git gives the same answers', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'pathmask-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  /** Asks git: a new repository with the patterns in .gitignore and the path as a file or a directory. */
  function gitMatches(patterns, file) {
    const dir = mkdtempSync(path.join(root, 'repo-'));
    execFileSync('git', ['init', '-q', dir]);
    writeFileSync(path.join(dir, '.gitignore'), patterns.map((pattern) => `${pattern}\n`).join(''));
    const isFolder = file.endsWith('/');
    const name = isFolder ? file.slice(0, -1) : file;

    if (isFolder) {
      mkdirSync(path.join(dir, name), { recursive: true });
    } else {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), '');
    }

    // git sets core.ignorecase on a file system without case, for example on macOS. The patterns are case sensitive.
    return spawnSync('git', ['-C', dir, '-c', 'core.ignorecase=false', 'check-ignore', '--no-index', '-q', '--', name]).status === 0;
  }

  test.each(CASES)('%j matches %j: %s', (patterns, file, expected) => {
    expect(gitMatches(patterns, file)).toBe(expected);
  });
});

describe('PathMask lines', () => {
  test('empty lines, spaces and comments are skipped', () => {
    const mask = new PathMask(['', '   ', '# *.log', 'x']);
    expect(mask.matches('a.log')).toBe(false);
    expect(mask.matches('x')).toBe(true);
  });

  test('no patterns match nothing', () => {
    expect(new PathMask([]).matches('a')).toBe(false);
  });

  test('a negation without a match above changes nothing', () => {
    expect(new PathMask(['!a']).matches('a')).toBe(false);
  });
});

describe('PathMask errors', () => {
  test.each([['*.log'], [null], [[1]], [['a', undefined]]])('patterns %j are not an array of strings', (patterns) => {
    expect(() => new PathMask(patterns)).toThrow(new TypeError('PathMask: patterns must be an array of strings'));
  });

  test.each(['', '/a', '/'])('path %j is not relative', (file) => {
    expect(() => new PathMask(['a']).matches(file)).toThrow(TypeError);
  });

  test.each(['a//b', './a', 'a/./b', 'a/..', '../a', 'a//'])('path %j is not normalized', (file) => {
    expect(() => new PathMask(['a']).matches(file)).toThrow(TypeError);
  });

  test('a path is a string', () => {
    expect(() => new PathMask(['a']).matches(1)).toThrow(TypeError);
  });
});
