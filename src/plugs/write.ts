import assert from 'assert'

import type { File } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'

import { Files } from '../files'
import { createDirectoryPath, createFilePath, FilePath, getRelativePath, isChild } from '../utils/paths'
import { getParent } from '../utils/paths'
import { install } from '../pipe'
import { mkdir, writeFile } from '../utils/asyncfs'
import { parallelize } from '../utils/parallelize'
import { writeSourceMap, WriteSourceMapOptions } from '../files/sourcemap'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    write: PlugExtension<P, typeof WritePlug>
  }
}

export interface WriteOptions extends WriteSourceMapOptions {
   /**
   * The encoding used to write files.
   *
   * @default 'utf8'
   */
   encoding?: BufferEncoding
}

export class WritePlug implements Plug {
  #encoding: BufferEncoding
  #options: WriteOptions

  #directory?: string

  constructor(directory?: string)
  constructor(options: WriteOptions)
  constructor(directory: string, options?: WriteOptions)
  constructor(first?: string | WriteOptions, extra?: WriteOptions) {
    // Destructure our arguments
    const { directory, options = {} } =
        typeof first === 'string' ? { directory: first, options: extra } :
            first ? { directory: undefined, options: first } :
                { directory: undefined }

    // Let's build us up
    this.#encoding = options.encoding || 'utf8'
    this.#directory = directory
    this.#options = options
  }

  /** The function used for writing files (mainly for testing) */
  protected async write(path: FilePath, contents: string, log: Log): Promise<void> {
    await mkdir(getParent(path), { recursive: true })
    await writeFile(path, contents, this.#encoding)
    log.trace(`Written "${path}"`)
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const time = log.start()

    // Resolve our target directory
    const directory = this.#directory ?
        createDirectoryPath(input.directory, this.#directory) : input.directory

    // Make sure we're writing either to the input directory or its child
    assert(isChild(input.directory, directory) || (directory === input.directory),
        `Refusing to write to "${directory}", not a child of "${input.directory}"`)

    // Prepare an array of [ path -> file ] tuples
    const files: [ FilePath, File ][] = (directory === input.directory) ?
        input.map((file) => [ file.absolutePath, file ]) :
        input.map((file) => {
          const relative = getRelativePath(input.directory, file.absolutePath)
          const path = createFilePath(directory, relative)
          return [ path, file ]
        })

    // If we don't have to process source maps, it's a quick parallel call
    if (this.#options.sourceMaps === 'none') {
      await parallelize(files, ([ path, file ]) =>
        file.contents().then((contents) => this.write(path, contents, log)))

      // Log what we wrote and be done with it
      log.debug('Written', files.length, 'files in', time)
      return input
    }

    // Source maps need to be produced before writing...
    let count = 0
    await parallelize(files, async ([ path, file ]) => {
      const outputs = await writeSourceMap(path, file, this.#options)
      await parallelize(outputs, ([ output, contents ]) => {
        count ++
        return this.write(output, contents, log)
      })
    })

    // Log what we wrote and be done with it
    log.debug('Written', count, 'files in', time)
    return input
  }
}

export const write = install('write', WritePlug)
