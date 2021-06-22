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

  constructor(file: FilePath, data: Record<string, any>) {
    Object.defineProperty(this, 'file', { value: file })

    if (data && (typeof data === 'object') && (parseInt(data.version) === 3)) {
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

  attachSources(files?: Files): void {
    if (files) this.#sourcesContent = this.#sources.map((file) => files.get(file))
  }

  async produceSourceMap(attachSources?: boolean): Promise<RawSourceMap> {
    const sourceMap: RawSourceMap = {
      version: 3,
      file: basename(this.file),
      sources: this.#sources.map((source) => getRelativeFilePath(this.file, source)),
      names: [ ...this.#names ],
      mappings: this.#mappings,
    }

    if (attachSources && this.#sourcesContent) {
      const promises = this.#sourcesContent.map((sourceFile) =>
        sourceFile.contents().catch(() => null as any as string))
      sourceMap.sourcesContent = await Promise.all(promises)
    }

    return sourceMap
  }
}
