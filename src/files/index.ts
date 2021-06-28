import type { RawSourceMap } from 'source-map'
import type { File } from './file'

/** A type describing how to _add_ a virtual file to a list */
export type FileOptions = {
  /** The contents (if any) of the file to add */
  contents: string,
  /** The original path of the file (if any) defaulting to its path */
  originalFile?: File,
  /**
   * Source mapping details to associate with a `File`.
   *
   * This can be a `RawSourceMap`, or a boolean indicating
   * if the source map should be extracted from the file's own contents.
   * @default true
   */
   sourceMap?: boolean | RawSourceMap,
}

// Import and re-export our `File` interface
export type { File } from './file'

// Import and re-export our `Files` interface
export { Files } from './files'
