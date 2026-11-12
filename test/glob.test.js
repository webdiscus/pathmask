// The table "Glob equivalents" of README.md. A change of the table in README.md needs the same change here.
// The table "Why pathmask" of README.md. A change of the table in README.md needs the same change here.
import { describe, expect, test } from 'vitest';
import { PathMask } from '../src/index.js';

describe('Why pathmask', () => {
  // The pathmask patterns, the paths they match, the paths they do not match.
  const table = [
    [['node_modules/', '*.log'], ['node_modules/a/index.js', 'a/node_modules/b.js', 'logs/error.log'], ['src/index.js']],
    [['*.log', '!keep.log'], ['error.log', 'logs/error.log'], ['keep.log', 'logs/keep.log']],
    [['dist/'], ['dist/', 'dist/index.js', 'a/dist/index.js'], ['src/dist.js']],
    [['.*'], ['.env', 'a/.env', '.git/config'], ['env', 'a/b.env']],
  ];

  test.each(table)('%j matches the paths', (patterns, matchedPaths) => {
    const mask = new PathMask(patterns);

    for (const file of matchedPaths) {
      expect(mask.matches(file), file).toBe(true);
    }
  });

  test.each(table)('%j does not match the paths', (patterns, matchedPaths, otherPaths) => {
    const mask = new PathMask(patterns);

    for (const file of otherPaths) {
      expect(mask.matches(file), file).toBe(false);
    }
  });
});

describe('Glob equivalents', () => {
  // A glob pattern, the pathmask patterns, the paths they match, the paths they do not match.
  const table = [
    ['*.{j,t}s', ['/*.[jt]s'], ['a.js', 'a.ts'], ['a.cs', 'src/a.js']],
    ['app.log.{1..3}', ['/app.log.[1-3]'], ['app.log.1', 'app.log.3'], ['app.log.4', 'logs/app.log.1']],
    ['src/*.{js,json}', ['src/*.js', 'src/*.json'], ['src/a.js', 'src/a.json'], ['src/a.css', 'a.js']],
    ['src/*.@(ts|tsx)', ['src/*.ts', 'src/*.tsx'], ['src/a.ts', 'src/a.tsx'], ['src/a.js']],
    ['app?(.min).js', ['/app.js', '/app.min.js'], ['app.js', 'app.min.js'], ['app.x.js', 'src/app.js']],
    ['src/!(*.test).js', ['src/*.js', '!src/*.test.js'], ['src/a.js'], ['src/a.test.js']],
    ['!(vendor)/*.js', ['*/*.js', '!vendor/*.js'], ['lib/a.js'], ['vendor/a.js', 'a.js']],
    ['app.log.+([0-9])', ['/app.log.[0-9]', '/app.log.[0-9][0-9]'], ['app.log.1', 'app.log.12'], ['app.log', 'app.log.1a']],
    ['app*([0-9]).log', ['/app.log', '/app[0-9].log', '/app[0-9][0-9].log'], ['app.log', 'app1.log', 'app12.log'], ['app1a.log']],
  ];

  test.each(table)('%s matches the paths', (glob, patterns, matchedPaths) => {
    const mask = new PathMask(patterns);

    for (const file of matchedPaths) {
      expect(mask.matches(file), file).toBe(true);
    }
  });

  test.each(table)('%s does not match the paths', (glob, patterns, matchedPaths, otherPaths) => {
    const mask = new PathMask(patterns);

    for (const file of otherPaths) {
      expect(mask.matches(file), file).toBe(false);
    }
  });
});
