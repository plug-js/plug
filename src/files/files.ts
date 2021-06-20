import assert from 'assert'
import { FileImpl } from './file'

import {
  File,
  FileOptions,
} from './index'

import {
  CanonicalPath,
  DirectoryPath,
  getAbsolutePath,
  getCanonicalPath,
  getDirectoryPath,
  isChild,
} from '../utils/paths'
import { FileWrapper } from './wrapper'
import { isAbsolute } from 'path'

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
  #files = new Map<CanonicalPath, File>()

  /** The base directory of this `Files` instance */
  readonly directory: DirectoryPath

  /**
   * Create a new `Files` instance at the specified directory.
   *
   * If the path was not specified the default `getProjectDirectory()` will
   * be used.
   */
  constructor(directory: DirectoryPath) {
    assert(isAbsolute(directory), `Not an absolute directory: "${directory}"`)
    this.directory = directory
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
    const canonicalPath = getCanonicalPath(absolutePath)
    return this.#files.has(canonicalPath)
  }

  /** Clone this `Files` instance preserving all files listed by it */
  clone(path?: string): Files {
    const directory = getDirectoryPath(this.directory, path)
    const list = new Files(directory)

    for (const file of this.#cache.values()) {
      const wrapped = new FileWrapper(list, file)
      list.#cache.set(wrapped.canonicalPath, wrapped)

      // Preserve file list
      if (this.#files.has(file.canonicalPath) && isChild(list.directory, file.absolutePath)) {
        list.#files.set(wrapped.canonicalPath, wrapped)
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

  add(first: string | File, extra?: File | FileOptions): File {
    // Destructure our arguments
    const { path, file, options } =
        typeof first === 'string' ?
            extra !== undefined ?
                'files' in extra ?
                    { path: first, file: extra, options: undefined } :
                    { path: first, file: undefined, options: extra } :
                { path: first, file: undefined, options: undefined } :
            { path: undefined, file: first, options: undefined }

    // Compute the target absolute path, this is either from the path specified
    // as an argument, or from the _relative_ path of the original file...
    const absolutePath =
        path ? getAbsolutePath(this.directory, path) :
        file ? getAbsolutePath(this.directory, file.relativePath) :
        undefined
    assert(absolutePath, 'No path for file to be added')
    assert(isChild(this.directory, absolutePath), `Refusing to add file "${absolutePath}" to "${this.directory}"`)

    // Don't recreate if the file is already ours and has the correct path
    if (file && (file.files === this) && (file.absolutePath === absolutePath)) {
      this.#cache.set(file.canonicalPath, file)
      this.#files.set(file.canonicalPath, file)
      return file
    }

    // Create a new file
    let newFile: File
    if (options && options.originalPath) {
      const originalPath = getAbsolutePath(this.directory, options.originalPath)
      newFile = new FileImpl(this, absolutePath, { ...options, originalPath })
    } else if (options) {
      newFile = new FileImpl(this, absolutePath, { ...options, originalPath: undefined })
    } else if (file) {
      newFile = new FileWrapper(this, file, absolutePath)
    } else {
      newFile = new FileImpl(this, absolutePath)
    }

    // Cache, add and return the new file
    this.#cache.set(newFile.canonicalPath, newFile)
    this.#files.set(newFile.canonicalPath, newFile)
    return newFile
  }
}
