import { VirtualFileImpl } from './file'
import { getProjectDirectory } from '../project'

import {
  VirtualFile,
  VirtualFileList,
  VirtualFileOptions,
} from './index'

import {
  AbsolutePath,
  CanonicalPath,
  DirectoryPath,
  getAbsolutePath,
  getCanonicalPath,
  getDirectoryPath,
} from '../utils/paths'

/* ========================================================================== *
 * VIRTUAL FILE LIST IMPLEMENTATION                                           *
 * ========================================================================== */

export class VirtualFileListImpl implements VirtualFileList {
  #cache = new Map<CanonicalPath, VirtualFile>()
  #files = new Map<AbsolutePath, VirtualFile>()

  readonly directoryPath: DirectoryPath

  constructor(path?: string) {
    const currentDirectory = getProjectDirectory()
    this.directoryPath = getDirectoryPath(currentDirectory, path)
  }

  get(path: string): VirtualFile {
    const absolutePath = getAbsolutePath(this.directoryPath, path)
    const canonicalPath = getCanonicalPath(absolutePath)

    const cached = this.#cache.get(canonicalPath)
    if (cached) return cached

    const file = new VirtualFileImpl(this, absolutePath)
    this.#cache.set(file.canonicalPath, file)
    return file
  }

  list(): VirtualFile[] {
    // Return an array whose default "sort" works on absolute paths
    const list = [ ...this.#files.values() ]
    list.sort = function(compare?) {
      if (! compare) compare = (a, b) => a.absolutePath.localeCompare(b.absolutePath)
      return Array.prototype.sort.call(this, compare)
    }
    return list
  }

  has(path: string): boolean {
    const absolutePath = getAbsolutePath(this.directoryPath, path)
    return this.#files.has(absolutePath)
  }

  clone(path?: string): VirtualFileList {
    const directory = getDirectoryPath(this.directoryPath, path)
    const list = new VirtualFileListImpl(directory)

    for (const file of this.#cache.values()) {
      const clone = file.clone(list)
      list.#cache.set(clone.canonicalPath, clone)

      // Preserve file list
      if (this.#files.has(file.absolutePath)) {
        list.#files.set(clone.absolutePath, clone)
      }
    }

    return list
  }

  add(pathOrFile: string | VirtualFile, options?: VirtualFile | VirtualFileOptions): VirtualFile {
    let file = undefined as VirtualFile | undefined

    if (typeof pathOrFile === 'string') {
      if (options && ('fileList' in options)) {
        file = options.clone(this, pathOrFile)
      } else if (options) {
        const { originalPath: original, contents, sourceMap } = options
        const absolutePath = getAbsolutePath(this.directoryPath, pathOrFile)
        const originalPath = original ? getAbsolutePath(this.directoryPath, original) : undefined
        file = new VirtualFileImpl(this, absolutePath, { contents, sourceMap, originalPath })
      } else {
        const absolutePath = getAbsolutePath(this.directoryPath, pathOrFile)
        file = new VirtualFileImpl(this, absolutePath)
      }
    } else {
      file = pathOrFile.clone(this)
    }

    this.#cache.set(file.canonicalPath, file)
    this.#files.set(file.absolutePath, file)
    return file
  }
}
