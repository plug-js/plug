import { Plug, Pipeline, VirtualFileList } from '..'

declare module '../pipeline' {
  interface Pipeline {
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

export const save = Pipeline.install('save', SavePlug)
