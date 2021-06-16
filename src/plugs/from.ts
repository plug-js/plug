import { Plug } from '..'
import { VirtualFileList } from '../files'
import { install, PlugExtension } from '../install'

declare module '../pipe' {
  interface Pipe {
    from: PlugExtension<typeof FromPlug>
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
