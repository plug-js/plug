import { RawSourceMap } from 'source-map'
import { VirtualFile, VirtualFileSystem, VirtualFileSystemBuilder } from './index'
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
  readonly fileSystem: VirtualFileSystem
  readonly absolutePath: AbsolutePath
  readonly relativePath: RelativePath
  readonly canonicalPath: CanonicalPath

  #promise?: Promise<VirtualFileData>
  #data?: VirtualFileData
  #sourceMap?: RawSourceMap | false

  constructor(
      fileSystem: VirtualFileSystem,
      absolutePath: AbsolutePath,
      contents: string | undefined = undefined,
      sourceMap: boolean | RawSourceMap = true,
  ) {
    const relativePath = getRelativePath(fileSystem.directoryPath, absolutePath)
    const canonicalPath = getCanonicalPath(absolutePath)

    this.fileSystem = fileSystem
    this.absolutePath = absolutePath
    this.relativePath = relativePath
    this.canonicalPath = canonicalPath

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

  get(path: string): VirtualFile {
    const directory = getDirectory(this.absolutePath)
    const absolutePath = getAbsolutePath(directory, path)
    return this.fileSystem.get(absolutePath)
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

    const file = this.fileSystem.get(sourceMapFile)
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

    const file = this.fileSystem.get(sourceMapFile)
    if (! await file.exists()) return

    return this.#sourceMap = JSON.parse(await file.contents())
  }
}

/* ========================================================================== *
 * VIRTUAL FILE SYSTEM IMPLEMENTATION                                         *
 * ========================================================================== */

export class VirtualFileSystemImpl implements VirtualFileSystem {
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

  list(): Readonly<VirtualFile[]> {
    return [ ...this.#files ]
  }

  builder(path?: string): VirtualFileSystemBuilder {
    const directory = getDirectoryPath(this.directoryPath, path)
    return VirtualFileSystemImpl.builder(directory)
  }

  static builder(path?: string): VirtualFileSystemBuilder {
    let fileSystem = new VirtualFileSystemImpl(path) as VirtualFileSystemImpl | undefined

    return {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      add(path: string, contents?: string, sourceMap?: boolean | RawSourceMap) {
        if (! fileSystem) throw new Error('Virtual file system already built')

        const absolutePath = getAbsolutePath(fileSystem.directoryPath, path)
        const file = new VirtualFileImpl(fileSystem, absolutePath, contents, sourceMap)
        fileSystem.#cache.set(file.canonicalPath, file)
        fileSystem.#files.push(file)
        return this
      },

      build(): VirtualFileSystem {
        if (! fileSystem) throw new Error('Virtual file system already built')
        const builtFileSystem = fileSystem
        fileSystem = undefined
        return builtFileSystem
      },
    }
  }
}
