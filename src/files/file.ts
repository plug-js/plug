import { AbstractFile } from './abstract'
import { FilePath } from '../utils/paths'
import { extractSourceMap } from '../source-maps'
import { makeLog } from '../utils/log'

import { File, Files } from './index'
import { FileSourceMap, SourceMapV3 } from '../source-maps'
import { promises as fs, readFileSync, statSync } from 'fs'

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

const log = makeLog()

/* Internal type associating content and an (optional) source map */
type FileData = {
  contents: string,
  lastModified: number,
  sourceMap: FileSourceMap | FilePath | null,
}

interface FileImplOptions {
  originalPath?: FilePath,
  sourceMap?: boolean | SourceMapV3,
  contents?: string,
}

function parseContentsForSourceMap(file: File, code: string, lastModified: number): FileData {
  const { contents, sourceMap, sourceMapFile } = extractSourceMap(file.absolutePath, code, true)
  if (sourceMapFile) {
    return { contents, lastModified, sourceMap: sourceMapFile }
  } else if (sourceMap) {
    return { contents, lastModified, sourceMap: new FileSourceMap(file.absolutePath, sourceMap) }
  } else {
    return { contents, lastModified, sourceMap: null }
  }
}

/* Implementation of the File interface */
export class FileImpl extends AbstractFile implements File {
  #data?: FileData
  #promise?: Promise<FileData>

  constructor(
      files: Files,
      absolutePath: FilePath,
      options: FileImplOptions = {},
  ) {
    super(files, absolutePath, options.originalPath)

    const { contents, sourceMap: sourceMapSource = true } = options

    if (contents !== undefined) {
      const lastModified = Date.now()
      if (sourceMapSource === true) { // parse the source map
        this.#data = parseContentsForSourceMap(this, contents, lastModified)
      } else if (sourceMapSource !== false) {
        const sourceMap = new FileSourceMap(absolutePath, sourceMapSource)
        this.#data = { lastModified, contents, sourceMap }
      } else {
        this.#data = { lastModified, contents, sourceMap: null }
      }
    }
  }

  /* ======================================================================== *
   * INTERNAL READING FUNCTIONS                                               *
   * ======================================================================== */

  #readSync(): FileData {
    if (this.#data) return this.#data

    const code = readFileSync(this.originalPath, 'utf8')
    const lastModified = statSync(this.originalPath).mtimeMs
    return this.#data = parseContentsForSourceMap(this, code, lastModified)
  }

  #read(): Promise<FileData> {
    if (this.#promise) return this.#promise
    if (this.#data) return this.#promise = Promise.resolve(this.#data)

    return this.#promise = (async (): Promise<FileData> => {
      const code = await fs.readFile(this.originalPath, 'utf8')
      const lastModified = (await fs.stat(this.originalPath)).mtimeMs
      return this.#data = parseContentsForSourceMap(this, code, lastModified)
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

  sourceMapSync(): FileSourceMap | undefined {
    const data = this.#readSync()

    if (typeof data.sourceMap === 'string') {
      const sourceMapFile = this.files.get(data.sourceMap)
      try {
        const sourceMapContents = sourceMapFile.contentsSync()
        const sourceMap = JSON.parse(sourceMapContents)
        data.sourceMap = new FileSourceMap(this.absolutePath, sourceMap)
      } catch (error) {
        log.debug(`Error source map for "${this.absolutePath}" from "${sourceMapFile}"`)
        data.sourceMap = null
      }
    }

    return data.sourceMap || undefined
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

  async sourceMap(): Promise<FileSourceMap | undefined> {
    const data = await this.#read()

    if (typeof data.sourceMap === 'string') {
      const sourceMapFile = this.files.get(data.sourceMap)
      try {
        const sourceMapContents = await sourceMapFile.contents()
        const sourceMap = JSON.parse(sourceMapContents)
        data.sourceMap = new FileSourceMap(this.absolutePath, sourceMap)
      } catch (error) {
        log.debug(`Error source map for "${this.absolutePath}" from "${sourceMapFile}"`)
        data.sourceMap = null
      }
    }

    return data.sourceMap || undefined
  }
}
