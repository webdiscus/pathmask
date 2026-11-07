/**
 * A set of patterns in the syntax of `.gitignore`, for relative paths with `/` between the parts.
 *
 * - Lines are read as in a `.gitignore` file: empty lines and lines that start with `#` are skipped,
 *   spaces at the end are removed unless escaped with `\`.
 * - `!pattern` brings back a path that a pattern above matched. The last pattern that matches a path wins.
 * - A matched folder matches everything inside it. `!` can not bring back a path inside a matched folder.
 */
export class PathMask {
  /** @type {Rule[]} */
  #rules;

  /**
   * @param {string[]} patterns The lines of the mask, for example `['*.log', '!keep.log']`.
   *
   * @throws {TypeError} When `patterns` is not an array of strings.
   */
  constructor(patterns) {
    if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== 'string')) {
      throw new TypeError('PathMask: patterns must be an array of strings');
    }
    this.#rules = patterns.map(parseLine).filter((rule) => rule !== null);
  }

  /**
   * True when the mask matches the path or a folder that contains it.
   *
   * @param {string} path Relative path with `/` between the parts. A folder ends with `/`, for example `data/log/`.
   *
   * @returns {boolean}
   *
   * @throws {TypeError} When the path is empty, starts with `/`, or has an empty part, `.` or `..`.
   */
  matches(path) {
    assertPath(path);
    const isFolder = path.endsWith('/');
    const parts = (isFolder ? path.slice(0, -1) : path).split('/');

    for (let count = 1; count < parts.length; count++) {
      if (this.#matchesEntry(parts.slice(0, count).join('/'), true)) {
        return true;
      }
    }

    return this.#matchesEntry(parts.join('/'), isFolder);
  }

  /**
   * Checks one entry, a file or a folder, without its parent folders.
   * Every rule is tried in order, the last rule that matches the entry decides: a rule with `!` brings the entry back.
   *
   * @param {string} path Path of the entry without `/` at the end.
   * @param {boolean} isFolder True when the entry is a folder.
   *
   * @returns {boolean} True when the last matching rule is not negated, false when no rule matches.
   */
  #matchesEntry(path, isFolder) {
    let matched = false;

    for (const rule of this.#rules) {
      if (matchesRule(rule, path, isFolder)) {
        matched = !rule.negated;
      }
    }

    return matched;
  }
}

/**
 * @typedef {object} Rule
 * @property {boolean} negated The line starts with `!`.
 * @property {boolean} folderOnly The pattern ends with `/`.
 * @property {boolean} anchored The pattern has a `/` at the start or inside: it matches the whole path from the root.
 * @property {RegExp | null} regexp Null for a pattern that never matches, for example one with an open `[`.
 */

/**
 * Reads one line of the mask, as git reads a line of `.gitignore`.
 *
 * @param {string} line
 *
 * @returns {Rule | null} Null for an empty line and a comment.
 */
function parseLine(line) {
  let body = trimTrailingSpaces(line);

  if (body === '' || body.startsWith('#')) {
    return null;
  }

  const negated = body.startsWith('!');

  if (negated) {
    body = body.slice(1);
  }

  if (body === '') {
    return null;
  }

  const folderOnly = body.endsWith('/') && !isEscaped(body, body.length - 1);

  if (folderOnly) {
    body = body.slice(0, -1);
  }

  // A slash at the start or inside anchors the pattern at the root, else it matches the last part of a path.
  const anchored = body.includes('/');

  if (body.startsWith('/')) {
    body = body.slice(1);
  }

  const source = toRegExpSource(body);

  return { negated, folderOnly, anchored, regexp: source === null ? null : new RegExp(`^${source}$`) };
}

/**
 * Checks one entry against one rule. An anchored rule matches the whole path,
 * another rule matches the last part of the path, the name of the entry.
 *
 * @param {Rule} rule
 * @param {string} path Path of the entry without `/` at the end.
 * @param {boolean} isFolder True when the entry is a folder.
 *
 * @returns {boolean} True when the rule matches the entry, without a look at `!` of the rule.
 */
function matchesRule(rule, path, isFolder) {
  if (rule.regexp === null || (rule.folderOnly && !isFolder)) {
    return false;
  }

  return rule.regexp.test(rule.anchored ? path : path.slice(path.lastIndexOf('/') + 1));
}

/**
 * Removes the spaces at the end of a line, as git does. A space after `\` is a character of the name and stays.
 *
 * @param {string} line
 *
 * @returns {string} The line without its trailing spaces.
 */
function trimTrailingSpaces(line) {
  let end = line.length;

  while (end > 0 && line[end - 1] === ' ' && !isEscaped(line, end - 1)) {
    end--;
  }

  return line.slice(0, end);
}

