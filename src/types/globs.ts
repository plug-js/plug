import { cpus } from 'os'

/**
 * A minimal subset of `fast-glob`-s own `Options` only exposing pattern
 * matching and filtering options.
 */
export interface FilterOptions {
  /**
   * If set to `true`, then patterns without slashes will be matched against
   * the basename of the path if it contains slashes.
   *
   * @default false
   */
  baseNameMatch?: boolean,
  /**
   * Enables Bash-like brace expansion.
   *
   * @default true
   */
  braceExpansion?: boolean,
  /**
   * Enables a case-sensitive mode for matching files.
   *
   * @default true
   */
  caseSensitiveMatch?: boolean,
  /**
   * Allow patterns to match entries that begin with a period (`.`).
   *
   * @default false
   */
  dot?: boolean,
  /**
   * Enables Bash-like `extglob` functionality.
   *
   * @default true
   */
  extglob?: boolean,
  /**
   * Enables recursively repeats a pattern containing `**`.
   * If `false`, `**` behaves exactly like `*`.
   *
   * @default true
   */
  globstar?: boolean,
  /**
   * An array of glob patterns to exclude matches.
   * This is an alternative way to use negative patterns.
   *
   * @default []
   */
  ignore?: string[],
}

/**
 * A subset of `fast-glob`'s own `Options`, only exposing those options which
 * are relevant to us while processing globs from the file system.
 */
export interface GlobOptions extends FilterOptions {
  /**
   * Specifies the maximum number of concurrent requests from a reader to read
   * directories.
   *
   * @default os.cpus().length
   */
  concurrency?: number;

  /**
   * Specifies the maximum depth of a read directory relative to the start
   * directory.
   *
   * @default Infinity
   */
  deep?: number;

  /**
   * Indicates whether to traverse descendants of symbolic link directories.
   *
   * @default true
   */
  followSymbolicLinks?: boolean;

  /**
   * Throw an error when symbolic link is broken if `true` or safely
   * return `lstat` call if `false`.
   *
   * @default false
   */
  throwErrorOnBrokenSymbolicLink?: boolean;

  /**
   * Include `node_modules` in glob matching
   *
   * @default false
   */
  includeNodeModules?: boolean
}

/** Constant defaults for `FilterOptions` */
export const FILTER_OPTIONS_DEFAULTS: Readonly<Required<FilterOptions>> = Object.freeze({
  baseNameMatch: false,
  braceExpansion: true,
  caseSensitiveMatch: true,
  dot: false,
  extglob: true,
  globstar: true,
  ignore: [],
})

/** Constant defaults for `GlobOptions` */
export const GLOB_OPTIONS_DEFAULTS: Readonly<Required<GlobOptions>> = Object.freeze({
  ...FILTER_OPTIONS_DEFAULTS,
  concurrency: cpus().length,
  deep: Infinity,
  followSymbolicLinks: true,
  throwErrorOnBrokenSymbolicLink: true,
  includeNodeModules: false,
})
