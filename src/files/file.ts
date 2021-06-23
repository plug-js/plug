import type { FileSourceMap } from '../source-maps'
import type { Files } from './files'
import type { CanonicalPath, FilePath } from '../utils/paths'

import { getCanonicalPath, getRelativePath } from '../utils/paths'

export abstract class File {
  /** The `Files` instance associated with this `File` */
  readonly files!: Files
  /** The _absolute_ path of this `File` */
  readonly absolutePath!: FilePath
  /** The _original_ path of this `File` from where this was generated from */
  readonly originalPath!: FilePath
  /** The path of this `File` relative to its `Files`'s `directory` */
  readonly relativePath!: string
  /** The _canonical_ path of this `File` (dependant on filesystem case sensitivity) */
  readonly canonicalPath!: CanonicalPath

  protected constructor(
      files: Files,
      absolutePath: FilePath,
      originalPath: FilePath = absolutePath,
  ) {
    const relativePath = getRelativePath(files.directory, absolutePath)
    const canonicalPath = getCanonicalPath(absolutePath)
    Object.defineProperties(this, {
      'files': { enumerable: false, value: files },
      'absolutePath': { enumerable: true, value: absolutePath },
      'originalPath': { enumerable: true, value: originalPath },
      'relativePath': { enumerable: false, value: relativePath },
      'canonicalPath': { enumerable: false, value: canonicalPath },
    })
  }

  /**
   * Return the contents of this `File`
   *
   * _OCD Note_: `content` (without the S) implies there's some kind of meaning,
   * and not just a string, or a sequence of bytes.
   *
   * @see https://english.stackexchange.com/questions/56831/file-content-vs-file-contents
   */
  abstract contents(): Promise<string>
  /** Return the contents of this `File` */
  abstract contentsSync(): string

  /** Return a `FileSourceMap` associated with this `File` if any */
  abstract sourceMap(): Promise<FileSourceMap | undefined>
  /** Return a `FileSourceMap` associated with this `File` if any */
  abstract sourceMapSync(): FileSourceMap | undefined
}
