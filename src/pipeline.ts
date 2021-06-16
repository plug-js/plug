import type { ConstructorOverloads } from './types/overloads'

import { Plug } from './index'
import { VirtualFileList } from './files'
import { getProjectDirectory } from './project'

// A convenience type describing a `Plug` constructor
type PlugConstructor<PlugInstance extends Plug> = new (...args: any) => PlugInstance

// The signature of `plug.process(...)`
type PlugProcessor = Plug['process']

/**
 * A convenience type used to annotate plug instances installed ad extension
 * to the pipeline with install.
 */
export type PlugExtension<C extends PlugConstructor<I>, I extends Plug = Plug> =
    (...args: ConstructorOverloads<C>) => Pipe

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

export class Pipe {
  #start: () => VirtualFileList | Promise<VirtualFileList>
  #plugs: PlugProcessor[] = []

  constructor(start: () => VirtualFileList | Promise<VirtualFileList>) {
    this.#start = start
  }

  plug(plug: PlugProcessor): this {
    this.#plugs.push(plug)
    return this
  }

  /* ======================================================================== */

  static pipe(): Pipe {
    return new Pipe(() => new VirtualFileList(getProjectDirectory()))
  }

  static async run(pipeline: Pipe): Promise<VirtualFileList> {
    let fs = await pipeline.#start()
    for (const plug of pipeline.#plugs) fs = await plug(fs)
    return fs
  }

  /* ======================================================================== */

  /**
   * Install the specified plug processor as a standard element in our pipelines.
   *
   * This function will return a constructor wrapper function that can be used
   * as an argument to "pipe.plug(...)".
   */
  static install<C extends PlugConstructor<I>, I extends Plug>(
      name: string,
      constructor: C,
  ): (...args: ConstructorOverloads<C>) => PlugProcessor {
    function create<P extends any[] = ConstructorParameters<C>>(...args: P): PlugProcessor {
      const instance = new constructor(...args)
      return instance.process.bind(instance)
    }

    Object.defineProperty(Pipe.prototype, name, {
      value: function<P extends any[] = ConstructorParameters<C>>(this: Pipe, ...args: P) {
        const created = create(args)
        return this.plug(created)
      },
    })

    return create
  }
}

/* ========================================================================== */

// Freeze our "plug" method in the prototype so that noone can overwrite
// it with "install" from Plug
Object.defineProperty(Pipe.prototype, 'plug', {
  value: Pipe.prototype.plug,
  configurable: false,
  enumerable: false,
  writable: false,
})
