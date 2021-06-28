import assert from 'assert'

import { File } from './file'
import { SimpleFile } from './simple'
import { FileWrapper } from './wrapper'
import { createFilePath, getCanonicalPath, isChild } from '../utils/paths'

import type { CanonicalPath, DirectoryPath } from '../utils/paths'
import type { FileOptions } from './index'
import type { Run } from '../run'
import { VirtualFile } from './virtual'
import { statSync } from 'fs'

/* ========================================================================== *
 * VIRTUAL FILE LIST IMPLEMENTATION                                           *
 * ========================================================================== */

/**
 * The `Files` class represents an extremely simple view over the _physical_
 * filesystem where a number of `File`s can be listed and accessed.
 */
export class Files {
  // Internal cache of all previously seen files
  #cache = new Map<CanonicalPath, File>()
  // Internal list of all files added to this list
  #files = new Map<CanonicalPath, File>()

  /** The base directory of this `Files` instance */
  readonly directory!: DirectoryPath
  /** The parent `Files` instance of this */
  readonly parent?: Files

  /**
   * Create a new `Files` instance associated with the specified `Project`.
   */
  private constructor(arg: DirectoryPath | Files) {
    const directory = typeof arg === 'string' ? arg : arg.directory
    const parent = typeof arg === 'string' ? undefined : arg
    Object.defineProperties(this, {
      directory: { enumerable: true, value: directory },
      parent: { enumerable: false, value: parent },
    })
  }

  static for(run: Run): Files {
    return new Files(run.project.directory)
  }

  fork(): Files {
    return new Files(this)
  }

  /* ======================================================================== *
   * GETTING FILES                                                            *
   * ======================================================================== */

  /** Return a `File` associated with this `Files` list */
  get(path: string): File | undefined {
    const absolutePath = createFilePath(this.directory, path)
    const canonicalPath = getCanonicalPath(absolutePath)

    const cached = this.#cache.get(canonicalPath)
    if (cached) return cached

    if (this.parent) {
      const file = this.parent.get(path)
      if (file) this.#cache.set(file.canonicalPath, file)
      return file
    }

    try {
      const stat = statSync(absolutePath)
      if (! stat.isFile()) return undefined
      const file = new SimpleFile(this, absolutePath, true)
      this.#cache.set(file.canonicalPath, file)
      return file
    } catch (error) {
      return undefined
    }
  }

  /* ======================================================================== *
   * ADDING FILES                                                             *
   * ======================================================================== */

  /** Add a `File` to this `Files` instance */
  add(file: File): File
  /** Add a `File` to this `Files` instance with a new path */
  add(path: string, file: File): File

  /** Add a `File` to this `Files` instance */
  add(path: string): File
  /** Add a `File` to this `Files` instance */
  add(path: string, options?: FileOptions): File
  /** Add a `File` to this `Files` instance */
  add(path: string, contents?: string): File

  add(first: string | File, extra?: string | File | FileOptions): File {
    // Destructure our arguments
    const { path, file, options } =
        typeof first === 'string' ?
            typeof extra === 'string' ?
              { path: first, file: undefined, options: { contents: extra } } :
            extra !== undefined ?
                extra instanceof File ?
                    { path: first, file: extra, options: undefined } :
                    { path: first, file: undefined, options: extra } :
                { path: first, file: undefined, options: undefined } :
            { path: undefined, file: first, options: undefined }

    // Compute the target absolute path, this is either from the path specified
    // as an argument, or from the _relative_ path of the original file...
    const absolutePath =
        path ? createFilePath(this.directory, path) :
        file ? file.absolutePath :
        undefined
    assert(absolutePath, 'No path for file to be added')
    assert(isChild(this.directory, absolutePath), `Refusing to add file "${absolutePath}" to "${this.directory}"`)

    // Create a new file
    let newFile: File
    if (options) {
      const { contents, originalFile, sourceMap = true } = options
      newFile = new VirtualFile(this, absolutePath, contents, sourceMap, originalFile)
    } else if (file && (file.absolutePath !== absolutePath)) {
      newFile = new FileWrapper(file, absolutePath)
    } else if (file) {
      newFile = file
    } else {
      const file = this.get(absolutePath)
      if (! file) throw new Error(`File "${absolutePath}" not found`)
      newFile = file
    }

    // Cache, add and return the new file
    this.#cache.set(newFile.canonicalPath, newFile)
    this.#files.set(newFile.canonicalPath, newFile)
    return newFile
  }

  /* ======================================================================== *
   * LISTING FILES                                                            *
   * ======================================================================== */

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

  /* ======================================================================== *
   * PSEUDO-ARRAY OF FILES                                                    *
   * ======================================================================== */

  /** Create an `IterableIterator` over all `File`s listed by this instance */
  [Symbol.iterator](): IterableIterator<File> {
    return this.#files.values()
  }

  /** Return the number of `File`s listed by this instance */
  get length(): number {
    return this.#files.size
  }

  /** Invoke the given call back function for each file listed by this */
  forEach(callback: (value: File) => void, thisArg?: any): void {
    for (const file of this) callback.call(thisArg, file)
  }

  /** Map each file listed by this according to the given callback function */
  map<U>(callback: (value: File) => U, thisArg?: any): U[] {
    const result: U[] = []
    for (const file of this) result.push(callback.call(thisArg, file))
    return result
  }

  /** Checks whether this `Files` instance was added the given path */
  has(path: string): boolean {
    const absolutePath = createFilePath(this.directory, path)
    const canonicalPath = getCanonicalPath(absolutePath)
    return this.#files.has(canonicalPath)
  }
}
