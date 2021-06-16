import { Plug, Pipeline, VirtualFileList } from '..'
import { glob, GlobOptions } from '../utils/globs'

declare module '../pipeline' {
  interface Pipeline {
    read: PlugExtension<typeof ReadPlug>
  }
}

// At least one glob, and optional options at the end
type ReadArguments = [ string, ...string[], GlobOptions ] | [ string, ...string[] ]

class ReadPlug implements Plug {
  #options: GlobOptions
  #globs: string[]

  constructor(...args: ReadArguments) {
    const last = args.splice(-1)[0]
    const { globs, options } = typeof last === 'string' ? {
      globs: [ ...args as string[], last ],
      options: {},
    } : {
      globs: [ ...args as string[] ],
      options: last,
    }

    this.#options = options
    this.#globs = globs
  }

  async process(fs: VirtualFileList): Promise<VirtualFileList> {
    return await glob(fs.directoryPath, this.#globs, this.#options)
  }
}

export const from = Pipeline.install('from', ReadPlug)
