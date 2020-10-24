import assert from 'assert'
import { Entry, DirectoryEntry, FileEntry } from './entry'
import { assertNonEmptyString } from './types'

/**
 * The `PluginContext` represents the execution context of a `Plugin` within
 * the scope of a `Task`.
 */
export interface PluginContext {
  readonly task: string,

  debug(message: string, ...args: any[]): void
  print(message: string, ...args: any[]): void
  alert(message: string, ...args: any[]): void
}

/** A type identifying the possible results of a plugin processing an `Entry` */
export type PluginResults = void | Entry | Entry[] | Promise<void | Entry | Entry[]>

/**
 * A `PluginHandler` represents a simple _function_ processing entries.
 *
 * This can be seen as a _stateless_ `Plugin`
 */
export type PluginHandler = (this: void, entry: Entry, context: PluginContext) => PluginResults

/**
 *
 */
export interface Plugin {
  readonly name: string

  init(context: PluginContext): void | Promise<void>;

  handle(entry: Entry): PluginResults;

  flush(): PluginResults

  destroy(): boolean | Promise<boolean>
}

/**
 *
 */
export class Plugin implements Plugin {
  protected readonly context!: PluginContext
  readonly name!: string

  #context?: PluginContext

  constructor(name: string) {
    assertNonEmptyString(name, 'Plugin name must be a non-empty string')

    Object.defineProperties(this, {
      'name': { enumerable: true, value: name },
      'context': { enumerable: false, get: () => {
        assert(this.#context, 'Accessing context before initialization')
        return this.#context
      } },
    })
  }

  init(context: PluginContext): void | Promise<void> {
    assert(context, 'Created with no context')
    this.#context = context
  }

  handle(entry: Entry): PluginResults {
    return entry
  }

  flush(): PluginResults {
    // nothing to flush
  }

  destroy(): boolean | Promise<boolean> {
    return true
  }

  static wrap(handler: PluginHandler): Plugin
  static wrap(name: string, handler: PluginHandler): Plugin
  static wrap(nameOrHandler: string | PluginHandler, optionalHandler?: PluginHandler): Plugin {
    const plugin =
      (typeof nameOrHandler === 'string') && (typeof optionalHandler === 'function') ?
        new PluginWrapper(nameOrHandler, optionalHandler) :
      typeof nameOrHandler === 'function' ?
        new PluginWrapper(nameOrHandler.name, nameOrHandler) :
      assert.fail(`Invalid arguments for wrap(${typeof nameOrHandler}, ${typeof optionalHandler})`)
    return plugin
  }
}

class PluginWrapper extends Plugin {
  handle!: (entry: Entry) => void | Promise<void>

  constructor(name: string, handler: PluginHandler) {
    super(name)
    Object.defineProperty(this, 'handle', (entry: Entry) => handler(entry, this.context))
  }
}
