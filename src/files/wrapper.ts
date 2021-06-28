import type { FilePath } from '../utils/paths'
import type { FileSourceMap } from '../sourcemaps'

import { File } from './file'

export class FileWrapper extends File {
  #file: File
  #sourceMap?: FileSourceMap

  constructor(file: File, path: FilePath = file.absolutePath) {
    super(path, file.originalPath)
    this.#file = file
  }

  contents(): Promise<string> {
    return this.#file.contents()
  }

  contentsSync(): string {
    return this.#file.contentsSync()
  }

  async sourceMap(): Promise<FileSourceMap | undefined> {
    if (this.#sourceMap) return this.#sourceMap
    if (this.absolutePath === this.#file.absolutePath) {
      return this.#sourceMap = await this.#file.sourceMap()
    } else {
      const sourceMap = await this.#file.sourceMap()
      return this.#sourceMap = sourceMap?.with(this.absolutePath)
    }
  }

  sourceMapSync(): FileSourceMap | undefined {
    if (this.#sourceMap) return this.#sourceMap
    if (this.absolutePath === this.#file.absolutePath) {
      return this.#sourceMap = this.#file.sourceMapSync()
    } else {
      const sourceMap = this.#file.sourceMapSync()
      return this.#sourceMap = sourceMap?.with(this.absolutePath)
    }
  }
}
