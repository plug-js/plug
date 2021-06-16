import type { Plug } from './index'
import type { VirtualFileList } from './files'

// The signature of `plug.process(...)`
type PlugProcessor = Plug['process']

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

export class Pipe implements Plug {
  #plugs: Plug[]

  private constructor() {
    this.#plugs = []
  }

  async process(list: VirtualFileList): Promise<VirtualFileList> {
    for (const plug of this.#plugs) list = await plug.process(list)
    return list
  }

  plug(plug: Plug): this
  plug(plug: PlugProcessor): this
  plug(plug: Plug | PlugProcessor): this {
    if (typeof plug === 'function') plug = { process: plug }
    this.#plugs.push(plug)
    return this
  }

  /* ======================================================================== */

  static pipe(): Pipe {
    return new Pipe()
  }
}
