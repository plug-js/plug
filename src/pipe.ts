import { Files } from './files'
import { Run, Runnable } from './run'
import { ConstructorOverloads } from './types/overloads'

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

// A convenience type describing a `Plug` constructor
type PlugConstructor<P extends Plug> = new (...args: any) => P

/**
 * The `Plug` interface describes a `Pipe` component, processing an input file
 * list and producing a (possibly) different one in the context of a `Run`.
 */
export interface Plug {
  process(input: Files, run: Run): Files | Promise<Files>
}

/** A `Processor` is a simple functional version of the `Plug` interface. */
export type Processor = Plug['process']

/**
 * The `Pipe` interface defines a series of `Plug` instances (or `Processor`s)
 * to be called in sequence, one after another.
 */
export interface Pipe<P extends Pipe<P>> {
  plug(plug: Plug): P
  plug(plug: Processor): P
}

/* ========================================================================== */

// Marker for our internal "plug" method
function wrap(plug: Plug | Processor): Plug {
  return (typeof plug === 'function') ? { process: plug } : plug
}

// Empty interface declaration (separate from class): this allows plugs
// to inject function declarations while installing, and our class not
// having to implement them to prevent TypeScript from complaining
interface AbstractPipe<P extends Pipe<P>> extends Pipe<P> {}

// Abstract implementation of our `Pipe` interface.
// We'll `install()` all our plug methods on this class' prototype and since
// this class is abstract and doesn't declare anything, the concrete `PlugPipe`
// and `TaskPipe` classes  will _always_ override anything here with whatever
// they declare.
// This allows us to be safe even if some random git installs a plug called
// "plug", "run", "process", ...
abstract class AbstractPipe<P extends Pipe<P>> implements Pipe<P> {
  abstract plug(plug: Plug): P
  abstract plug(plug: Processor): P
}

/* ========================================================================== */

/**
 * A `Pipe` implementation also implementing the `Plug` interface.
 *
 * Pipes of this kind are _snippets_ and reusable in the build file.
 */
export class PlugPipe extends AbstractPipe<PlugPipe> implements Plug {
  readonly #parent?: PlugPipe
  readonly #plug?: Plug

  constructor(parent?: PlugPipe, plug?: Plug) {
    super()
    this.#parent = parent
    this.#plug = plug
  }

  async process(list: Files, run: Run): Promise<Files> {
    if (this.#parent) list = await this.#parent.process(list, run)
    if (this.#plug) list = await this.#plug.process(list, run)
    return list
  }

  plug(plug: Plug | Processor): PlugPipe {
    return new PlugPipe(this, wrap(plug))
  }
}

/* ========================================================================== */

/**
 * A `Pipe` implementation for `Task`s.
 *
 * Task pipes do not implement the `Plug` interface, as by design they work
 * on all of the project's directory, and never have any input files to process.
 *
 * Also, by design, a `TaskPipe` _never_ runs twice in the context of a `Run`,
 * and their output is cached in order to repeat performing the same operation
 * multiple times.
 */
export class TaskPipe extends AbstractPipe<TaskPipe> implements Runnable {
  readonly #parent: Runnable
  readonly #plug?: Plug

  constructor(parent: Runnable, plug?: Plug) {
    super()
    this.#parent = parent
    this.#plug = plug
  }

  async run(run: Run): Promise<Files> {
    let list = await this.#parent.run(run)
    if (this.#plug) list = await this.#plug.process(list, run)
    return list
  }

  plug(plug: Plug | Processor): TaskPipe {
    return new TaskPipe(this, wrap(plug))
  }
}

/* ========================================================================== */

/**
 * A convenience type used to annotate plug instances installed ad extension
 * to the pipeline with install.
 */
export type PlugExtension<P extends Pipe<P>, C extends PlugConstructor<Plug>> =
    (...args: ConstructorOverloads<C>) => P

/**
 * Install the specified plug processor as a standard element in our pipelines.
 *
 * This function will return a constructor wrapper function that can be used
 * as an argument to "pipe.plug(...)".
 *
 * In order to also inject the _definition_ of an installed `Plug` we also need
 * to _declare_ its type in our module, for example:
 *
 * ```
 * class MyPlug implements Plug {
 *   // ... implementation ...
 * }
 *
 * export const myplug = install('myplug', MyPlug)
 *
 * declare module '@plugjs/plug/pipe' {
 *   interface Pipe<P extends Pipe<P>> {
 *     myplug: PlugExtension<P, typeof MyPlug>
 *   }
 * }
 * ```
 */
export function install<
    C extends PlugConstructor<Plug>,
    P extends any[] = ConstructorParameters<C>,
>(name: string, constructor: C): PlugExtension<PlugPipe, C> {
  function create(...args: P): PlugPipe {
    return new PlugPipe(undefined, new constructor(...args))
  }

  Object.defineProperty(AbstractPipe.prototype, name, {
    value: function(this: Pipe<any>, ...args: P) {
      return this.plug(new constructor(...args))
    },
  })

  return create
}
