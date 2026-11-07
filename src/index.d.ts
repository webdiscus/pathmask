/**
 * A set of patterns in the syntax of `.gitignore`, for relative paths with `/` between the parts.
 */
export declare class PathMask {
  /**
   * @param patterns The lines of the mask, for example `['*.log', '!keep.log']`.
   * @throws {TypeError} When `patterns` is not an array of strings.
   */
  constructor(patterns: readonly string[]);

  /**
   * True when the mask matches the path or a folder that contains it.
   * @param path Relative path with `/` between the parts. A folder ends with `/`, for example `data/log/`.
   * @throws {TypeError} When the path is empty, starts with `/`, or has an empty part, `.` or `..`.
   */
  matches(path: string): boolean;
}
