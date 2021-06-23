import type { FilePath } from '../utils/paths'
import type { Files } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import type { SourceMapsOptions } from './sourcemaps'

import { SourceMapsPlug } from './sourcemaps'
import { getParent } from '../utils/paths'
import { install } from '../pipe'
import { mkdir, writeFile } from 'fs/promises'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    save: PlugExtension<P, typeof SavePlug>
  }
}

export interface SaveOptions extends SourceMapsOptions {
  /**
   * The encoding used to write files.
   *
   * @default 'utf8'
   */
   encoding?: BufferEncoding
}

export class SavePlug extends SourceMapsPlug implements Plug {
  #encoding: BufferEncoding
  #directory?: string

  constructor(directory?: string)
  constructor(options?: SaveOptions)
  constructor(directory: string, options?: SaveOptions)
  constructor(first?: string | SaveOptions, extra?: SaveOptions) {
    super(typeof first === 'string' ? extra : first)

    // Destructure our arguments
    const { directory, options } =
        typeof first === 'string' ? { directory: first, options: extra } :
            first ? { directory: undefined, options: first } :
                { directory: undefined, options: undefined }

    // Let's build us up
    this.#encoding = options?.encoding || 'utf8'
    this.#directory = directory
  }

  /** The function used for writing files (mainly for testing) */
  async write(file: FilePath, contents: Buffer): Promise<void> {
    const directory = getParent(file)
    await mkdir(directory, { recursive: true })
    await writeFile(file, contents)
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    void log
    return input
  }
}

export const save = install('save', SavePlug)
