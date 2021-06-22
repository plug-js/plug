import { RawSourceMap } from 'source-map'
import { basename } from 'path'
import { File, Files } from '../files'
import { FilePath, RelativeFilePath, getRelativeFilePath, resolveFilePath } from '../utils/paths'

export class FileSourceMap {
  readonly file!: FilePath

  readonly #sources: readonly FilePath[] = []
  readonly #names: readonly string[] = []
  readonly #mappings: string = ''
  #sourcesContent?: File[]

  private constructor(file: FilePath, data: RawSourceMap) {
    Object.defineProperty(this, 'file', { enumerable: true, value: file })

    if (data && (typeof data === 'object') && data.version) {
      // sometimes version is a string, and only accept version 3
      const version = typeof data.version === 'string' ? parseInt(data.version) : data.version
      if (version !== 3) return

      this.#sources = Array.isArray(data.sources) ?
          data.sources.map((source: any) => {
            return (typeof source === 'string') ?
                resolveFilePath(file, source as RelativeFilePath) :
                '' as FilePath
          }): []
      this.#names = Array.isArray(data.names) ?
          data.names.map((name: any) => {
            return (typeof name === 'string') ? name : ''
          }): []
      this.#mappings = typeof data.mappings === 'string' ? data.mappings : ''
    }
  }

  attachSources(files?: Files): this {
    if (files) this.#sourcesContent = this.#sources.map((file) => files.get(file))
    return this
  }

  async produceSourceMap(attachSources?: boolean): Promise<RawSourceMap> {
    void attachSources

    return {
      version: 3,
      file: basename(this.file),
      sources: this.#sources.map((source) => getRelativeFilePath(this.file, source)),
      names: [ ...this.#names ],
      mappings: this.#mappings,
    }
  }

  static for(file: FilePath, data: RawSourceMap): FileSourceMap | undefined {
    if (data && (typeof data === 'object') && data.version) {
      // sometimes version is a string, and only accept version 3
      const version = typeof data.version === 'string' ? parseInt(data.version) : data.version
      if (version === 3) return new FileSourceMap(file, data)
    }
  }
}
