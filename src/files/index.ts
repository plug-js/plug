import { RawSourceMap } from 'source-map'
import { VirtualFileListImpl } from './internal'
import { AbsolutePath, RelativePath, CanonicalPath, DirectoryPath } from '../utils/paths'

/**
 * The `VirtualFile` interface represents a file in a `VirtualFileList`.
 */
export interface VirtualFile {
  /** The `VirtualFileList` associated with this `VirtualFile` */
  readonly files: VirtualFileList
  /** The _absolute_ path of this `VirtualFile` */
  readonly absolutePath: AbsolutePath
  /** The path of this `VirtualFile` relative to its `VirtualFileList`'s `baseDir` */
  readonly relativePath: RelativePath
  /** The _canonical_ path of this `VirtualFile` (dependant on filesystem case sensitivity) */
  readonly canonicalPath: CanonicalPath

  /** Checks if this `VirtualFile` exists (its `contents()` can be accessed) */
  exists(): Promise<boolean>
  /** Checks if this `VirtualFile` exists (its `contents()` can be accessed) */
  existsSync(): boolean

  /** The last modified timestamp of this `VirtualFile` */
  lastModified(): Promise<number>
  /** The last modified timestamp of this `VirtualFile` */
  lastModifiedSync(): number

  /** Return the contents of this `VirtualFile` */
  contents(): Promise<string>
  /** Return the contents of this `VirtualFile` */
  contentsSync(): string

  /** Return a `RawSourceMap` associated with this `VirtualFile` if any */
  sourceMap(): Promise<RawSourceMap | undefined>
  /** Return a `RawSourceMap` associated with this `VirtualFile` if any */
  sourceMapSync(): RawSourceMap | undefined

  /** Return a `VirtualFile` whose path is relative to this one */
  get(path: string): VirtualFile

  /** Return this same `VirtualFile` in another with a different file system */
  clone(files: VirtualFileList): VirtualFile
}

/**
 * The `VirtualFileList` interface represents an extremely simple view over
 * the _physical_ file system where a number of `VirtualFile`s can be accessed.
 */
export interface VirtualFileList {
  /** The base directory of this `VirtualFileList` */
  readonly directoryPath: DirectoryPath,

  /** Return a `VirtualFile` associated with this `VirtualFileList` */
  get(path: string): VirtualFile

  /** Return all `VirtualFile`s this `VirtualFileList` was build with */
  list(): readonly VirtualFile[]

  /** Create a new `VirtualFileListBuilder` */
  builder(path?: string): VirtualFileListBuilder

  /** Add a `VirtualFile` to this `VirtualFileList` */
  add(file: VirtualFile): VirtualFile
  /** Add a `VirtualFile` to this `VirtualFileList` */
  add(path: string): VirtualFile
  /** Add a `VirtualFile` with the specified contents to this `VirtualFileList` */
  add(path: string, contents: string): VirtualFile
  /** Add a `VirtualFile` with the specified contents and source map to this `VirtualFileList` */
  add(path: string, contents: string, sourceMap: RawSourceMap): VirtualFile
  /**
   * Add a `VirtualFile` with the specified contents to this `VirtualFileList`.
   *
   * When `sourceMap` is `true` (default) the source map of the virtual file
   * will be read parsing the contents specified.
   */
  add(path: string, contents: string, sourceMap: boolean): VirtualFile
}

/**
 * The `VirtualFileListBuilder` interface represents a _builder_ for a
 * `VirtualFileList`.
 */
export interface VirtualFileListBuilder {
  /** Add a `VirtualFile` to the `VirtualFileList` */
  add(file: VirtualFile): this
  /** Add a `VirtualFile` to the `VirtualFileList` */
  add(path: string): this
  /** Add a `VirtualFile` with the specified contents to the `VirtualFileList` */
  add(path: string, contents: string): this
  /** Add a `VirtualFile` with the specified contents and source map to the `VirtualFileList` */
  add(path: string, contents: string, sourceMap: RawSourceMap): this
  /**
   * Add a `VirtualFile` with the specified contents to the `VirtualFileList`.
   *
   * When `sourceMap` is `true` (default) the source map of the virtual file
   * will be read parsing the contents specified.
   */
  add(path: string, contents: string, sourceMap: boolean): this

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
