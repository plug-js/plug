import assert from 'assert'

import type { FilePath } from '../utils/paths'
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
import { mkdir, writeFile } from '../utils/asyncfs'
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
   * specified, rather than _stripping_ source maps we do no processing at all.
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
  protected async write(from: File, to: FilePath, log: Log): Promise<void> {
    await mkdir(getParent(to), { recursive: true })
    await writeFile(to, await from.contents(), this.#encoding)
    log.trace(`Written "${to}"`)
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const time = log.start()

    // Resolve our target directory and check it's a child of our input
    // directory (never write outside our designated area)
    const directory = this.#directory ?
        createDirectoryPath(input.directory, this.#directory) : input.directory
    assert(isChild(input.directory, directory) || (directory === input.directory),
        `Refusing to write to "${directory}", not a child of "${input.directory}"`)

    // Slightly different process if we have source maps or not
    let output: Files
    if (this.sourceMaps) {
      // If we have source maps to write the output will be different: we might
      // have extra files (the external source maps) and the content will most
      // likely change (the source mapping URL is added)
      output = new Files(input)
      await parallelize(input, async (originalFile) => {
        const to = createFilePath(directory, originalFile.relativePath)
        const added = await this.processFile(originalFile, to, output, log)
        return parallelize(added, (file) => this.write(file, file.absolutePath, log))
      })
    } else if (directory != input.directory) {
      // If the target directory is not the same as the input one, we "move"
      // the files, so, we have to pass new files through to the next stage
      output = new Files(input)
      await parallelize(input, async (file) => {
        const to = createFilePath(directory, file.relativePath)
        return this.write(file, to, log)
      })
    } else {
      // No sourcemaps, no relocation to another directory... Just WRITE!
      await parallelize(input, (file) => this.write(file, file.absolutePath, log))
      output = input
    }

    // Log what we wrote and be done with it
    log.debug('Written', output.length, 'files in', time)
    return output
  }
}

export const write = install('write', WritePlug)
