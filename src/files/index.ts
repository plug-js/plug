import { RawSourceMap } from 'source-map'
import { FilesImpl } from './files'

import {
  AbsolutePath,
  CanonicalPath,
  DirectoryPath,
  RelativePath,
} from '../utils/paths'

/**
 * The `File` interface represents a file in a `Files`.
 */
export interface File {
  /** The `Files` associated with this `File` */
  readonly fileList: Files
  /** The _absolute_ path of this `File` */
  readonly absolutePath: AbsolutePath
  /** The path of this `File` relative to its `Files`'s `baseDir` */
  readonly relativePath: RelativePath
  /** The _canonical_ path of this `File` (dependant on filesystem case sensitivity) */
  readonly canonicalPath: CanonicalPath
  /** An optional array of absolute paths indicating how this file can be `require(...)`d */
  readonly originalPath: AbsolutePath

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

  /** Return a `RawSourceMap` associated with this `File` if any */
  sourceMap(): Promise<RawSourceMap | undefined>
  /** Return a `RawSourceMap` associated with this `File` if any */
  sourceMapSync(): RawSourceMap | undefined

  /** Return a `File` whose path is relative to this one */
  get(path: string): File

  /** Clone this `File` in another list, optionally changing its path */
  clone(files: Files, path?: string): File
}

/** A type describing how to _add_ a virtual file to a list */
export type FileOptions = {
  /** The contents (if any) of the file to add */
  contents?: string,
  /**
   * A source map for this file or a boolean indicating whether the source
   * map should be extracted from the file's contents themselves
   * @default true
   */
  sourceMap?: boolean | RawSourceMap,
  /** The original path of the file (if any) defaulting to its path */
  originalPath?: string,
}

/**
 * The `Files` interface represents an extremely simple view over
 * the _physical_ filesystem where a number of `File`s can be accessed.
 */
export interface Files {
  /** The base directory of this `Files` */
  readonly directoryPath: DirectoryPath,

  /** Return a `File` associated with this `Files` */
  get(path: string): File

  /** Return all `File`s this `Files` was build with */
  list(): File[]

  /** Checks whether this `Files` lists the given path */
  has(path: string): boolean

  /** Clone this `Files` preserving all files listed by this */
  clone(path?: string): Files

  /** Add a `File` to this `Files` */
  add(file: File): File
  /** Add a `File` to this `Files` with a new path */
  add(path: string, file: File): File
  /** Add a `File` to this `Files` */
  add(path: string, options?: FileOptions): File
}

/* Internal type declaring the constructor of a `Files` */
type FilesConstructor = {
  new(path?: string): Files
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Files: FilesConstructor = FilesImpl
