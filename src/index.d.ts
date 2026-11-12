/**
 * A set of patterns in `.gitignore` syntax, for relative paths with `/` between path segments.
 */
export declare class PathMask {
  /**
   * @param patterns The lines of the mask, for example `['*.log', '!keep.log']`.
   * @throws {TypeError} When `patterns` is not an array of strings.
   */
  constructor(patterns: readonly string[]);

  /**
   * True when the mask matches the path or a directory that contains it.
   * @param path Relative path with `/` between path segments. A directory ends with `/`, for example `data/log/`.
   * @throws {TypeError} When the path is not a string, is empty, starts with `/`, or contains an empty path segment, `.` or `..`.
   */
  matches(path: string): boolean;
}
