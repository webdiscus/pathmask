/**
 * Matches relative paths using `.gitignore` syntax.
 * Paths use `/` separators. Directory paths end with `/`.
 *
 * Empty strings and comments starting with `#` are ignored.
 * Spaces at the end of a pattern are removed unless escaped with a backslash.
 *
 * Patterns are applied in array order. The last matching pattern wins.
 * A pattern starting with `!` cancels a previous match.
 *
 * A matched directory also matches all paths inside it.
 * Negation cannot cancel a match from a parent directory.
 */
export class PathMask {
  /** @type {Rule[]} */
  #rules;

  /**
   * Creates a path matcher from patterns in `.gitignore` syntax.
   *
   * @param {string[]} patterns Patterns applied in array order.
   *
   * @throws {TypeError} If patterns is not an array of strings.
   */
  constructor(patterns) {
    if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== 'string')) {
      throw new TypeError('PathMask: patterns must be an array of strings');
    }
    this.#rules = patterns.map(parsePattern).filter((rule) => rule !== null);
  }

  /**
   * Tests a relative path against the configured patterns.
   *
   * @param {string} path Relative path with `/` separators. Directory paths must end with `/`.
   *
   * @returns {boolean} True if the path or a parent directory matches after applying negation rules, otherwise false.
   *
   * @throws {TypeError} If path is not a string, is empty, starts with `/`,
   *   or contains an empty path segment, `.` or `..`.
   */
  matches(path) {
    assertPath(path);
    const isDirectory = path.endsWith('/');
    const parts = (isDirectory ? path.slice(0, -1) : path).split('/');

    for (let i = 1; i < parts.length; i++) {
      if (this.#matchesEntry(parts.slice(0, i).join('/'), true)) {
        return true;
      }
    }

    return this.#matchesEntry(parts.join('/'), isDirectory);
  }

  /**
   * Tests a file or directory against the configured rules without checking parent directories.
   * Rules are applied in array order. The last matching rule wins.
   *
   * @param {string} path Relative path without a trailing `/`.
   * @param {boolean} isDirectory True if the path represents a directory.
   *
   * @returns {boolean} True if the last matching rule is not negated, otherwise false.
   */
  #matchesEntry(path, isDirectory) {
    let matched = false;

    for (const rule of this.#rules) {
      if (matchesRule(rule, path, isDirectory)) {
        matched = !rule.negated;
      }
    }

    return matched;
  }
}

/** POSIX character classes of `[[:name:]]`. */
const CHARACTER_CLASSES = {
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
 * A parsed pattern used to match a file or directory.
 *
 * @typedef {object} Rule
 * @property {boolean} negated True if the pattern starts with `!`.
 * @property {boolean} isDir True if the rule matches only directories.
 * @property {boolean} isPath True if the pattern contains `/` after removing the trailing directory marker.
 * @property {RegExp | null} rregexp Regular expression used for matching, or null if the pattern cannot match.
 */

/**
 * Parses a pattern in `.gitignore` syntax into a matching rule.
 *
 * @param {string} pattern Pattern to parse.
 *
 * @returns {Rule | null} Parsed rule, or null for an empty string, a comment,
 *   or a lone `!` after trimming unescaped trailing spaces.
 */
function parsePattern(pattern) {
  let body = trimSpaces(pattern);

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

  const isDir = body.endsWith('/') && !isEscaped(body, body.length - 1);

  if (isDir) {
    body = body.slice(0, -1);
  }

  // A leading or internal `/` makes the pattern match the full path from the root.
  const isPath = body.includes('/');

  if (body.startsWith('/')) {
    body = body.slice(1);
  }

  const source = toRegExpSource(body);

  return { negated, isDir, isPath, regexp: source === null ? null : new RegExp(`^${source}$`) };
}

/**
 * Tests a file or directory against a single rule without applying negation.
 * Patterns with a leading or internal `/` match the full relative path.
 * Other patterns match only the last path segment.
 *
 * @param {Rule} rule Rule to match against.
 * @param {string} path Relative path without a trailing `/`.
 * @param {boolean} isDirectory True if the path represents a directory.
 *
 * @returns {boolean} True if the rule matches the entry, otherwise false.
 */
function matchesRule(rule, path, isDirectory) {
  if (rule.regexp === null || (rule.isDir && !isDirectory)) {
    return false;
  }

  return rule.regexp.test(rule.isPath ? path : path.slice(path.lastIndexOf('/') + 1));
}

/**
 * Removes unescaped trailing spaces from a pattern.
 *
 * @param {string} pattern Pattern to trim.
 *
 * @returns {string} Pattern with unescaped trailing spaces removed.
 */
function trimSpaces(pattern) {
  let i = pattern.length;

  while (i > 0 && pattern[i - 1] === ' ' && !isEscaped(pattern, i - 1)) {
    i--;
  }

  return pattern.slice(0, i);
}

/**
 * Checks whether a character is escaped.
 * A character is escaped if the number of backslashes directly before it is odd.
 *
 * @param {string} text Text containing the character.
 * @param {number} index Index of the character to check.
 *
 * @returns {boolean} True if the character is escaped, otherwise false.
 */
function isEscaped(text, index) {
  let count = 0;

  for (let at = index - 1; at >= 0 && text[at] === '\\'; at--) {
    count++;
  }

  return count % 2 === 1;
}

/**
 * Converts a pattern to regular expression source text.
 *
 * @param {string} pattern Pattern with the leading `!`, leading `/`, and trailing `/` already removed.
 *
 * @returns {string | null} Regular expression source text, or null if the pattern
 *   has a `[` without a closing `]`, an unknown character class, or a backslash at the end.
 */
function toRegExpSource(pattern) {
  let source = '';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '*' && pattern[i + 1] === '*') {
      const atStart = i === 0 || pattern[i - 1] === '/';
      const atEnd = i + 2 === pattern.length;

      if (atStart && pattern[i + 2] === '/') {
        // `**/` matches zero or more directories.
        source += '(?:.*/)?';
        i += 2;
        continue;
      }

      if (atStart && atEnd) {
        // `/**` at the end matches everything inside the directory.
        source += '.*';
        i += 1;
        continue;
      }
    }

    if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else if (char === '\\') {
      if (i + 1 === pattern.length) {
        return null;
      }
      source += escapeRegExpChar(pattern[++i]);
    } else if (char === '[') {
      const parsed = parseCharacterClass(pattern, i);

      if (parsed === null) {
        return null;
      }
      source += parsed.source;
      i = parsed.end;
    } else {
      source += escapeRegExpChar(char);
    }
  }

  return source;
}

