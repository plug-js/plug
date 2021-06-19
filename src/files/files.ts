import assert from 'assert'
import { FileImpl } from './file'
import { getProjectDirectory } from '../project'

import {
  File,
  FileOptions,
} from './index'

import {
  AbsolutePath,
  CanonicalPath,
  DirectoryPath,
  getAbsolutePath,
  getCanonicalPath,
  getDirectoryPath,
  isChild,
} from '../utils/paths'

/* ========================================================================== *
 * VIRTUAL FILE LIST IMPLEMENTATION                                           *
 * ========================================================================== */

/**
 * The `Files` class represents an extremely simple view over the _physical_
 * filesystem where a number of `File`s can be listed and accessed.
 */
export class Files implements Files {
  // Internal cache of all previously seen files
  #cache = new Map<CanonicalPath, File>()
  // Internal list of all files added to this list
  #files = new Map<AbsolutePath, File>()

  /** The base directory of this `Files` instance */
  readonly directory: DirectoryPath

  /**
   * Create a new `Files` instance at the specified directory.
   *
   * If the path was not specified the default `getProjectDirectory()` will
   * be used.
   */
  constructor(path?: string) {
    const currentDirectory = getProjectDirectory()
    this.directory = getDirectoryPath(currentDirectory, path)
  }

  /** Return a `File` associated with this `Files` list */
  get(path: string): File {
    const absolutePath = getAbsolutePath(this.directory, path)
    const canonicalPath = getCanonicalPath(absolutePath)

    const cached = this.#cache.get(canonicalPath)
    if (cached) return cached

    const file = new FileImpl(this, absolutePath)
    this.#cache.set(file.canonicalPath, file)
    return file
  }

  /** Return all `File`s previously _added_ to this `Files` instance */
  list(): File[] {
    // Create the new array
    const list = [ ...this.#files.values() ]

    // Inject the sort property (typed)
    list.sort = function(compare?) {
      if (! compare) compare = (a, b) => a.absolutePath.localeCompare(b.absolutePath)
      return Array.prototype.sort.call(this, compare)
    }

    // Make sure it's not enumerable
    Object.defineProperty(list, 'sort', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: list.sort,
    })

    // Return our list
    return list
  }

  /** Checks whether this `Files` instance was added the given path */
  has(path: string): boolean {
    const absolutePath = getAbsolutePath(this.directory, path)
    return this.#files.has(absolutePath)
  }

  /** Clone this `Files` instance preserving all files listed by it */
  clone(path?: string): Files {
    const directory = getDirectoryPath(this.directory, path)
    const list = new Files(directory)

    for (const file of this.#cache.values()) {
      const clone = file.clone(list, file.absolutePath)
      list.#cache.set(clone.canonicalPath, clone)

      // Preserve file list
      if (this.#files.has(file.absolutePath)) {
        list.#files.set(clone.absolutePath, clone)
      }
    }

    return list
  }

  /** Add a `File` to this `Files` instance */
  add(file: File): File
  /** Add a `File` to this `Files` instance with a new path */
  add(path: string, file: File): File
  /** Add a `File` to this `Files` instance */
  add(path: string, options?: FileOptions): File

  add(pathOrFile: string | File, options?: File | FileOptions): File {
    let file = undefined as File | undefined

    if (typeof pathOrFile === 'string') {
      if (options && ('files' in options)) {
        file = options.clone(this, pathOrFile)
      } else if (options) {
        const { originalPath: original, contents, sourceMap } = options
        const absolutePath = getAbsolutePath(this.directory, pathOrFile)
        const originalPath = original ? getAbsolutePath(this.directory, original) : undefined
        file = new FileImpl(this, absolutePath, { contents, sourceMap, originalPath })
      } else {
        const absolutePath = getAbsolutePath(this.directory, pathOrFile)
        file = new FileImpl(this, absolutePath)
      }
    } else {
      file = pathOrFile.clone(this)
    }

    // Never add outside of our target directory!
    assert(isChild(this.directory, file.absolutePath),
        `Refusing to add file "${file.absolutePath}" to "${this.directory}"`)

    this.#cache.set(file.canonicalPath, file)
    this.#files.set(file.absolutePath, file)
    return file
  }
}
