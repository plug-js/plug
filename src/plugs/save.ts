import { Plug, Pipe, VirtualFileList } from '..'

declare module '../pipeline' {
  interface Pipe {
    save: PlugExtension<typeof SavePlug>
  }
}

class SavePlug implements Plug {
  constructor(directory?: string) {
    void directory
  }

  async process(fs: VirtualFileList): Promise<VirtualFileList> {
    return fs
  }
}

export const save = Pipe.install('save', SavePlug)
