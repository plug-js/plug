import { Files } from '../files'
import { Log } from '../utils/log'
import { Run } from '../run'
import { SourceMapOptions } from '../source-maps/source-map'

import { FilePath, getParent } from '../utils/paths'
import { Plug, install } from '../pipe'
import { mkdir, writeFile } from 'fs/promises'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    save: PlugExtension<P, typeof SavePlug>
  }
}

interface SaveOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * external file (`true`), or not generated at all (`false`)
   *
   * @default 'inline'
   */
  sourceMaps?: 'inline' | boolean

  /**
   * The `sourceRoot` to inject in source maps
   *
   * @default undefined
   */
  sourceRoot?: string

  /**
   * Whether to combine source maps resulting from multiple transformation
   * stages or not
   *
   * @default true
   */
  combineSourceMaps?: boolean

  /**
   * Whether to attach the original sources the the source maps.
   *
   * @default false
   */
   attachSources?: boolean

  /**
   * The encoding used to write files.
   *
   * @default 'utf8'
   */
  encoding?: BufferEncoding
}

export class SavePlug implements Plug {
  #encoding: BufferEncoding
  #sourceMapOptions: SourceMapOptions
  #sourceMaps: 'inline' | boolean
  #sourceRoot?: string

  #directory?: string

  constructor(directory?: string)
  constructor(options?: SaveOptions)
  constructor(directory: string, options?: SaveOptions)
  constructor(first?: string | SaveOptions, extra?: SaveOptions) {
    // Destructure our arguments
    const { directory, options = {} } =
        typeof first === 'string' ? { directory: first, options: extra } :
            first ? { directory: undefined, options: first } :
                { directory: undefined }

    // Directory is quite easy...
    this.#directory = directory

    // Other options with defaults...
    const {
      sourceMaps = 'inline',
      sourceRoot = undefined,
      combineSourceMaps = true,
      attachSources = false,
      encoding = 'utf8',
    } = options

    // Setup what we need
    this.#encoding = encoding
    this.#sourceMaps = sourceMaps
    this.#sourceRoot = sourceRoot
    this.#sourceMapOptions = { attachSources, combineSourceMaps: combineSourceMaps }
  }

  /** The function used for writing files (mainly for testing) */
  async write(file: FilePath, contents: Buffer): Promise<void> {
    const directory = getParent(file)
    await mkdir(directory, { recursive: true })
    await writeFile(file, contents)
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const output = new Files(run)

    for (const file of input) {
      if (this.#sourceMaps) {
        const fileSourceMap = await file.sourceMap()
        const sourceMap = fileSourceMap?.produceSourceMap(this.#sourceMapOptions)
        void sourceMap
      }
    }

    log.debug('Written a total of', output.length)
    return output
  }
}

export const save = install('save', SavePlug)
