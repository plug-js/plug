import type { Files } from './files'
import type { FilePath } from '../utils/paths'

import { File } from './file'
import { FileSourceMap, extractSourceMap } from './sourcemap'
import { log } from '../utils/log'
import { readFileSync } from 'fs'
import { readFile } from '../utils/asyncfs'
import { RawSourceMap } from 'source-map'
import assert from 'assert'

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Implementation of the File interface */
export class SimpleFile extends File {
  #files: Files
  #sourceMap: FileSourceMap | FilePath | true | undefined

  #contents?: string
  #promise?: Promise<string>

  constructor(
      files: Files,
      absolutePath: FilePath,
      sourceMap: boolean | RawSourceMap,
  ) {
    super(absolutePath)
    this.#files = files

    // Process contents and related source map
    if (typeof sourceMap === 'boolean') { // parse the source map
      this.#sourceMap = sourceMap || undefined
    } else {
      this.#sourceMap = new FileSourceMap(absolutePath, files, sourceMap)
    }
  }

  /* ======================================================================== *
   * INTERNAL READING FUNCTIONS                                               *
   * ======================================================================== */

  #processContents(data: string): string {
    assert(this.#contents === undefined, `Contents for "${this.absolutePath}" already processed`)

    if (this.#sourceMap === true) {
      const { contents, sourceMap, sourceMapFile } = extractSourceMap(this.absolutePath, this.#files, data)
      this.#sourceMap =
        sourceMap ? sourceMap : // we have an inline sourcemap, just keep it
        sourceMapFile ? sourceMapFile : // will parse an external sourcemap
        undefined // no sourcemapping url found in the code
      this.#contents = contents
    } else {
      this.#contents = data
    }

    return this.#contents
  }


  /* ======================================================================== *
   * CONTENTS                                                                 *
   * ======================================================================== */

  contentsSync(): string {
    if (this.#contents !== undefined) return this.#contents

    const contents = readFileSync(this.absolutePath, 'utf8')
    return this.#processContents(contents)
  }

  contents(): Promise<string> {
    if (this.#promise) return this.#promise
    if (this.#contents !== undefined) {
      return this.#promise = Promise.resolve(this.#contents)
    }

    return this.#promise = Promise.resolve().then(async () => {
      const contents = await readFile(this.absolutePath, 'utf8')
      return this.#processContents(contents)
    })
  }

  /* ======================================================================== *
   * SOURCEMAP                                                     *
   * ======================================================================== */

  async sourceMap(): Promise<FileSourceMap | undefined> {
    // If we have a source map, or should not get one just exit quickly
    if (typeof this.#sourceMap === 'object') return this.#sourceMap
    if (this.#sourceMap === undefined) return undefined

    // If our source map is still "true" then we'll have to extract by reading
    if (this.#sourceMap === true) await this.contents()
    assert(this.#sourceMap !== true, `Source map for "${this.absolutePath}" not extracted`)

    // We could have extracted a file path to an external source map
    if (typeof this.#sourceMap === 'string') {
      const file = this.#files.get(this.#sourceMap)
      if (file) {
        const json = await file.contents()
        const data = JSON.parse(json)
        this.#sourceMap = new FileSourceMap(file.absolutePath, this.#files, data)
      } else {
        log.alert(`External source map file "${this.#sourceMap}" for "${this.absolutePath}" not found`)
        this.#sourceMap = undefined
      }
    }

    // Done
    return this.#sourceMap
  }
}
