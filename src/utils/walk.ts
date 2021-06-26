import * as fs from './asyncfs'

import { join } from 'path'
import { match } from './match'
import { parseOptions } from './options'

import type { DirectoryPath, FilePath } from './paths'
import type { MatchOptions } from './match'
import type { ParseOptions } from './options'

// Convenience type for an async generator over `FilePath`s
type WalkGenerator = AsyncGenerator<FilePath, void, void>

// A generator function walking a `DirectoryPath` and yelding `FilePath`
// results for each entry it finds up until the given `maxDepth`
async function* walker(
    directory: DirectoryPath,
    matcher: (path: string) => boolean,
    symlinks: boolean,
    maxdepth: number,
    depth: number,
): WalkGenerator {
  // Read the directory, including file types
  const dirents = await fs.readdir(directory, { withFileTypes: true })

  // For each entry we determine the full path
  for (const dirent of dirents) {
    const path = join(directory, dirent.name)

    // If the entry is a file and matches, yield it
    if (dirent.isFile() && matcher(path)) yield path as FilePath

    // If the entry is a directory within our depth, walk it recursively
    else if (dirent.isDirectory() && (depth < maxdepth)) {
      const children = walker(path as DirectoryPath, matcher, symlinks, maxdepth, depth + 1)
      for await (const child of children) yield child

    // If this is a symlink and we're told to check them let's see what we have
    } else if (dirent.isSymbolicLink() && symlinks) {
      const stat = await fs.stat(path)

      // If the link is a file and matches, yield it
      if (stat.isFile() && matcher(path)) yield path as FilePath

      // If the link is a directory within our depth, walk it recursively
      else if (stat.isDirectory() && (depth < maxdepth)) {
        const children = walker(path as DirectoryPath, matcher, symlinks, maxdepth, depth + 1)
        for await (const child of children) yield child
      }
    }
  }
}

/** Specific options for walking a directory */
export interface WalkOptions extends MatchOptions {
  /**
   * Whether symlinks should be followed or not.
   *
   * @default true
   */
  followSymlinks?: boolean,

  /**
   * The maximum depth (in directory levels) to recurse into.
   *
   * @default Infinity
   */
   maxDepth?: number,
}

/**
 * Walk the specified directory, returning an asynchronous iterator over all
 * the `FilePath`s found matching the specified globs and matching options
 */
export function walk(directory: DirectoryPath, ...args: ParseOptions<WalkOptions>): WalkGenerator {
  const { globs, options: { followSymlinks, maxDepth, ...options } } =
      parseOptions(args, {
        followSymlinks: true,
        maxDepth: Infinity,
      })


  return walker(directory, match({ globs, options }), followSymlinks, maxDepth, 0)
}
