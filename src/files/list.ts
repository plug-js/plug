import { RawSourceMap } from 'source-map'
import { VirtualFile, VirtualFileList, VirtualFileListBuilder } from './index'

import {
  CanonicalPath,
  DirectoryPath,
  getCanonicalPath,
  getAbsolutePath,
  getCurrentDirectoryPath,
  getDirectoryPath,
} from '../utils/paths'
import { VirtualFileImpl } from './file'

/* ========================================================================== *
 * VIRTUAL FILE LIST IMPLEMENTATION                                           *
 * ========================================================================== */

export class VirtualFileListImpl implements VirtualFileList {
  #cache = new Map<CanonicalPath, VirtualFile>()
  #files = [] as VirtualFile[]

  readonly directoryPath: DirectoryPath

  constructor(path?: string) {
    const currentDirectory = getCurrentDirectoryPath()
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

  list(): readonly VirtualFile[] {
    return [ ...this.#files ]
  }

  builder(path?: string): VirtualFileListBuilder {
    const directory = getDirectoryPath(this.directoryPath, path)
    return VirtualFileListImpl.builder(directory)
  }

  add(pathOrFile: string | VirtualFile, contents?: string, sourceMap?: boolean | RawSourceMap): VirtualFile {
    let file = undefined as VirtualFile | undefined
    if (typeof pathOrFile === 'string') {
      const absolutePath = getAbsolutePath(this.directoryPath, pathOrFile)
      file = new VirtualFileImpl(this, absolutePath, contents, sourceMap)
    } else {
      file = pathOrFile.files === this ? pathOrFile : pathOrFile.clone(this)
    }

    this.#cache.set(file.canonicalPath, file)
    this.#files.push(file)
    return file
  }

  static builder(path?: string): VirtualFileListBuilder {
    let files = new VirtualFileListImpl(path) as VirtualFileListImpl | undefined

    return {
      add(pathOrFile: string | VirtualFile, contents?: string, sourceMap?: boolean | RawSourceMap) {
        if (! files) throw new Error('Virtual file list already built')
        files.add(pathOrFile, contents, sourceMap)
        return this
      },

      build() {
        if (! files) throw new Error('Virtual file list already built')
        const built = files
        files = undefined
        return built
      },
    }
  }
}
