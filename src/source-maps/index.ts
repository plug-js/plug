import { basename } from 'path'
import { File, Files } from '../files'
import { FilePath, RelativeFilePath, getRelativeFilePath, resolveFilePath } from '../utils/paths'

export interface SourceMapV3 {
  /** The version for source maps, always `3` */
  version: 3
  /**
   * The optional (file) name of the generated code that this source map
   * is associated with.
   *
   * While this is an _optional_ entry in the specification, we always
   * require it in this interface.
   */
  file: string

  /**
   * An optional source root, useful for relocating source files on a
   * server or removing repeated values in the `sources` entry.
   *
   * This value is simply prepended to the individual entries in the `sources`
   * field and the spec doesn't say whether this is a path, URL, ...
   */
  sourceRoot?: string
  /**
   * The list of original sources used by the `mappings`.
   *
   * A list of paths relative to the file where this source map is written
   * to pointing to the original files with the original sources contents.
   */
  sources: string[]
  /**
   * A list of `string`s containing the contents of the original files.
   *
   * This array (if present) must have the same length of the `sources`
   * array, and `null` should be used if contents for a particular source
   * are not available.
   */
  sourcesContent?: (string | null)[]
  /** A list of symbol names used by the “mappings” entry. */
  names: string[]
  /** A string with the encoded mapping data. */
  mappings: string
}

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

  attachSources(files: Files): void {
    this.#sourcesContent = this.#sources.map((file) => files.get(file))
  }

  async produceSourceMap(attachSources?: boolean): Promise<SourceMapV3> {
    const sourceMap: SourceMapV3 = {
      version: 3,
      file: basename(this.file),
      sources: this.#sources.map((source) => getRelativeFilePath(this.file, source)),
      names: [ ...this.#names ],
      mappings: this.#mappings,
    }

    if (attachSources && this.#sourcesContent) {
      const promises = this.#sourcesContent.map((sourceFile) =>
        sourceFile.contents().catch(() => null))
      sourceMap.sourcesContent = await Promise.all(promises)
    }

    return sourceMap
  }
}
