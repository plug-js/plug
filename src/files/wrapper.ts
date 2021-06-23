import { AbstractFile } from './abstract'
import { File } from './index'
import { FilePath } from '../utils/paths'
import { FileSourceMap } from '../source-maps'
import { Files } from './files'

export class FileWrapper extends AbstractFile implements File {
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
