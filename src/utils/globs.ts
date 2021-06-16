import { Options, stream } from 'fast-glob'
import { VirtualFileSystem } from '../files'
import { DirectoryPath } from './paths'

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
 * Create a `VirtualFileSystem` out of a glob match executed in a directory.
 *
 * This will also read and cache the contents of the files while streaming the
 * directory, in order to validate their readability and speed up later stages.
 */
export async function glob(
    directory: DirectoryPath,
    globs: string[],
    options: GlobOptions = {},
): Promise<VirtualFileSystem> {
  // Prepare the glob options, assigning our defaults and current directory
  const opts: Options = Object.assign({}, options, defaults, { cwd: directory })

  // istanbul ignore else - Ignore node modules by default
  if (! options.includeNodeModules) {
    opts.ignore = options.ignore || []
    opts.ignore.push('**/node_modules')
  }

  // As we stream globs, we read their contents. This ensures that files
  // can be read and processed later on, and optimises TypeScript which uses
  // only synchronous methods...
  const promises: Promise<string>[] = []

  // Create our builder, stream our entries, and read the files
  const fileSystem = new VirtualFileSystem(directory)
  for await (const entry of stream(globs, opts)) {
    const file = fileSystem.add(entry.toString())
    promises.push(file.contents())
  }

  // Await for _all_ files to be read (and cached)
  await Promise.all(promises)

  // Return our filesystem
  return fileSystem
}
