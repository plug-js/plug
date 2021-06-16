import type { Plug } from './index'
import type { VirtualFileList } from './files'

// The signature of `plug.process(...)`
type PlugProcessor = Plug['process']

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

export class Pipe implements Plug {
  #plugs: PlugProcessor[]

  private constructor() {
    this.#plugs = []
  }

  async process(list: VirtualFileList): Promise<VirtualFileList> {
    for (const plug of this.#plugs) list = await plug(list)
    return list
  }

  plug(plug: PlugProcessor): this {
    this.#plugs.push(plug)
    return this
  }

  /* ======================================================================== */

  static pipe(): Pipe {
    return new Pipe()
  }
}
