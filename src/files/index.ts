import { RawSourceMap } from 'source-map'
import { VirtualFileListImpl } from './list'
import { AbsolutePath, RelativePath, CanonicalPath, DirectoryPath } from '../utils/paths'

/**
 * The `VirtualFile` interface represents a file in a `VirtualFileList`.
 */
export interface VirtualFile {
  /** The `VirtualFileList` associated with this `VirtualFile` */
  readonly fileList: VirtualFileList
  /** The _absolute_ path of this `VirtualFile` */
  readonly absolutePath: AbsolutePath
  /** The path of this `VirtualFile` relative to its `VirtualFileList`'s `baseDir` */
  readonly relativePath: RelativePath
  /** The _canonical_ path of this `VirtualFile` (dependant on filesystem case sensitivity) */
  readonly canonicalPath: CanonicalPath
  /** An optional array of absolute paths indicating how this file can be `require(...)`d */
  readonly originalPath: AbsolutePath

  /** Checks if this `VirtualFile` exists (its `contents()` can be accessed) */
  exists(): Promise<boolean>
  /** Checks if this `VirtualFile` exists (its `contents()` can be accessed) */
  existsSync(): boolean

  /** The last modified timestamp of this `VirtualFile` */
  lastModified(): Promise<number>
  /** The last modified timestamp of this `VirtualFile` */
  lastModifiedSync(): number

  /**
   * Return the contents of this `VirtualFile`
   *
   * _OCD Note_: `content` (without the S) implies there's some kind of meaning,
   * and not just a string, or a sequence of bytes.
   *
   * @see https://english.stackexchange.com/questions/56831/file-content-vs-file-contents
   */
  contents(): Promise<string>
  /** Return the contents of this `VirtualFile` */
  contentsSync(): string

  /** Return a `RawSourceMap` associated with this `VirtualFile` if any */
  sourceMap(): Promise<RawSourceMap | undefined>
  /** Return a `RawSourceMap` associated with this `VirtualFile` if any */
  sourceMapSync(): RawSourceMap | undefined

  /** Return a `VirtualFile` whose path is relative to this one */
  get(path: string): VirtualFile

  /** Return this same `VirtualFile` in another virtual file lis */
  clone(files: VirtualFileList): VirtualFile
}

/** A type describing how to _add_ a virtual file to a list */
export type VirtualFileOptions = {
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
 * The `VirtualFileList` interface represents an extremely simple view over
 * the _physical_ filesystem where a number of `VirtualFile`s can be accessed.
 */
export interface VirtualFileList {
  /** The base directory of this `VirtualFileList` */
  readonly directoryPath: DirectoryPath,

  /** Return a `VirtualFile` associated with this `VirtualFileList` */
  get(path: string): VirtualFile

  /** Return all `VirtualFile`s this `VirtualFileList` was build with */
  list(): readonly VirtualFile[]

  /** Checks whether this `VirtualFileList` lists the given path */
  has(path: string): boolean

  /**
   * Create a new `VirtualFileListBuilder` whose directory path is
   * relative to this one.
   *
   * Cached files by this instance (including any virtual content) will be
   * preserved by the resulting `VirtualFileList` but no files will be added.
   */
  builder(path?: string): VirtualFileListBuilder

  /** Clone this `VirtualFileList` preserving all files listed by this */
  clone(path?: string): VirtualFileList

  /** Add a `VirtualFile` to this `VirtualFileList` */
  add(file: VirtualFile): VirtualFile
  /** Add a `VirtualFile` to this `VirtualFileList` */
  add(path: string, options?: VirtualFileOptions): VirtualFile
}

/**
 * The `VirtualFileListBuilder` interface represents a _builder_ for a
 * `VirtualFileList`.
 */
export interface VirtualFileListBuilder {
  /** Add a `VirtualFile` to the `VirtualFileList` */
  add(file: VirtualFile): this
  /** Add a `VirtualFile` to the `VirtualFileList` */
  add(path: string, options?: VirtualFileOptions): this

  /** Return the `VirtualFileList` instance being built */
  build(): VirtualFileList
}

/* Internal type declaring the constructor of a `VirtualFileList` */
type VirtualFileListConstructor = {
  new(path?: string): VirtualFileList
  builder(path?: string): VirtualFileListBuilder
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const VirtualFileList: VirtualFileListConstructor = VirtualFileListImpl
