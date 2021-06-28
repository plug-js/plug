import type { FilePath } from '../utils/paths'
import type { FileSourceMap } from '../sourcemaps'

import { File } from './file'
import { assert } from 'console'

export class FileWrapper extends File {
  #file: File

  constructor(file: File, path: FilePath) {
    super(path, file)
    assert(file.absolutePath != path, `Wrapping file with same path "${path}"`)
    this.#file = file
  }

  contents(): Promise<string> {
    return this.#file.contents()
  }

  contentsSync(): string {
    return this.#file.contentsSync()
  }

  sourceMap(): Promise<FileSourceMap | undefined> {
    return this.#file.sourceMap()
  }
}
