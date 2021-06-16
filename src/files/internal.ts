import { RawSourceMap } from 'source-map'
import { VirtualFile, VirtualFileList, VirtualFileListBuilder } from './index'
import { readFileSync, statSync, promises as fs } from 'fs'
import { extractSourceMap } from '../utils/source-maps'

import {
  AbsolutePath,
  RelativePath,
  CanonicalPath,
  DirectoryPath,
  getRelativePath,
  getCanonicalPath,
  getAbsolutePath,
  getCurrentDirectoryPath,
  getDirectoryPath,
  getDirectory,
} from '../utils/paths'

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Internal type associating content and an (optional) source map */
type VirtualFileData = { contents: string, lastModified: number, sourceMapFile?: string }

class VirtualFileImpl implements VirtualFile {
  readonly files: VirtualFileList
  readonly absolutePath: AbsolutePath

  #promise?: Promise<VirtualFileData>
  #data?: VirtualFileData
  #sourceMap?: RawSourceMap | false

  constructor(
      files: VirtualFileList,
      absolutePath: AbsolutePath,
      contents: string | undefined = undefined,
      sourceMap: boolean | RawSourceMap = true,
  ) {
    this.files = files
    this.absolutePath = absolutePath

    if (contents != undefined) {
      const lastModified = Date.now()
      if (sourceMap === true) {
        this.#readSourceMapData(contents, lastModified)
      } else {
        this.#data = { lastModified, contents }
        this.#sourceMap = sourceMap
      }
    }
  }

  get relativePath(): RelativePath {
    return getRelativePath(this.files.directoryPath, this.absolutePath)
  }

  get canonicalPath(): CanonicalPath {
    return getCanonicalPath(this.absolutePath)
  }

  get(path: string): VirtualFile {
    const directory = getDirectory(this.absolutePath)
    const absolutePath = getAbsolutePath(directory, path)
    return this.files.get(absolutePath)
  }

  clone(files: VirtualFileList): VirtualFile {
    const file = new VirtualFileImpl(files, this.absolutePath)
    file.#sourceMap = this.#sourceMap
    file.#promise = this.#promise
    file.#data = this.#data
    return file
  }

  /* ======================================================================== *
   * INTERNAL READING FUNCTIONS                                               *
   * ======================================================================== */

  #readSourceMapData(contents: string, lastModified: number): VirtualFileData {
    const sourceMapData = extractSourceMap(this.absolutePath, contents, true)
    if (sourceMapData) {
      this.#data = { lastModified, ...sourceMapData }
      this.#sourceMap = sourceMapData.sourceMap
    } else {
      this.#data = { lastModified, contents }
      this.#sourceMap = false
    }
    return this.#data
  }

  #readSync(): VirtualFileData {
    if (this.#data) return this.#data

    const code = readFileSync(this.absolutePath, 'utf8')
    const lastModified = statSync(this.absolutePath).mtimeMs
    return this.#readSourceMapData(code, lastModified)
  }

  #read(): Promise<VirtualFileData> {
    if (this.#promise) return this.#promise
    if (this.#data) return this.#promise = Promise.resolve(this.#data)

    return this.#promise = (async (): Promise<VirtualFileData> => {
      const code = await fs.readFile(this.absolutePath, 'utf8')
      const lastModified = (await fs.stat(this.absolutePath)).mtimeMs
      return this.#readSourceMapData(code, lastModified)
    })()
  }

  /* ======================================================================== *
   * SYNCHRONOUS IMPLEMENTATION                                               *
   * ======================================================================== */

  existsSync(): boolean {
    try {
      return !! (this.#data || this.#readSync())
    } catch (error) {
      if (error.code === 'ENOENT') return false
      throw error
    }
  }

  lastModifiedSync(): number {
    return this.#readSync().lastModified
  }

  contentsSync(): string {
    return this.#readSync().contents
  }

  sourceMapSync(): RawSourceMap | undefined {
    if (this.#sourceMap === false) return undefined
    if (this.#sourceMap) return this.#sourceMap

    const sourceMapFile = this.#readSync().sourceMapFile
    // istanbul ignore if - when we have no file, this.#sourceMap is false
    if (! sourceMapFile) return

    const file = this.files.get(sourceMapFile)
    if (! file.existsSync()) return

    return this.#sourceMap = JSON.parse(file.contentsSync())
  }

  /* ======================================================================== *
   * ASYNC IMPLEMENTATION                                                     *
   * ======================================================================== */

  async exists(): Promise<boolean> {
    try {
      return !! (this.#data || await this.#read())
    } catch (error) {
      if (error.code === 'ENOENT') return false
      throw error
    }
  }

  async lastModified(): Promise<number> {
    return this.#data ? this.#data.lastModified : (await this.#read()).lastModified
  }

  async contents(): Promise<string> {
    return this.#data ? this.#data.contents : (await this.#read()).contents
  }

  async sourceMap(): Promise<RawSourceMap | undefined> {
    if (this.#sourceMap === false) return undefined
    if (this.#sourceMap) return this.#sourceMap
    const sourceMapFile = (await this.#read()).sourceMapFile
    // istanbul ignore if - when we have no file, this.#sourceMap is false
    if (! sourceMapFile) return

    const file = this.files.get(sourceMapFile)
    if (! await file.exists()) return

    return this.#sourceMap = JSON.parse(await file.contents())
  }
}

/* ========================================================================== *
 * VIRTUAL FILE SYSTEM IMPLEMENTATION                                         *
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
        if (! files) throw new Error('Virtual file system already built')
        files.add(pathOrFile, contents, sourceMap)
        return this
      },

      build() {
        if (! files) throw new Error('Virtual file system already built')
        const builtFileSystem = files
        files = undefined
        return builtFileSystem
      },
    }
  }
}
