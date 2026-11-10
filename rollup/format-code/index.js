import { parse } from '@babel/parser';

/**
 * Replaces indentation spaces with tabs and removes empty lines.
 * Text inside JavaScript tokens stays unchanged.
 *
 * @returns {import('rollup').Plugin} Rollup plugin.
 */
export function formatCode() {
  return {
    name: 'format-code',
    renderChunk(code) {
      const { tokens } = parse(code, { sourceType: 'module', tokens: true });
      let tokenIndex = 0;
      const output = code.replace(/^[\t ]*\r?\n|^( {2})+/gm, (match, group, index) => {
        while (tokenIndex < tokens.length && tokens[tokenIndex].end <= index) {
          tokenIndex++;
        }
        const token = tokens[tokenIndex];

        if (token && token.start < index + match.length && token.end > index) {
          return match;
        }

        return match.endsWith('\n') ? '' : '\t'.repeat(match.length / 2);
      });

      return { code: output, map: null };
    },
  };
}
