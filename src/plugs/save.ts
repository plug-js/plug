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

  async process(files: VirtualFileList): Promise<VirtualFileList> {
    return files
  }
}

export const save = install('save', SavePlug)
