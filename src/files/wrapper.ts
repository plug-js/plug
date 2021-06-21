import { AbstractFile } from './abstract'
import { File } from './index'
import { FilePath } from '../utils/paths'
import { Files } from './files'
import { RawSourceMap } from 'source-map'

export class FileWrapper extends AbstractFile implements File {
  #file: File

  constructor(files: Files, file: File, path: FilePath = file.absolutePath) {
    super(files, path, file.originalPath)
    this.#file = file
  }

  exists(): Promise<boolean> {
    return this.#file.exists()
  }

  existsSync(): boolean {
    return this.#file.existsSync()
  }

  lastModified(): Promise<number> {
    return this.#file.lastModified()
  }

  lastModifiedSync(): number {
    return this.#file.lastModifiedSync()
  }

  contents(): Promise<string> {
    return this.#file.contents()
  }

  contentsSync(): string {
    return this.#file.contentsSync()
  }

  sourceMap(): Promise<RawSourceMap | undefined> {
    return this.#file.sourceMap()
  }

  sourceMapSync(): RawSourceMap | undefined {
    return this.#file.sourceMapSync()
  }
}
