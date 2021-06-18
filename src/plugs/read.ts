import { VirtualFileList } from '../files'
import { install, Plug } from '../pipe'
import { GlobOptions, glob } from '../utils/globs'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    read: typeof read
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

  async process(files: VirtualFileList): Promise<VirtualFileList> {
    const list = files.clone()

    await glob(files.directoryPath, this.#globs, this.#options, (path) => {
      return list.add(path).contents().then(() => void 0)
    })

    return list
  }
}

export const read = install('read', ReadPlug)
