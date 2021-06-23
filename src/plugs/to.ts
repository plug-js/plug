import { Files } from '../files'
import { Log } from '../utils/log'
import { Run } from '../run'
import { Plug, install } from '../pipe'
import { RelativeDirectoryPath, getRelativePath, resolvePath } from '../utils/paths'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    to: PlugExtension<P, typeof ToPlug>
  }
}

export class ToPlug implements Plug {
  #directory: RelativeDirectoryPath

  constructor(directory: string) {
    this.#directory = directory as RelativeDirectoryPath
  }

  process(input: Files, run: Run, log: Log): Files {
    const directory = resolvePath(run.directory, this.#directory)
    if (directory === input.directory) return input

    const output = new Files(run)

    for (const file of input) output.add(file.relativePath, file)
    log.debug('Relocated', output.length,
        `from "${getRelativePath(run.directory, input.directory)}"`,
        `to "${getRelativePath(run.directory, output.directory)}"`)
    return output
  }
}

export const to = install('to', ToPlug)
