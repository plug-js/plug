import { Plug, Pipe, VirtualFileList } from '..'

declare module '../pipeline' {
  interface Pipe {
    from: PlugExtension<typeof FromPlug>
  }
}

class FromPlug implements Plug {
  #directory: string

  constructor(directory: string) {
    this.#directory = directory
  }

  process(fs: VirtualFileList): VirtualFileList {
    return fs.clone(this.#directory)
  }
}

export const from = Pipe.install('from', FromPlug)
