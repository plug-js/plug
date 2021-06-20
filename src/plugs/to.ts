import { Files } from '../files'
import { Plug, install } from '../pipe'
import { getProjectDirectory } from '../project'
import { getDirectoryPath } from '../utils/paths'

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

  process(input: Files): Files {
    const directory = getDirectoryPath(getProjectDirectory(), this.#directory)
    const output = new Files(directory)
    for (const file of input.list()) output.add(file.relativePath, file)
    return output
  }
}

export const to = install('to', ToPlug)
