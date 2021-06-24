import type { FilePath } from '../utils/paths'
import type { FileSourceMap } from '../sourcemaps'
import type { Files } from './files'

import { File } from './file'

export class FileWrapper extends File {
  #file: File

  constructor(files: Files, file: File, path: FilePath = file.absolutePath) {
    super(files, path, file.originalPath)
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

  sourceMapSync(): FileSourceMap | undefined {
    return this.#file.sourceMapSync()
  }
}
