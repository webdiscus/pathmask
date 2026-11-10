import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { PathMask } from '../../src/index.js';

/**
 * Copies files into the Rollup output directory.
 * Directory targets use gitignore-style patterns relative to that directory.
 *
 * @param {object[]} targets Files or directories to copy.
 *
 * @returns {import('rollup').Plugin} Rollup plugin.
 */
export function copyFiles(targets) {
  return {
    name: 'copy-files',
    async generateBundle() {
      const used = new Set();

      for (const target of targets) {
        const source = path.resolve(target.src);
        const info = await stat(source);
        const files = [];
        const mask = new PathMask(target.patterns ?? ['**']);

        const visit = async (directory, prefix = '') => {
          this.addWatchFile(directory);

          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const relativePath = `${prefix}${entry.name}`;
            const file = path.join(directory, entry.name);

            if (entry.isDirectory()) {
              await visit(file, `${relativePath}/`);
            } else if (entry.isFile() && mask.matches(relativePath)) {
              files.push({ source: file, name: relativePath });
            }
          }
        };

        if (info.isDirectory()) {
          await visit(source);
        } else if (info.isFile()) {
          files.push({ source, name: path.basename(source) });
        } else {
          this.error(`Not a file or directory, ${target.src}`);
        }

        for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
          const fileName = target.rename ?? file.name;

          if (used.has(fileName)) {
            this.error(`Duplicate output file, ${fileName}`);
          }
          used.add(fileName);
          this.addWatchFile(file.source);
          const contents = await readFile(file.source);
          const output = target.transform ? await target.transform(contents.toString('utf8')) : contents;
          this.emitFile({ type: 'asset', fileName, source: output });
        }
      }
    },
  };
}
