import { Files } from '../files'
import { install, Plug } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    save: PlugExtension<P, typeof SavePlug>
  }
}

class SavePlug implements Plug {
  constructor(directory?: string) {
    void directory
  }

  async process(files: Files): Promise<Files> {
    return files
  }
}

export const save = install('save', SavePlug)
