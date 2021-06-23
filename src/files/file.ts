import { AbstractFile } from './abstract'
import { Failure } from '../failure'
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
  sourceMap?: FileSourceMap | FilePath,
}

function parseContentsForSourceMap(
    file: File,
    code: string,
    sourceMapSources: Files | undefined,
): FileData {
  const { contents, sourceMap, sourceMapFile } = extractSourceMap(file.absolutePath, code, true)
  if (sourceMap) {
    if (sourceMapSources) sourceMap.attachSources(sourceMapSources)
    return { contents, sourceMap }
  } else if (sourceMapFile) {
    return { contents, sourceMap: sourceMapFile }
  } else {
    return { contents }
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
      options?: FileOptions,
  ) {
    super(files, absolutePath, options ? options.originalPath : undefined)

    // Process contents and related source map
    if (options) {
      const { contents, sourceMap = true, sourceMapSources } = options
      this.#sourceMapSources = sourceMapSources

      if (sourceMap === true) { // parse the source map
        this.#data = parseContentsForSourceMap(this, contents, sourceMapSources)
      } else if (sourceMap !== false) {
        const fileSourceMap = FileSourceMap.for(absolutePath, sourceMap, sourceMapSources)
        this.#data = { contents, sourceMap: fileSourceMap }
      } else {
        this.#data = { contents }
      }
    } else {
      let stat
      try {
        stat = statSync(absolutePath)
      } catch (error) {
        throw new Failure(`File "${absolutePath}" not found`)
      }
      if (! stat.isFile()) throw new Failure(`File "${absolutePath}" not found`)
    }
  }

  /* ======================================================================== *
   * INTERNAL READING FUNCTIONS                                               *
   * ======================================================================== */

  #readSync(): FileData {
    if (this.#data) return this.#data

    const code = readFileSync(this.originalPath, 'utf8')
    return this.#data = parseContentsForSourceMap(this, code, this.#sourceMapSources)
  }

  #read(): Promise<FileData> {
    if (this.#promise) return this.#promise
    if (this.#data) return this.#promise = Promise.resolve(this.#data)

    return this.#promise = Promise.resolve()
        .then(() => fs.readFile(this.originalPath, 'utf8'))
        .then((content) => this.#data = parseContentsForSourceMap(this, content, this.#sourceMapSources))
        .catch((error) => {
          // No idea why sometimes stacks don't have a trace when coming out of
          // the "fs.promises" api... There is a _stack_ property on the object
          // but it simply includes the first line, no whatsoever trace???
          Error.captureStackTrace(error)
          throw error
        })
  }

  /* ======================================================================== *
   * SYNCHRONOUS IMPLEMENTATION                                               *
   * ======================================================================== */

  contentsSync(): string {
    return this.#readSync().contents
  }

  sourceMapSync(): FileSourceMap | undefined {
    const data = this.#readSync()

    if (typeof data.sourceMap === 'string') {
      const sourceMapFile = this.files.get(data.sourceMap)
      if (! sourceMapFile) {
        log.alert(`External source map "${data.sourceMap}" for "${this.absolutePath}" not found`)
        return
      }
      // TODO: unwrap this try/catch
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

  async contents(): Promise<string> {
    return this.#data ? this.#data.contents : (await this.#read()).contents
  }

  async sourceMap(): Promise<FileSourceMap | undefined> {
    const data = await this.#read()

    if (typeof data.sourceMap === 'string') {
      const sourceMapFile = this.files.get(data.sourceMap)
      if (! sourceMapFile) {
        log.alert(`External source map "${data.sourceMap}" for "${this.absolutePath}" not found`)
        return
      }
      // TODO: unwrap this try/catch
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
