import { Entry } from './entry'
import { Plugin, PluginContext } from './plugin'
import { TaskContext } from './task'

export interface Pipe {
  init(): Promise<this>
  process(entry: Entry): Promise<void>
  flush(): Promise<void>
  close(): Promise<boolean>
}

class PlugContext {
  readonly context: TaskContext
  readonly plugin: string

  constructor(context: TaskContext, plugin: Plugin) {
    this.context = context
    this.plugin = plugin.name
  }

  debug(message: string, ...args: any[]): void {
    this.context.debug(message, this.plugin, message, ...args)
  }
  print(message: string, ...args: any[]): void {
    this.context.debug(message, this.plugin, message, ...args)
  }
  alert(message: string, ...args: any[]): void {
    this.context.debug(message, this.plugin, message, ...args)
  }
  error(message: string, ...args: any[]): void {
    this.context.debug(message, this.plugin, message, ...args)
  }

  pluginContext() {
    return {
      task: this.context.name,
      debug: this.debug.bind(this),
      print: this.print.bind(this),
      alert: this.print.bind(this),
    }
  }
}

class Plug implements Pipe {
  context: PlugContext
  plugin: Plugin
  next: Pipe

  constructor(context: TaskContext, plugin: Plugin, next: Pipe) {
    this.context = new PlugContext(context, plugin)
    this.plugin = plugin
    this.next = next
  }

  async init() {
    try {
      await this.plugin.init(this.context.pluginContext())
    } catch (error) {
      this.context.error('Error initializing plugin', error)
      throw error
    }

    await this.next.init()
    return this
  }

  async process(entry: Entry) {
    let result

    try {
      result = await this.plugin.handle(entry)
    } catch (error) {
      this.context.error('Error processing entry', error)
      throw error
    }

    if (! result) return

    if (Array.isArray(result)) {
      result.forEach((entry) => this.next.process(entry))
    } else {
      this.next.process(result)
    }
  }

  async flush() {
    let result

    try {
      result = await this.plugin.flush()
    } catch (error) {
      this.context.error('Error flushing plugin', error)
      throw error
    }

    if (! result) return

    if (Array.isArray(result)) {
      result.forEach((entry) => this.next.process(entry))
    } else {
      this.next.process(result)
    }
  }

  async close() {
    let pluginOk: boolean
    try {
      pluginOk = await this.plugin.destroy()
    } catch (error) {
      this.context.error('Error destroying plugin', error)
      throw error
    }

    const nextOk = await this.next.close()
    return pluginOk && nextOk
  }
}

const cork: Pipe = {
  init: () => Promise.resolve(cork),
  process: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  close: () => Promise.resolve(true),
}

export function pipe(context: TaskContext, plugins: Plugin[]) {
  return plugins.reduceRight((pipe, plugin) => new Plug(context, plugin, pipe),	cork)
}
