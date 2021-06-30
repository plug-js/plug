import { extname } from 'path/posix'
import { File } from '../files'
import { match, MatchOptions } from './match'
import { parseOptions, ParseOptions } from './options'
import { DirectoryPath, getRelativePath } from './paths'

export interface FilterOptions extends MatchOptions {
  /**
   * Match original paths of files
   *
   * @default false
   */
  matchOriginalPaths?: boolean,
  /**
   * Match only scripts (`.js` files)
   *
   * @default: false
   */
  scriptsOnly?: boolean,
}

export function* filter(
    directory: DirectoryPath,
    input: Iterable<File>,
    ...args: ParseOptions<FilterOptions>
): Generator<File, void, void> {
  const { globs, options } = parseOptions(args, {
    matchOriginalPaths: false,
    scriptsOnly: false,
  })

  const { matchOriginalPaths, scriptsOnly } = options

  const matcher = match(...globs, options)

  if (matchOriginalPaths) {
    for (const file of input) {
      if (scriptsOnly && (extname(file.absolutePath) !== '.js')) continue
      if (! file.originalFile) continue
      const original = file.originalFile.absolutePath
      const relative = getRelativePath(directory, original)
      if (matcher(relative)) yield file
    }
  } else {
    for (const file of input) {
      if (scriptsOnly && (extname(file.absolutePath) !== '.js')) continue
      const relative = getRelativePath(directory, file.absolutePath)
      if (matcher(relative)) yield file
    }
  }
}
