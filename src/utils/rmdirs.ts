import { parseOptions, ParseOptions } from './options'
import { DirectoryPath, getParent } from './paths'
import { walk, WalkOptions } from './walk'
import { unlink, readdir, rmdir } from './asyncfs'

export type RmDirsOptions = Omit<WalkOptions, 'onDirectory'> & {
  /**
   * Prune (delete) empty directories or not.
   *
   * @default true
   */
  pruneEmptyDirectories?: boolean
}

export async function rmdirs(directory: DirectoryPath): Promise<void>
export async function rmdirs(directory: DirectoryPath, ...args: ParseOptions<RmDirsOptions>): Promise<void>
export async function rmdirs(directory: DirectoryPath, ...args: ParseOptions<RmDirsOptions> | []): Promise<void> {
  let globs: [ string, ...string[] ] = [ '**' ]
  let options: WalkOptions = { dot: true }
  let pruneEmptyDirectories = true

  if (typeof args[0] === 'string') {
    ({ globs, options: { pruneEmptyDirectories, ...options } } = parseOptions(args as ParseOptions<RmDirsOptions>, {
      pruneEmptyDirectories: true,
    }))
  }

  const directories = new Set<DirectoryPath>()
  options.onDirectory = (dir) => void directories.add(dir)

  for await (const file of walk(directory, ...globs, options)) {
    directories.add(getParent(file))
    await unlink(file)
  }

  if (pruneEmptyDirectories) {
    for (const directory of [ ...directories ].sort().reverse()) {
      if ((await readdir(directory)).length === 0) {
        await rmdir(directory)
      }
    }
  }
}
