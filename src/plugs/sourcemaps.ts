import type { File } from '../files'
import type { FilePath } from '../utils/paths'
import type { Files } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import type { SourceMapOptions } from '../files/sourcemap'

import { install } from '../pipe'
import { parallelize } from '../utils/parallelize'
import { appendSourceMap } from '../sourcemaps'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    sourcemaps: PlugExtension<P, typeof SourceMapsPlug>
  }
}

export interface SourceMapsOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * external file (`external`), or stripped entirely (`none`)
   *
   * @default 'inline'
   */
  sourceMaps?: 'inline' | 'external' | 'none'

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
}

export class SourceMapsPlug implements Plug {
  protected readonly sourceMaps: 'inline' | 'external' | undefined

  #sourceMapOptions: SourceMapOptions
  #sourceRoot?: string

  constructor(options: SourceMapsOptions = {}) {
    // Other options with defaults...
    const {
      sourceMaps = 'inline',
      sourceRoot = undefined,
      combineSourceMaps = true,
      attachSources = false,
    } = options

    // Setup what we need
    this.sourceMaps = sourceMaps === 'none' ? undefined : sourceMaps
    this.#sourceRoot = sourceRoot
    this.#sourceMapOptions = { attachSources, combineSourceMaps: combineSourceMaps }
  }

  protected async processFile(from: File, path: FilePath, files: Files): Promise<File[]> {
    if (this.sourceMaps) {
      // produce the _real_ sourcemap, combining, attaching, ...
      const fileSourceMap = await from.sourceMap()
      const sourceMap = await fileSourceMap?.produceSourceMap(path, this.#sourceMapOptions)

      if (sourceMap) {
        if (this.sourceMaps === 'inline') {
          const [ contents ] = appendSourceMap(path, await from.contents(), sourceMap, true, this.#sourceRoot)
          return [ files.add(path, { contents, sourceMap, originalFile: from }) ] // TODO: fileSourceMaps should have no "file"
        } else if (this.sourceMaps === 'external') {
          const [ contents, mapContents ] = appendSourceMap(path, await from.contents(), sourceMap, false, this.#sourceRoot)
          return [
            files.add(path + '.map', { contents: mapContents }),
            files.add(path, { contents, sourceMap, originalFile: from }),
          ]
        }
      }
    }

    return [ files.add(path, from) ]
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const output = input.fork()
    const time = log.start()

    await parallelize(input, (file) =>
      this.processFile(file, file.absolutePath, output))

    log.debug('Processed source maps for', input.length, 'files in', time)
    return output
  }
}

export const sourcemaps = install('sourcemaps', SourceMapsPlug)
