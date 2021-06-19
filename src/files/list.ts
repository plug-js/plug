import assert from 'assert'
import { FileImpl } from './file'
import { getProjectDirectory } from '../project'

import {
  File,
  Files,
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

export class FilesImpl implements Files {
  #cache = new Map<CanonicalPath, File>()
  #files = new Map<AbsolutePath, File>()

  readonly directoryPath: DirectoryPath

  constructor(path?: string) {
    const currentDirectory = getProjectDirectory()
    this.directoryPath = getDirectoryPath(currentDirectory, path)
  }

  get(path: string): File {
    const absolutePath = getAbsolutePath(this.directoryPath, path)
    const canonicalPath = getCanonicalPath(absolutePath)

    const cached = this.#cache.get(canonicalPath)
    if (cached) return cached

    const file = new FileImpl(this, absolutePath)
    this.#cache.set(file.canonicalPath, file)
    return file
  }

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

  has(path: string): boolean {
    const absolutePath = getAbsolutePath(this.directoryPath, path)
    return this.#files.has(absolutePath)
  }

  clone(path?: string): Files {
    const directory = getDirectoryPath(this.directoryPath, path)
    const list = new FilesImpl(directory)

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

  add(pathOrFile: string | File, options?: File | FileOptions): File {
    let file = undefined as File | undefined

    if (typeof pathOrFile === 'string') {
      if (options && ('fileList' in options)) {
        file = options.clone(this, pathOrFile)
      } else if (options) {
        const { originalPath: original, contents, sourceMap } = options
        const absolutePath = getAbsolutePath(this.directoryPath, pathOrFile)
        const originalPath = original ? getAbsolutePath(this.directoryPath, original) : undefined
        file = new FileImpl(this, absolutePath, { contents, sourceMap, originalPath })
      } else {
        const absolutePath = getAbsolutePath(this.directoryPath, pathOrFile)
        file = new FileImpl(this, absolutePath)
      }
    } else {
      file = pathOrFile.clone(this)
    }

    // Never add outside of our target directory!
    assert(isChild(this.directoryPath, file.absolutePath),
        `Refusing to add file "${file.absolutePath}" to "${this.directoryPath}"`)

    this.#cache.set(file.canonicalPath, file)
    this.#files.set(file.absolutePath, file)
    return file
  }
}
