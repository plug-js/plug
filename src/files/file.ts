import { RawSourceMap } from 'source-map'
import { File, Files } from './index'
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
type FileData = { contents: string, lastModified: number, sourceMapFile?: string }

interface FileImplOptions {
  originalPath?: AbsolutePath,
  sourceMap?: boolean | RawSourceMap,
  contents?: string,
}

/* Implementation of the File interface */
export class FileImpl implements File {
  readonly files!: Files
  readonly absolutePath!: AbsolutePath
  readonly originalPath!: AbsolutePath

  #data?: FileData
  #promise?: Promise<FileData>
  #sourceMap?: RawSourceMap | false

  constructor(
      fileList: Files,
      absolutePath: AbsolutePath,
      options: FileImplOptions = {},
  ) {
    const { contents, originalPath = absolutePath, sourceMap = true } = options

    Object.defineProperties(this, {
      'files': { enumerable: false, value: fileList },
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
    return getRelativePath(this.files.directory, this.absolutePath)
  }

  get canonicalPath(): CanonicalPath {
    return getCanonicalPath(this.absolutePath)
  }

  get(path: string): File {
    const directory = getDirectory(this.absolutePath)
    const absolutePath = getAbsolutePath(directory, path)
    return this.files.get(absolutePath)
  }

  // TODO: I don't like this method as the resulting file is not cached...
  clone(files: Files, path?: string): File {
    // The absolute path of the target file is resolved agains the target list
    const absolutePath = getAbsolutePath(files.directory, path || this.relativePath)
    // If there are no changes we simply return this file...
    if ((this.files === files) && (absolutePath === this.absolutePath)) return this

    // Clone and return this file
    const file = new FileImpl(files, absolutePath, { originalPath: this.originalPath })
    file.#sourceMap = this.#sourceMap
    file.#promise = this.#promise
    file.#data = this.#data
    return file
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
