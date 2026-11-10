import { parse } from '@babel/parser';

/**
 * Removes comments and formats TypeScript declarations.
 * Text inside string types stays unchanged.
 *
 * @param {string} input Declaration source text.
 * @param {string} fileName Output file name.
 *
 * @returns {string} Declarations with tabs and no empty lines outside strings.
 */
function formatDeclaration(input, fileName) {
  const options = { sourceType: 'module', sourceFilename: fileName, plugins: ['typescript'] };
  const ast = parse(input, options);
  let code = '';
  let end = 0;

  for (const comment of ast.comments) {
    // TypeScript reference directives affect types and must stay in the output.
    if (comment.type === 'CommentLine' && /^\/\s*<(?:reference|amd-module|amd-dependency)\b/.test(comment.value)) {
      continue;
    }
    code += input.slice(end, comment.start);
    code += input.slice(comment.start, comment.end).replace(/[^\r\n]/g, ' ');
    end = comment.end;
  }
  code += input.slice(end);
  const { tokens } = parse(code, { ...options, tokens: true });
  let tokenIndex = 0;

  return code.replace(/^[\t ]*\r?\n|^( {2})+/gm, (match, group, index) => {
    while (tokenIndex < tokens.length && tokens[tokenIndex].end <= index) {
      tokenIndex++;
    }
    const token = tokens[tokenIndex];

    if (token && token.start < index + match.length && token.end > index) {
      return match;
    }

    return match.endsWith('\n') ? '' : '\t'.repeat(match.length / 2);
  });
}

/**
 * Formats declaration files added to the Rollup output.
 *
 * @returns {import('rollup').Plugin} Rollup plugin.
 */
export function formatTypes() {
  return {
    name: 'format-types',
    generateBundle: {
      order: 'post',
      handler(options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type === 'asset' && file.fileName.endsWith('.d.ts')) {
            const code = typeof file.source === 'string' ? file.source : Buffer.from(file.source).toString('utf8');
            file.source = formatDeclaration(code, file.fileName);
          }
        }
      },
    },
  };
}
