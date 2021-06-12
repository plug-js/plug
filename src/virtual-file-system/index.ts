import { RawSourceMap } from 'source-map'
import { VirtualFileSystemImpl } from './internal'

/** An absolute path always starts from "/" */
export type AbsolutePath = string & {
  __brand_absolute_path: any
}

/** The path relative to the base directory */
export type RelativePath = string & {
  __brand_relative_path: any
}

/**
 * The `VirtualFile` interface represents a file in a `VirtualFileSystem`.
 */
export interface VirtualFile {
  /** The `VirtualFileSystem` associated with this `VirtualFile` */
  readonly fileSystem: VirtualFileSystem
  /** The _absolute_ path of this `VirtualFile` */
  readonly absolutePath: AbsolutePath
  /** The path of this `VirtualFile` relative to its `VirtualFileSystem`'s `baseDir` */
  readonly relativePath: RelativePath
  /** The _canonical_ path of this `VirtualFile` (dependant on filesystem case sensitivity) */
  readonly canonicalPath: AbsolutePath
  /** The last modified timestamp of this `VirtualFile` */
  readonly lastModified: number

  /** Checks if this `VirtualFile` exists (its `contents()` can be accessed) */
  exists(): Promise<boolean>
  /** Checks if this `VirtualFile` exists (its `contents()` can be accessed) */
  existsSync(): boolean

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
}

/**
 * The `VirtualFileSystem` interface represents an extremely simple view over
 * the _physical_ file system where a number of `VirtualFile`s can be accessed.
 */
export interface VirtualFileSystem {
  /** The base directory of this `VirtualFileSystem` */
  readonly baseDir: AbsolutePath,
  /** Whether the file system is case sensitive or not */
  readonly caseSensitive: boolean,

  /** Return a `VirtualFile` associated with this `VirtualFileSystem` */
  get(path: string): VirtualFile

  /** Return all `VirtualFile`s this `VirtualFileSystem` was build with */
  list(): Readonly<VirtualFile[]>

  /** Create a new `VirtualFileSystemBuilder` */
  builder(path?: string): VirtualFileSystemBuilder
}

/**
 * The `VirtualFileSystemBuilder` interface represents a _builder_ for a
 * `VirtualFileSystem`.
 */
export interface VirtualFileSystemBuilder {
  /** Add a `VirtualFile` to the `VirtualFileSystem` */
  add(path: string): this
  /** Add a `VirtualFile` with the specified contents to the `VirtualFileSystem` */
  add(path: string, contents: string): this
  /**
   * Add a `VirtualFile` with the specified contents to the `VirtualFileSystem`.
   *
   * When `sourceMap` is `true` (default) the source map of the virtual file
   * will be read parsing the contents specified.
   */
  add(path: string, contents: string, sourceMap: boolean): this
  /** Add a `VirtualFile` with the specified contents and source map to the `VirtualFileSystem` */
  add(path: string, contents: string, sourceMap: RawSourceMap): this

  /** Return the `VirtualFileSystem` instance being built */
  build(): VirtualFileSystem
}

/* Internal type declaring the constructor of a `VirtualFileSystem` */
type VirtualFileSystemConstructor = {
  new(path?: string): VirtualFileSystem
  builder(path?: string): VirtualFileSystemBuilder
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const VirtualFileSystem: VirtualFileSystemConstructor = VirtualFileSystemImpl
