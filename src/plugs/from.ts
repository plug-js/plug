import { VirtualFileList } from '../files'
import { Plug, install } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    from: typeof from
  }
}

class FromPlug implements Plug {
  #directory: string

  constructor(directory: string) {
    this.#directory = directory
  }

  process(files: VirtualFileList): VirtualFileList {
    return files.clone(this.#directory)
  }
}

export const from = install('from', FromPlug)
