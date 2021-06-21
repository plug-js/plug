import { Files } from '../files'
import { Plug, install } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    save: PlugExtension<P, typeof SavePlug>
  }
}

interface SaveOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * `external` file, or `none` to remove all source mapping data.
   *
   * @default 'inline'
   */
  sourceMaps?: 'inline' | 'external' | 'none'
  /**
   * Source maps will always be available, use `save(...)` to write them */
  sourceMapRoot?: undefined
}

export class SavePlug implements Plug {
  constructor(directory?: string)
  constructor(options?: SaveOptions)
  constructor(directory: string, options?: SaveOptions)
  constructor(first?: string | SaveOptions, extra?: SaveOptions) {
    void first
    void extra
  }

  async process(files: Files): Promise<Files> {
    // for (const file of files) {
    //   const originalSourceMap = await file.sourceMap()
    //   const sourceMap: RawSourceMap = {
    //     version: 3,

    //   }
    //   sourceMap.
    // }
    return files
  }
}

export const save = install('save', SavePlug)