/**
 * Checks whether a character is escaped: it follows an odd number of `\`. Two `\` are one plain `\`.
 *
 * @param {string} text
 * @param {number} index Index of the character in the text.
 *
 * @returns {boolean} True when the character is escaped.
 */
function isEscaped(text, index) {
  let count = 0;

  for (let at = index - 1; at >= 0 && text[at] === '\\'; at--) {
    count++;
  }

  return count % 2 === 1;
}

/** Character classes of `[[:name:]]`. */
const CLASSES = {
  alnum: 'a-zA-Z0-9',
  alpha: 'a-zA-Z',
  blank: ' \\t',
  cntrl: '\\x00-\\x1f\\x7f',
  digit: '0-9',
  graph: '\\x21-\\x7e',
  lower: 'a-z',
  print: '\\x20-\\x7e',
  punct: '!-\\/:-@\\[-`{-~',
  space: ' \\t\\n\\r\\f\\v',
  upper: 'A-Z',
  xdigit: '0-9A-Fa-f',
};

/**
 * The source of a regular expression for a pattern without its marks `!`, `/` at the start and `/` at the end.
 *
 * @param {string} glob
 *
 * @returns {string | null} Null for a pattern that never matches: an open `[`, a `\` at the end, an unknown class.
 */
function toRegExpSource(glob) {
  let source = '';

  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];

    if (char === '*' && glob[index + 1] === '*') {
      const atStart = index === 0 || glob[index - 1] === '/';
      const atEnd = index + 2 === glob.length;

      if (atStart && glob[index + 2] === '/') {
        // `**/` at the start or after a `/`: any number of folders, also none.
        source += '(?:.*/)?';
        index += 2;
        continue;
      }

      if (atStart && atEnd) {
        // `/**` at the end: everything inside.
        source += '.*';
        index += 1;
        continue;
      }
    }

    if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else if (char === '\\') {
      if (index + 1 === glob.length) {
        return null;
      }
      source += escape(glob[++index]);
    } else if (char === '[') {
      const set = readSet(glob, index);

      if (set === null) {
        return null;
      }
      source += set.source;
      index = set.end;
    } else {
      source += escape(char);
    }
  }

  return source;
}

/**
 * Reads a set like `[a-z]`, `[!ab]` or `[[:digit:]]` of a pattern.
 *
 * @param {string} glob The pattern.
 * @param {number} start Index of the `[` that opens the set.
 *
 * @returns {{ source: string, end: number } | null} The set as a class of a regular expression and the index of its `]`.
 *   Null when the set has no end or an unknown class.
 */
function readSet(glob, start) {
  let index = start + 1;
  const negated = glob[index] === '!' || glob[index] === '^';

  if (negated) {
    index++;
  }

  let body = '';

  // A `]` right after `[` or `[!` is a character of the set.
  for (let first = true; index < glob.length; index++, first = false) {
    const char = glob[index];

    if (char === ']' && !first) {
      return { source: `(?!/)[${negated ? '^' : ''}${body}]`, end: index };
    }

    if (char === '\\') {
      if (index + 1 === glob.length) {
        return null;
      }
      body += escapeInSet(glob[++index]);
    } else if (char === '[' && glob[index + 1] === ':') {
      const close = glob.indexOf(':]', index + 2);

      if (close === -1) {
        body += '\\[';
        continue;
      }
      const name = glob.slice(index + 2, close);

      if (!Object.hasOwn(CLASSES, name)) {
        return null;
      }
      body += CLASSES[name];
      index = close + 1;
    } else if (char === '-' && !first && glob[index + 1] !== ']') {
      body += '-';
    } else {
      body += escapeInSet(char);
    }
  }

  return null;
}

/**
 * Escapes a character that has a meaning in a regular expression.
 *
 * @param {string} char
 *
 * @returns {string} The character, with `\` in front when it has a meaning.
 */
function escape(char) {
  return /[.*+?^${}()|[\]\\/]/.test(char) ? `\\${char}` : char;
}

/**
 * Escapes a character that has a meaning inside `[...]` of a regular expression.
 *
 * @param {string} char
 *
 * @returns {string} The character, with `\` in front when it has a meaning in a set.
 */
function escapeInSet(char) {
  return /[\\\]^[-]/.test(char) ? `\\${char}` : char;
}

/**
 * Stops at a path that `matches()` can not check.
 *
 * @param {unknown} path
 *
 * @throws {TypeError} When the path is not a string, is empty, starts with `/`, or has an empty part, `.` or `..`.
 */
function assertPath(path) {
  if (typeof path !== 'string' || path === '' || path.startsWith('/')) {
    throw new TypeError(`PathMask: path must be a relative path, got ${JSON.stringify(path)}`);
  }
  const parts = (path.endsWith('/') ? path.slice(0, -1) : path).split('/');

  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new TypeError(`PathMask: path must be a normalized path without empty parts, . or .., got ${JSON.stringify(path)}`);
  }
}
