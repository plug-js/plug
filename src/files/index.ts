import { Files } from './files'
import { CanonicalPath, FilePath, RelativeFilePath } from '../utils/paths'
import { FileSourceMap, SourceMapV3 } from '../source-maps'

// Import and re-export our `Files` class
export { Files } from './files'

/** A type describing how to _add_ a virtual file to a list */
export type FileOptions = {
  /** The contents (if any) of the file to add */
  contents?: string,
  /**
   * A source map for this file or a boolean indicating whether the source
   * map should be extracted from the file's contents themselves
   * @default true
   */
  sourceMap?: boolean | SourceMapV3,
  /** A `Files` instance where source map source attachments can be read from */
  sourceMapSources?: Files,
  /** The original path of the file (if any) defaulting to its path */
  originalPath?: FilePath,
}

/**
 * The `File` interface represents a file in a `Files`.
 */
export interface File {
  /** The `Files` associated with this `File` */
  readonly files: Files
  /** The _absolute_ path of this `File` */
  readonly absolutePath: FilePath
  /** The path of this `File` relative to its `Files`'s `baseDir` */
  readonly relativePath: RelativeFilePath
  /** The _canonical_ path of this `File` (dependant on filesystem case sensitivity) */
  readonly canonicalPath: CanonicalPath
  /** An optional array of absolute paths indicating how this file can be `require(...)`d */
  readonly originalPath: FilePath

  /** Checks if this `File` exists (its `contents()` can be accessed) */
  exists(): Promise<boolean>
  /** Checks if this `File` exists (its `contents()` can be accessed) */
  existsSync(): boolean

  /** The last modified timestamp of this `File` */
  lastModified(): Promise<number>
  /** The last modified timestamp of this `File` */
  lastModifiedSync(): number

  /**
   * Return the contents of this `File`
   *
   * _OCD Note_: `content` (without the S) implies there's some kind of meaning,
   * and not just a string, or a sequence of bytes.
   *
   * @see https://english.stackexchange.com/questions/56831/file-content-vs-file-contents
   */
  contents(): Promise<string>
  /** Return the contents of this `File` */
  contentsSync(): string

  /** Return a `FileSourceMap` associated with this `File` if any */
  sourceMap(): Promise<FileSourceMap | undefined>
  /** Return a `FileSourceMap` associated with this `File` if any */
  sourceMapSync(): FileSourceMap | undefined

  /** Return a `File` whose path is relative to this one */
  get(path: string): File
}
