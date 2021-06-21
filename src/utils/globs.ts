import { DirectoryPath } from './paths'
import { Options, stream } from 'fast-glob'

/**
 * A subset of `fast-glob`'s own `Options`, only exposing those options which
 * are relevant to us, and forcedly removing our forced defaults
 */
export type GlobOptions = Pick<Options, 'baseNameMatch'
  | 'braceExpansion' | 'caseSensitiveMatch' | 'concurrency' | 'deep'
  | 'dot' | 'extglob' | 'followSymbolicLinks' | 'globstar' | 'ignore'
  | 'throwErrorOnBrokenSymbolicLink'> & {
  /**
   * Include `node_modules` in glob matching
   * @default false
   */
  includeNodeModules?: boolean
}

const defaults: Options = {
  absolute: false, // VFS always does the resolution
  markDirectories: false, // do not mark directories
  onlyDirectories: false, // no directories
  onlyFiles: true, // only files
  stats: false, // no stats
  suppressErrors: false, // report errors
  unique: false, // VFS already dedupes files
}

/**
 * Process globs .
 */
export async function glob(
    directory: DirectoryPath,
    globs: string[],
    options: GlobOptions,
    callback: (entry: string) => void | Promise<void>,
): Promise<void> {
  // Prepare the glob options, assigning our defaults and current directory
  const opts: Options = Object.assign({}, options, defaults, { cwd: directory })

  // istanbul ignore else - Ignore node modules by default
  if (! options.includeNodeModules) {
    opts.ignore = options.ignore || []
    opts.ignore.push('**/node_modules')
  }

  // Invoke the callback for each of our matched files
  for await (const entry of stream(globs, opts)) {
    await callback(entry.toString())
  }
}
