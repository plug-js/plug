import { Files } from '../files'
import { Plug, install } from '../pipe'
import { Run } from '../run'
import { Log } from '../utils/log'
import { getDirectoryPath, getRelativePath } from '../utils/paths'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    to: PlugExtension<P, typeof ToPlug>
  }
}

export class ToPlug implements Plug {
  #directory: string

  constructor(directory: string) {
    this.#directory = directory
  }

  process(input: Files, run: Run, log: Log): Files {
    const directory = getDirectoryPath(run.directory, this.#directory)
    if (directory === input.directory) return input

    const output = new Files(directory)
    const files = input.list()

    for (const file of files) output.add(file.relativePath, file)
    log.debug('Relocated', files.length,
        `from "${getRelativePath(run.directory, input.directory)}"`,
        `to "${getRelativePath(run.directory, output.directory)}"`)
    return output
  }
}

export const to = install('to', ToPlug)
