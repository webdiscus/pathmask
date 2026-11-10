// @ts-check
import { PathMask } from 'pathmask';

const mask = new PathMask(Object.freeze(['*.log', '!keep.log']));

/** @type {boolean} */
const matched = mask.matches('error.log');
console.log(matched);

// @ts-expect-error Patterns must be an array.
new PathMask('*.log');

// @ts-expect-error Paths must be strings.
mask.matches(1);
