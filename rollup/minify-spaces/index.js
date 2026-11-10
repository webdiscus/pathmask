import { minify } from 'terser';

/**
 * Removes extra spaces and comments from JavaScript output using Terser.
 *
 * @returns {import('rollup').Plugin} Rollup plugin.
 */
export function minifySpaces() {
  return {
    name: 'minify-spaces',
    async renderChunk(code) {
      const result = await minify(code, {
        ecma: 2022,
        module: true,
        compress: false,
        mangle: false,
        format: { comments: false, beautify: false },
      });

      return { code: `${result.code}\n`, map: null };
    },
  };
}
