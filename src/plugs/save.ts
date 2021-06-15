import { Plug, Pipeline, VirtualFileSystem } from '..'

declare module '../pipeline' {
  interface Pipeline {
    save: PlugExtension<typeof SavePlug>
  }
}

class SavePlug implements Plug {
  constructor(directory?: string) {
    void directory
  }

  async process(fs: VirtualFileSystem): Promise<VirtualFileSystem> {
    return fs
  }
}

export const save = Pipeline.install('save', SavePlug)
