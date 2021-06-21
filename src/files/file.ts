import { AbstractFile } from './abstract'
import { FilePath } from '../utils/paths'
import { RawSourceMap } from 'source-map'
import { extractSourceMap } from '../utils/source-maps'

import { File, Files } from './index'
import { promises as fs, readFileSync, statSync } from 'fs'

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Internal type associating content and an (optional) source map */
type FileData = { contents: string, lastModified: number, sourceMapFile?: string }

interface FileImplOptions {
  originalPath?: FilePath,
  sourceMap?: boolean | RawSourceMap,
  contents?: string,
}

/* Implementation of the File interface */
export class FileImpl extends AbstractFile implements File {
  #data?: FileData
  #promise?: Promise<FileData>
  #sourceMap?: RawSourceMap | false

  constructor(
      files: Files,
      absolutePath: FilePath,
      options: FileImplOptions = {},
  ) {
    super(files, absolutePath, options.originalPath)

    const { contents, sourceMap = true } = options

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

  /* ======================================================================== *
   * INTERNAL READING FUNCTIONS                                               *
   * ======================================================================== */

  #readSourceMapData(contents: string, lastModified: number): FileData {
    const sourceMapData = extractSourceMap(this.originalPath, contents, true)
    if (sourceMapData) {
      this.#data = { lastModified, ...sourceMapData }
      this.#sourceMap = sourceMapData.sourceMap
    } else {
      this.#data = { lastModified, contents }
      this.#sourceMap = false
    }
    return this.#data
  }

  #readSync(): FileData {
    if (this.#data) return this.#data

    const code = readFileSync(this.originalPath, 'utf8')
    const lastModified = statSync(this.originalPath).mtimeMs
    return this.#readSourceMapData(code, lastModified)
  }

  #read(): Promise<FileData> {
    if (this.#promise) return this.#promise
    if (this.#data) return this.#promise = Promise.resolve(this.#data)

    return this.#promise = (async (): Promise<FileData> => {
      const code = await fs.readFile(this.originalPath, 'utf8')
      const lastModified = (await fs.stat(this.originalPath)).mtimeMs
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
      return false
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
      return false
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
