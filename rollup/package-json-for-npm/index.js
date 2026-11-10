import { readFile } from 'node:fs/promises';
import path from 'node:path';

const FIELDS = [
  'name',
  'version',
  'description',
  'keywords',
  'homepage',
  'repository',
  'bugs',
  'license',
  'author',
  'contributors',
  'funding',
  'private',
  'type',
  'sideEffects',
  'engines',
  'os',
  'cpu',
  'libc',
  'publishConfig',
  'main',
  'module',
  'types',
  'exports',
  'imports',
  'typesVersions',
  'bin',
  'files',
  'dependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'optionalDependencies',
  'bundleDependencies',
  'bundledDependencies',
];

/**
 * Creates an npm package manifest from the project manifest.
 * Keeps package metadata and runtime settings. Options replace the copied fields.
 *
 * @param {object} options Package fields to replace and an optional src path.
 *
 * @returns {import('rollup').Plugin} Rollup plugin.
 */
export function packageJsonForNpm({ src = 'package.json', ...options } = {}) {
  return {
    name: 'package-json-for-npm',
    async generateBundle() {
      const source = path.resolve(src);
      this.addWatchFile(source);
      const pkg = JSON.parse(await readFile(source, 'utf8'));

      if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) {
        this.error('Package manifest must be a JSON object');
      }
      const output = {};

      for (const field of FIELDS) {
        if (Object.hasOwn(pkg, field)) {
          output[field] = pkg[field];
        }
      }
      Object.assign(output, options);
      this.emitFile({
        type: 'asset',
        fileName: 'package.json',
        source: `${JSON.stringify(output, null, '\t')}\n`,
      });
    },
  };
}
