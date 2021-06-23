import { FileImpl } from './file'
import { FileWrapper } from './wrapper'
import { Project } from '../project'
import { Run } from '../run'
import assert from 'assert'
import {
  CanonicalPath,
  DirectoryPath,
  RelativeFilePath,
  getCanonicalPath,
  isChild,
  resolvePath,
} from '../utils/paths'
import { File, FileOptions } from './index'

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
  readonly directory!: DirectoryPath
  /** The `Project` associated with this `Files` instance */
  readonly project!: Project

  /**
   * Create a new `Files` instance associated with the specified `Project`.
   */
  constructor(run: Run)
  constructor(files: Files)
  constructor(project: Project)
  constructor(arg: Files | Project | Run) {
    const directory: DirectoryPath = arg.directory
    const project: Project = 'project' in arg ? arg.project : arg
    Object.defineProperties(this, {
      directory: { enumerable: true, value: directory },
      project: { enumerable: false, value: project },
    })
  }

  /** Return the number of `File`s listed by this instance */
  get length(): number {
    return this.#files.size
  }

  /** Create an `IterableIterator` over all `File`s listed by this instance */
  [Symbol.iterator](): IterableIterator<File> {
    return this.#files.values()
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

  /** Return a `File` associated with this `Files` list */
  get(path: string): File {
    const absolutePath = resolvePath(this.directory, path as RelativeFilePath)
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
    const absolutePath = resolvePath(this.directory, path as RelativeFilePath)
    const canonicalPath = getCanonicalPath(absolutePath)
    return this.#files.has(canonicalPath)
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
        path ? resolvePath(this.directory, path as RelativeFilePath) :
        file ? resolvePath(this.directory, file.relativePath) :
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
    if (options) {
      newFile = new FileImpl(this, absolutePath, options)
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
