import type { Files } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import { SourceMapOptions, writeSourceMap, WriteSourceMapOptions } from '../files/sourcemap'

import { install } from '../pipe'
import { parallelize } from '../utils/parallelize'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    sourcemaps: PlugExtension<P, typeof SourceMapsPlug>
  }
}

export interface SourceMapsOptions extends SourceMapOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * external file (`external`), or stripped entirely (`none`)
   *
   * @default 'inline'
   */
  sourceMaps?: 'inline' | 'external' | 'none'
}

export class SourceMapsPlug implements Plug {
  #options: WriteSourceMapOptions

  constructor(options: WriteSourceMapOptions = {}) {
    this.#options = options
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const output = input.fork()
    const time = log.start()

    await parallelize(input, async (file) => {
      const outputs = await writeSourceMap(file, file.absolutePath, this.#options)
      for (const [ path, contents ] of outputs) {
        output.add(path, { contents, sourceMap: false })
      }
    })

    log.debug('Processed source maps for', input.length, 'files in', time)
    return output
  }
}

export const sourcemaps = install('sourcemaps', SourceMapsPlug)
