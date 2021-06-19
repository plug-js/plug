import { RawSourceMap } from 'source-map'
import { AbsolutePath } from '../utils/paths'
import { AbstractFile } from './abstract'
import { Files } from './files'
import { File } from './index'

export class FileWrapper extends AbstractFile implements File {
  #file: File

  constructor(files: Files, file: File, path: AbsolutePath = file.absolutePath) {
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
