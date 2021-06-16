import type { Plug } from './index'
import type { VirtualFileList } from './files'

// The signature of `plug.process(...)`
type PlugProcessor = Plug['process']

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

export class Pipe implements Plug {
  #parent?: Pipe
  #plug?: Plug

  private constructor(plug?: Plug, parent?: Pipe) {
    this.#parent = parent
    this.#plug = plug
  }

  async process(list: VirtualFileList): Promise<VirtualFileList> {
    if (this.#parent) list = await this.#parent.process(list)
    if (this.#plug) list = await this.#plug.process(list)
    return list
  }

  plug(plug: Plug): Pipe
  plug(plug: PlugProcessor): Pipe
  plug(plug: Plug | PlugProcessor): Pipe {
    if (typeof plug === 'function') plug = { process: plug }
    return new Pipe(plug, this)
  }

  /* ======================================================================== */

  static pipe(): Pipe {
    return new Pipe()
  }
}
