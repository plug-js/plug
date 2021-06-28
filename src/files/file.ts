import { RawSourceMap } from 'source-map'
import type { FileSourceMap, SourceMapOptions } from '../sourcemaps'
import type { CanonicalPath, FilePath } from '../utils/paths'

import { getCanonicalPath } from '../utils/paths'

export abstract class File {
  /** The _absolute_ path of this `File` */
  readonly absolutePath!: FilePath
  /** The _canonical_ path of this `File`, dependant on filesystem case sensitivity */
  readonly canonicalPath!: CanonicalPath
  /** The _original_ of this `File` if this file was result of a transformation */
  readonly originalFile?: File

  protected constructor(absolutePath: FilePath, originalFile?: File) {
    const canonicalPath = getCanonicalPath(absolutePath)
    Object.defineProperties(this, {
      'absolutePath': { enumerable: true, value: absolutePath },
      'originalFile': { enumerable: false, value: originalFile },
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

  /** Produce a `RawSourceMap` for this file, if any source map data was available */
  async rawSourceMap(options?: SourceMapOptions): Promise<RawSourceMap | undefined> {
    const sourceMap = await this.sourceMap()
    return await sourceMap?.produceSourceMap(this.absolutePath, options)
  }
}
