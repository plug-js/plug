import { fail } from 'assert'
import { VirtualFileList } from './files'
import { ConstructorOverloads } from './types/overloads'

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

// A convenience type describing a `Plug` constructor
type PlugConstructor<P extends Plug> = new (...args: any) => P

/**
 * The `Run` interface describes a contract beteween `Plug`s and `Processor`s
 * and the underlying subsystem actually calling them.
 */
export interface Run {
  readonly taskNames: readonly string[]
}

export interface Runnable {
  run(run: Run): VirtualFileList | Promise<VirtualFileList>
}

/**
 * The `Plug` interface describes a `Pipe` component, processing an input file
 * list and producing a (possibly) different one in the context of a `Run`.
 */
export interface Plug {
  process(input: VirtualFileList, run: Run): VirtualFileList | Promise<VirtualFileList>
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

// Empty interface declaration (separate from class): this allows plugs
// to inject function declarations while installing, and our class not
// having to implement them to prevent TypeScript from complaining
interface AbstractPipe<P extends Pipe<P>> extends Pipe<P> {}

// Abstract implementation of our `Pipe` interface
abstract class AbstractPipe<P extends Pipe<P>> implements Pipe<P> {
  plug(plug: Plug): P
  plug(plug: Processor): P
  plug(plug: Plug | Processor): Pipe<any> {
    if (typeof plug === 'function') plug = { process: plug }
    if (this instanceof PlugPipe) return new PlugPipe(this, plug)
    // istanbul ignore else - we don't expose this abstract class for tests
    if (this instanceof TaskPipe) return new TaskPipe(this, plug)
    // istanbul ignore next - we don't expose this abstract class for tests
    fail('Unknown plug type')
  }
}

/* ========================================================================== */

/**
 * A `Pipe` implementation also implementing the `Plug` interface.
 *
 * Pipes of this kind are _snippets_ and reusable in the build file.
 */
export class PlugPipe extends AbstractPipe<PlugPipe> {
  #parent?: PlugPipe
  #plug?: Plug

  constructor(parent?: PlugPipe, plug?: Plug) {
    super()
    this.#parent = parent
    this.#plug = plug
  }

  async process(list: VirtualFileList, run: Run): Promise<VirtualFileList> {
    if (this.#parent) list = await this.#parent.process(list, run)
    if (this.#plug) list = await this.#plug.process(list, run)
    return list
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
  #origin: Runnable
  #plug?: Plug

  constructor(origin: Runnable, plug?: Plug) {
    super()
    this.#origin = origin
    this.#plug = plug
  }

  async run(run: Run): Promise<VirtualFileList> {
    let list = await this.#origin.run(run)
    if (this.#plug) list = await this.#plug.process(list, run)
    return list
  }
}

/* ========================================================================== */

/**
 * A convenience type used to annotate plug instances installed ad extension
 * to the pipeline with install.
 */
type PlugExtension<
 P extends Pipe<P>,
 C extends PlugConstructor<Plug>,
> = (...args: ConstructorOverloads<C>) => P

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
 *     myplug: typeof myplug
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