/**
 * Parses a character class such as `[a-z]`, `[!ab]` or `[[:digit:]]` from a pattern.
 *
 * @param {string} pattern Pattern containing the character class.
 * @param {number} startIndex Index of the opening `[`.
 *
 * @returns {{ source: string, end: number } | null} Regular expression source text
 *   and the index of the closing `]`. Returns null if the closing `]` is missing
 *   or the pattern uses an unknown character class.
 */
function parseCharacterClass(pattern, startIndex) {
  let i = startIndex + 1;
  const negated = pattern[i] === '!' || pattern[i] === '^';

  if (negated) {
    i++;
  }

  let body = '';

  // A `]` right after `[`, `[!` or `[^` is part of the character class.
  for (let isFirst = true; i < pattern.length; i++, isFirst = false) {
    const char = pattern[i];

    if (char === ']' && !isFirst) {
      return { source: `(?!/)[${negated ? '^' : ''}${body}]`, end: i };
    }

    if (char === '\\') {
      if (i + 1 === pattern.length) {
        return null;
      }
      body += escapeClassChar(pattern[++i]);
    } else if (char === '[' && pattern[i + 1] === ':') {
      const closeIndex = pattern.indexOf(':]', i + 2);

      if (closeIndex === -1) {
        body += '\\[';
        continue;
      }
      const name = pattern.slice(i + 2, closeIndex);

      if (!Object.hasOwn(CHARACTER_CLASSES, name)) {
        return null;
      }
      body += CHARACTER_CLASSES[name];
      i = closeIndex + 1;
    } else if (char === '-' && !isFirst && pattern[i + 1] !== ']') {
      body += '-';
    } else {
      body += escapeClassChar(char);
    }
  }

  return null;
}

/**
 * Escapes a character for use in a regular expression.
 *
 * @param {string} char Character to escape.
 *
 * @returns {string} Character with a backslash added if needed, otherwise the original character.
 */
function escapeRegExpChar(char) {
  return /[.*+?^${}()|[\]\\/]/.test(char) ? `\\${char}` : char;
}

/**
 * Escapes a character for use inside `[...]` in a regular expression.
 *
 * @param {string} char Character to escape.
 *
 * @returns {string} Character with a backslash added if needed, otherwise the original character.
 */
function escapeClassChar(char) {
  return /[\\\]^[-]/.test(char) ? `\\${char}` : char;
}

/**
 * Checks that a path is valid for matching.
 *
 * @param {unknown} path Path to check.
 *
 * @throws {TypeError} If path is not a string, is empty, starts with `/`,
 *   or contains an empty path segment, `.` or `..`.
 */
function assertPath(path) {
  if (typeof path !== 'string' || path === '' || path.startsWith('/')) {
    throw new TypeError(`PathMask: path must be a relative path, got ${JSON.stringify(path)}`);
  }
  const parts = (path.endsWith('/') ? path.slice(0, -1) : path).split('/');

  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new TypeError(`PathMask: path must be a normalized path without empty path segments, . or .., got ${JSON.stringify(path)}`);
  }
}
