import type { ConstructorOverloads } from './types/overloads'

import { Plug } from './index'
import { getProjectDirectory } from './project'
import { glob, GlobOptions } from './utils/globs'
import { getDirectoryPath } from './utils/paths'
import { VirtualFileSystem } from './virtual-file-system'

// At least one glob, and optional options at the end
type ReadArguments = [ string, ...string[], GlobOptions ] | [ string, ...string[] ]

// A convenience type describing a `Plug` constructor
type PlugConstructor<PlugInstance extends Plug> = new (...args: any) => PlugInstance

// The signature of `plug.process(...)`
type PlugProcessor = Plug['process']

/**
 * A convenience type used to annotate plug instances installed ad extension
 * to the pipeline with install.
 */
export type PlugExtension<C extends PlugConstructor<I>, I extends Plug = Plug> =
    (...args: ConstructorOverloads<C>) => Pipeline

/* ========================================================================== *
 * CORE PIPELINE IMPLEMENTATION                                               *
 * ========================================================================== */

export class Pipeline {
  #plugs: PlugProcessor[] = []
  #read: () => Promise<VirtualFileSystem>

  protected constructor(read: () => Promise<VirtualFileSystem>) {
    this.#read = read
  }

  plug(plug: PlugProcessor): this {
    this.#plugs.push(plug)
    return this
  }

  /* ======================================================================== */

  static async run(pipeline: Pipeline): Promise<VirtualFileSystem> {
    let fs = await pipeline.#read()
    for (const plug of pipeline.#plugs) fs = await plug(fs)
    return fs
  }

  /* ======================================================================== */

  /**
   * Contextualize a pipeline's base directory: any `read(...)` operation
   * performed by such contextualized pipeline will process globs from the
   * directory specified here.
   */
  static from(directory: string): { read: typeof Pipeline.read } {
    const projectDir = getProjectDirectory()
    const baseDir = directory ? getDirectoryPath(projectDir, directory) : projectDir

    return { read: (...args: ReadArguments) => new Pipeline(async () => {
      const last = args.splice(-1)[0]
      const { globs, options } = typeof last === 'string' ? {
        globs: [ ...args as string[], last ],
        options: {},
      } : {
        globs: [ ...args as string[] ],
        options: last,
      }

      return await glob(baseDir, globs, options)
    }) }
  }

  /**
   * Create a pipeline reading the files identified by the specified globs
   * in the current project directory.
   */
  static read(...args: ReadArguments): Pipeline {
    return Pipeline.from('').read(...args)
  }

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

    Object.defineProperty(Pipeline.prototype, name, {
      value: function<P extends any[] = ConstructorParameters<C>>(this: Pipeline, ...args: P) {
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
Object.defineProperty(Pipeline.prototype, 'plug', {
  value: Pipeline.prototype.plug,
  configurable: false,
  enumerable: false,
  writable: false,
})
