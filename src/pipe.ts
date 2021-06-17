import type { Plug, Processor, Run } from './index'
import type { VirtualFileList } from './files'

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

  async process(list: VirtualFileList, run: Run): Promise<VirtualFileList> {
    if (this.#parent) list = await this.#parent.process(list, run)
    if (this.#plug) list = await this.#plug.process(list, run)
    return list
  }

  plug(plug: Plug): Pipe
  plug(plug: Processor): Pipe
  plug(plug: Plug | Processor): Pipe {
    if (typeof plug === 'function') plug = { process: plug }
    return new Pipe(plug, this)
  }

  /* ======================================================================== */

  static pipe(plug?: Plug): Pipe
  static pipe(plug?: Processor): Pipe
  static pipe(plug?: Plug | Processor): Pipe {
    if (typeof plug === 'function') plug = { process: plug }
    return new Pipe(plug)
  }
}
