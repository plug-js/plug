import type { FilePath } from '../utils/paths'
import type { FileSourceMap } from '../source-maps'
import type { Files } from './files'
import type { RawSourceMap } from 'source-map'

type FileOptionsSourceMapConstraints = {
  /**
   * A boolean indicating whether the source map should be extracted from the
   * file's own contents or not
   * @default true
   */
  sourceMap?: boolean,
  /** A `Files` instance where source map source attachments can be read from */
  sourceMapSources?: Files,
 } | {
  /** A `RawSourceMap` containing mapping data for this `File` */
  sourceMap: RawSourceMap,
  /** A `Files` instance where source map source attachments can be read from */
  sourceMapSources?: Files,
} | {
  /** A `FileSourceMap` containing mapping data for this `File` */
  sourceMap: FileSourceMap,
  /** Any `FileSourceMap` should have its sources already attached  */
  sourceMapSources?: never,
}

/** A type describing how to _add_ a virtual file to a list */
export type FileOptions = FileOptionsSourceMapConstraints & {
  /** The contents (if any) of the file to add */
  contents: string,
  /** The original path of the file (if any) defaulting to its path */
  originalPath?: FilePath,
}

// Import and re-export our `File` interface
export type { File } from './file'

// Import and re-export our `Files` interface
export { Files } from './files'
