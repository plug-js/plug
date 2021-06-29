import type { FilePath } from '../utils/paths'
import { extractSourceMap, FileSourceMap } from './sourcemap'

import { File } from './file'
import { RawSourceMap } from 'source-map'
import { Files } from './files'

export class VirtualFile extends File {
  #files: Files
  #contents: string
  #sourceMap?: FileSourceMap
  #sourceMapFile?: FilePath

  constructor(
      files: Files,
      path: FilePath,
      contents: string,
      sourceMap: RawSourceMap | boolean,
      originalFile?: File,
  ) {
    super(path, originalFile)
    this.#files = files

    if (typeof sourceMap === 'object') {
      this.#sourceMap = new FileSourceMap(path, files, sourceMap)
      this.#contents = contents
    } else if (sourceMap === true) {
      const { contents: code, sourceMap, sourceMapFile } = extractSourceMap(path, files, contents)
      this.#contents = code
      this.#sourceMap = sourceMap
      this.#sourceMapFile = sourceMapFile
    } else {
      this.#contents = contents
    }
  }

  async contents(): Promise<string> {
    return this.#contents
  }

  contentsSync(): string {
    return this.#contents
  }

  async sourceMap(): Promise<FileSourceMap | undefined> {
    // If we have a source map already return it
    if (this.#sourceMap) return this.#sourceMap

    // If we don't have a source map file, pointless to proceed
    if (! this.#sourceMapFile) return

    // See if we can _access_ the source map file, otherwise wipe and return
    const sourceMapFile = this.#files.get(this.#sourceMapFile)
    if (! sourceMapFile) return this.#sourceMapFile = undefined

    // Read the source map file contents, parse it, cache it, and return
    const sourceMap = JSON.parse(await sourceMapFile.contents())
    this.#sourceMap = new FileSourceMap(this.#sourceMapFile, this.#files, sourceMap)
    return this.#sourceMap
  }
}
