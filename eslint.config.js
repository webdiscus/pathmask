import stylistic from '@stylistic/eslint-plugin';
import jsdoc from 'eslint-plugin-jsdoc';

/**
 * The code format of the repository. `npm run lint` checks it, `npm run lint:fix` fixes what a tool can fix. Lines
 * longer than 140 characters are wrapped by hand.
 */
export default [
  // The report of `npm run test:coverage`.
  { ignores: ['coverage/'] },
  {
    files: ['src/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    plugins: { '@stylistic': stylistic, jsdoc },
    rules: {
      // Layout.
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/max-len': [
        'error',
        { code: 140, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true },
      ],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      '@stylistic/linebreak-style': ['error', 'unix'],

      // Punctuation.
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/quote-props': ['error', 'as-needed'],

      // Spaces.
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/comma-spacing': 'error',
      '@stylistic/key-spacing': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      '@stylistic/arrow-spacing': 'error',

      // Blocks: the body of if, else, for and while is always a block in braces, `{` on the same line, the body on its
      // own lines.
      curly: ['error', 'all'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],

      // An empty line before return, before if and before a statement with a block (for, while, try, switch, { }).
      // The first statement of a block needs no empty line.
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'always', prev: '*', next: 'block-like' },
      ],

      // An empty line before a `//` comment, but not at the start of a block, an object, an array or a class.
      '@stylistic/lines-around-comment': [
        'error',
        { beforeLineComment: true, allowBlockStart: true, allowObjectStart: true, allowArrayStart: true, allowClassStart: true },
      ],

      // JSDoc: an empty line between the description and the first tag.
      'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],

      // JSDoc: the tags in the groups @template, @param, @returns, in this order. An empty line between two groups, for
      // example before @returns, no empty line inside a group.
      'jsdoc/sort-tags': [
        'error',
        { tagSequence: [{ tags: ['template'] }, { tags: ['param'] }, { tags: ['returns'] }], linesBetween: 1, alphabetizeExtras: false },
      ],
    },
  },
];
