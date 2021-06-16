import type { ConstructorOverloads } from './types/overloads'
import type { Plug } from './index'
import { Pipe } from './pipe'

/**
 * A convenience type used to annotate plug instances installed ad extension
 * to the pipeline with install.
 */
export type PlugExtension<C extends PlugConstructor<I>, I extends Plug = Plug> =
 (...args: ConstructorOverloads<C>) => Pipe

// A convenience type describing a `Plug` constructor
type PlugConstructor<PlugInstance extends Plug> = new (...args: any) => PlugInstance

// The signature of `plug.process(...)`
type PlugProcessor = Plug['process']

/* ========================================================================== *
 * SETUP: Freeze the "plug" and "process" methods in Pipe's prototype so that *
 * noone can overwrite them with "install"                                    *
 * ========================================================================== */

Object.defineProperties(Pipe.prototype, {
  process: { value: Pipe.prototype.process, configurable: false, enumerable: false, writable: false },
  plug: { value: Pipe.prototype.plug, configurable: false, enumerable: false, writable: false },
})


/**
 * Install the specified plug processor as a standard element in our pipelines.
 *
 * This function will return a constructor wrapper function that can be used
 * as an argument to "pipe.plug(...)".
 */
export function install<C extends PlugConstructor<I>, I extends Plug>(
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
