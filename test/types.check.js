// @ts-check
// Checked by `npm run test:types`, never run. Each `@ts-expect-error` line must be an error of the types.
import { PathMask } from '../src/index.js';

const mask = new PathMask(['*.log', '!keep.log']);

/** @type {boolean} */
const matched = mask.matches('data/error.log');
console.log(matched);

new PathMask(Object.freeze(['data/']));

// @ts-expect-error The patterns are an array.
new PathMask('*.log');

// @ts-expect-error A path is a string.
mask.matches(1);
