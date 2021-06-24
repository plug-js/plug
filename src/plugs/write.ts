import assert from 'assert'

import type { DirectoryPath } from '../utils/paths'
import type { File } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import type { SourceMapsOptions } from './sourcemaps'

import { Files } from '../files'
import { SourceMapsPlug } from './sourcemaps'
import { createDirectoryPath, createFilePath, isChild } from '../utils/paths'
import { getParent } from '../utils/paths'
import { install } from '../pipe'
import { mkdir, writeFile } from 'fs/promises'
import { parallelize } from '../utils/parallelize'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    write: PlugExtension<P, typeof WritePlug>
  }
}

export interface WriteOptions extends SourceMapsOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * external file (`external`), not processed at all (`none`)
   *
   * This alters the behavior of `SourceMapsPlug`, because when `none` is
   * specified, rather than _stripping_ we do no processin at all.
   *
   * @default 'inline'
   */
   sourceMaps?: 'inline' | 'external' | 'none'

   /**
   * The encoding used to write files.
   *
   * @default 'utf8'
   */
   encoding?: BufferEncoding
}

export class WritePlug extends SourceMapsPlug implements Plug {
  #encoding: BufferEncoding
  #directory?: string

  constructor(directory?: string)
  constructor(options?: WriteOptions)
  constructor(directory: string, options?: WriteOptions)
  constructor(first?: string | WriteOptions, extra?: WriteOptions) {
    super(typeof first === 'string' ? extra : first)

    // Destructure our arguments
    const { directory, options = {} } =
        typeof first === 'string' ? { directory: first, options: extra } :
            first ? { directory: undefined, options: first } :
                { directory: undefined }

    // Let's build us up
    this.#encoding = options.encoding || 'utf8'
    this.#directory = directory
  }

  /** The function used for writing files (mainly for testing) */
  async write(file: File, directory: DirectoryPath, log: Log): Promise<void> {
    const path = createFilePath(directory, file.relativePath)
    await mkdir(getParent(path), { recursive: true })
    await writeFile(path, await file.contents(), this.#encoding)
    log.trace(`Written "${path}"`)
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const now = Date.now()

    // Resolve our target directory, check it's a child of our input directory
    // (never write outside our designated area) and create it...
    const directory = this.#directory ?
        createDirectoryPath(input.directory, this.#directory) : input.directory
    assert(isChild(input.directory, directory) || (directory === input.directory),
        `Refusing to write to "${directory}", not a child of "${input.directory}"`)
    await mkdir(directory, { recursive: true })

    // Slightly different process if we have source maps or not
    if (this.sourceMaps) {
      // If we have source maps to write the output will be different: we might
      // have extra files (the external source maps) and the content will most
      // likely change (the source mapping URL is added)
      const output = new Files(input)
      await parallelize(input, async (file) => {
        const added = await this.processFile(file, log, output)
        return parallelize(added, (file) => this.write(file, directory, log))
      })
      log.debug('Written', output.length, 'files in', Date.now() - now, 'ms')
      return output
    } else {
      // When no source map processing is done, just write, nothing else...
      await parallelize(input, (file) => this.write(file, directory, log))
      log.debug('Written', input.length, 'files in', Date.now() - now, 'ms')
      return input
    }
  }
}

export const write = install('write', WritePlug)
