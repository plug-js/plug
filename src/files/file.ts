import { RawSourceMap } from 'source-map'
import { VirtualFile, VirtualFileList } from './index'
import { extractSourceMap } from '../utils/source-maps'

import {
  promises as fs,
  readFileSync,
  statSync,
} from 'fs'

import {
  AbsolutePath,
  RelativePath,
  CanonicalPath,
  getRelativePath,
  getCanonicalPath,
  getAbsolutePath,
  getDirectory,
} from '../utils/paths'

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Internal type associating content and an (optional) source map */
type VirtualFileData = { contents: string, lastModified: number, sourceMapFile?: string }

interface VirtualFileImplOptions {
  originalPath?: AbsolutePath,
  sourceMap?: boolean | RawSourceMap,
  contents?: string,
}

/* Implementation of the VirtualFile interface */
export class VirtualFileImpl implements VirtualFile {
  readonly fileList!: VirtualFileList
  readonly absolutePath!: AbsolutePath
  readonly originalPath!: AbsolutePath

  #data?: VirtualFileData
  #promise?: Promise<VirtualFileData>
  #sourceMap?: RawSourceMap | false

  constructor(
      fileList: VirtualFileList,
      absolutePath: AbsolutePath,
      options: VirtualFileImplOptions = {},
  ) {
    const { contents, originalPath = absolutePath, sourceMap = true } = options

    Object.defineProperties(this, {
      'fileList': { enumerable: false, value: fileList },
      'absolutePath': { enumerable: true, value: absolutePath },
      'originalPath': { enumerable: true, value: originalPath },
    })

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
    return getRelativePath(this.fileList.directoryPath, this.absolutePath)
  }

  get canonicalPath(): CanonicalPath {
    return getCanonicalPath(this.absolutePath)
  }

  get(path: string): VirtualFile {
    const directory = getDirectory(this.absolutePath)
    const absolutePath = getAbsolutePath(directory, path)
    return this.fileList.get(absolutePath)
  }

  clone(files: VirtualFileList): VirtualFile {
    const { absolutePath, originalPath } = this
    const file = new VirtualFileImpl(files, absolutePath, { originalPath })
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

    const file = this.fileList.get(sourceMapFile)
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

    const file = this.fileList.get(sourceMapFile)
    if (! await file.exists()) return

    return this.#sourceMap = JSON.parse(await file.contents())
  }
}
