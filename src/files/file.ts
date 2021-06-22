import { AbstractFile } from './abstract'
import { FilePath } from '../utils/paths'
import { FileSourceMap } from '../source-maps'
import { extractSourceMap } from '../source-maps'
import { log } from '../utils/log'

import { File, FileOptions, Files } from './index'
import { promises as fs, readFileSync, statSync } from 'fs'

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Internal type associating content and an (optional) source map */
type FileData = {
  contents: string,
  lastModified: number,
  sourceMap?: FileSourceMap | FilePath,
}

function parseContentsForSourceMap(
    file: File,
    code: string,
    sourceMapSources: Files | undefined,
    lastModified: number,
): FileData {
  const { contents, sourceMap, sourceMapFile } = extractSourceMap(file.absolutePath, code, true)
  if (sourceMap) {
    if (sourceMapSources) sourceMap.attachSources(sourceMapSources)
    return { contents, lastModified, sourceMap }
  } else if (sourceMapFile) {
    return { contents, lastModified, sourceMap: sourceMapFile }
  } else {
    return { contents, lastModified }
  }
}

/* Implementation of the File interface */
export class FileImpl extends AbstractFile implements File {
  #data?: FileData
  #promise?: Promise<FileData>
  #sourceMapSources?: Files

  constructor(
      files: Files,
      absolutePath: FilePath,
      options: FileOptions = {},
  ) {
    super(files, absolutePath, options.originalPath)

    const {
      contents,
      sourceMapSources,
      sourceMap: sourceMapSource = true,
    } = options

    // Remember the source map sources for this file's sitemap
    this.#sourceMapSources = sourceMapSources

    // Process contents and related source map
    if (contents !== undefined) {
      const lastModified = Date.now()
      if (sourceMapSource === true) { // parse the source map
        this.#data = parseContentsForSourceMap(this, contents, sourceMapSources, lastModified)
      } else if (sourceMapSource !== false) {
        const sourceMap = FileSourceMap.for(absolutePath, sourceMapSource, sourceMapSources)
        this.#data = { lastModified, contents, sourceMap: sourceMap }
      } else {
        this.#data = { lastModified, contents }
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
    return this.#data = parseContentsForSourceMap(this, code, this.#sourceMapSources, lastModified)
  }

  #read(): Promise<FileData> {
    if (this.#promise) return this.#promise
    if (this.#data) return this.#promise = Promise.resolve(this.#data)

    return this.#promise = (async (): Promise<FileData> => {
      const code = await fs.readFile(this.originalPath, 'utf8')
      const lastModified = (await fs.stat(this.originalPath)).mtimeMs
      return this.#data = parseContentsForSourceMap(this, code, this.#sourceMapSources, lastModified)
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
        data.sourceMap = FileSourceMap.for(this.absolutePath, sourceMap, this.#sourceMapSources)
      } catch (error) {
        log.alert(`Error reading source map for "${this.absolutePath}" from "${sourceMapFile.absolutePath}"`)
        log.debug(error)
        delete data.sourceMap
      }
    }

    return data.sourceMap
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
        data.sourceMap = FileSourceMap.for(this.absolutePath, sourceMap, this.#sourceMapSources)
      } catch (error) {
        log.alert(`Error reading source map for "${this.absolutePath}" from "${sourceMapFile.absolutePath}"`)
        log.debug(error)
        delete data.sourceMap
      }
    }

    return data.sourceMap
  }
}
