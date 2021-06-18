import { VirtualFileList } from '../files'
import { install, Plug } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    save: typeof save
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
