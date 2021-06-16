import { Plug } from '..'
import { VirtualFileList } from '../files'
import { install, PlugExtension } from '../install'

declare module '../pipe' {
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

export const save = install('save', SavePlug)
