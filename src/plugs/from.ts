import { Files } from '../files'
import { Plug, install } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    from: PlugExtension<P, typeof FromPlug>
  }
}

class FromPlug implements Plug {
  #directory: string

  constructor(directory: string) {
    this.#directory = directory
  }

  process(files: Files): Files {
    return files.clone(this.#directory)
  }
}

export const from = install('from', FromPlug)
