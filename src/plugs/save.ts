import assert from 'assert'

import type { FilePath } from '../utils/paths'
import type { Files } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import type { SourceMapsOptions } from './sourcemaps'

import { SourceMapsPlug } from './sourcemaps'
import { createDirectoryPath, createFilePath, isChild } from '../utils/paths'
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

export class SavePlug extends SourceMapsPlug implements Plug {
  #encoding: BufferEncoding
  #directory?: string

  constructor(directory?: string)
  constructor(options?: SaveOptions)
  constructor(directory: string, options?: SaveOptions)
  constructor(first?: string | SaveOptions, extra?: SaveOptions) {
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
  async write(file: FilePath, contents: Buffer): Promise<void> {
    const directory = getParent(file)
    await mkdir(directory, { recursive: true })
    await writeFile(file, contents)
  }

  async process(files: Files, run: Run, log: Log): Promise<Files> {
    // If we have to process source maps, let SourceMapsPlug do it
    if (this.sourceMaps) files = await super.process(files, run, log)

    // Resolve our target directory, check it's a child of our input directory
    // (never write outside our designated area) and create it...
    const directory = this.#directory ?
        createDirectoryPath(files.directory, this.#directory) : files.directory
    assert(isChild(files.directory, directory) || (directory === files.directory),
        `Refusing to write to "${directory}", not a child of "${files.directory}"`)
    await mkdir(directory, { recursive: true })

    // Process each file and actually write it out properly
    for (const file of files) {
      const targetPath = createFilePath(directory, file.relativePath)
      const buffer = Buffer.from(await file.contents(), this.#encoding)
      await this.write(targetPath, buffer)
    }

    // All done!
    return files
  }
}

export const save = install('save', SavePlug)
