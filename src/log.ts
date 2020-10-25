import { isatty } from 'tty'
import { EOL } from 'os'
import { inspect } from 'util'

import { Task } from './task'
import { Plugin } from './plugin'
import { STYLE, RGB } from './colors'

/* ========================================================================== */

/** Options to construct `Log` instances */
export interface LogOptions {
  write?: (data: string) => void
  color?: boolean
  debug?: boolean
  quiet?: boolean
}

/* The default configurations from command line */
/* istanbul ignore next -- let's keep this as a "manual" test */
const defaults: Required<LogOptions> = (() => {
  let color = isatty((<any> process.stdout).fd), debug = false, quiet = false

  for (const option of process.argv) {
    switch (option) {
      case '--color': color = true; break
      case '--debug': debug = true; break
      case '--quiet': quiet = true; break

      case '--no-color': color = false; break
      case '--no-debug': debug = false; break
      case '--no-quiet': quiet = false; break
    }
  }

  return { color, debug, quiet, write: console.log.bind(console) }
})()

/* ========================================================================== */

/* Emit a log entry to the console */
function format(
  color: boolean,
  level: 'DEBUG' | 'ALERT' | 'ERROR' | null,
  task: Task | null,
  plugin: Plugin | null,
  message: string,
  ...args: any[]
): string {
  // Simplify wrinting colors here
  const strings: string[] = []
  const w = (col: STYLE | RGB, ...args: string[]) => {
    if (color) strings.push(col)
    strings.push(...args)
  }

  // Reset our color at the beginning of the line
  w(STYLE.RESET)

  // The time, now...
  const now = new Date()

  w(RGB['#8a8a8a'], now.getHours().toString().padStart(2, '0'))
  w(RGB['#585858'], ':')
  w(RGB['#8a8a8a'], now.getMinutes().toString().padStart(2, '0'))
  w(RGB['#585858'], ':')
  w(RGB['#8a8a8a'], now.getSeconds().toString().padStart(2, '0'))
  w(RGB['#585858'], ':')
  w(RGB['#8a8a8a'], now.getMilliseconds().toString().padStart(3, '0'))

  // A label unless this is a normal _log_ entry...
  switch (level) {
    case 'DEBUG': w(RGB['#00005f'], ' ['); w(RGB['#5f5fff'], 'DEBUG'); w(RGB['#000087'], ']'); break
    case 'ALERT': w(RGB['#5f5f00'], ' ['); w(RGB['#ffff00'], 'ALERT'); w(RGB['#5f5f00'], ']'); break
    case 'ERROR': w(RGB['#5f0000'], ' ['); w(RGB['#ff0000'], 'ERROR'); w(RGB['#5f0000'], ']'); break
  }

  // Task and plugin
  if (task) {
    w(RGB["#00af00"], ' ', task.name)
    if (plugin) {
      w(RGB['#005f00'], '(')
      w(RGB['#00ff00'], plugin.name)
      w(RGB['#005f00'], ')')
    }
  }

  // Message, the least with "w(...)"
  w(STYLE.RESET, ' ', message)

  // All other arguments
  for (const arg of args) {
    strings.push(arg instanceof Error ? EOL : ' ')
    strings.push(inspect(arg, { colors: color }))
  }

  // Close up (always reset, convert to string, write)
  w(STYLE.RESET)
  return strings.join('')
}

/**
 * A `Task`'s own _execution context_, passed to a `Task` when being invoked.
 *
 * The `name` is declared here as tasks are simple functions which should be
 * invoked with a `void this`.
 */
export interface Log {
  /** Emit a message */
  log(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void

  /** Emit a _debug_ message */
  debug(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void
  /** Emit an _alert_ message */
  alert(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void
  /** Emit an _error_ message */
  error(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void
}


export class Log implements Log {
  #write: (data: string) => void
  #color: boolean
  #debug: boolean
  #quiet: boolean

  constructor(options?: LogOptions) {
    const merged = Object.assign({}, defaults, options)
    this.#write = merged.write
    this.#color = merged.color
    this.#debug = merged.debug
    this.#quiet = merged.quiet

    if (this.#quiet && this.#debug) {
      this.#write(format(this.#color, 'ALERT', null, null, 'Both "quiet" and "debug" logging requested, assuming "debug"'))
      this.#quiet = false
    }
  }

  /** Emit a message */
  log(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void {
    if (! this.#quiet) this.#write(format(this.#color, null, task, plugin, message, ...args))
  }

  /** Emit a _debug_ message */
  debug(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void {
    if (this.#debug) this.#write(format(this.#color, 'DEBUG', task, plugin, message, ...args))
  }

  /** Emit an _alert_ message */
  alert(task: Task | null, plugin: Plugin | null, message: string, ...args: any[]): void {
    if (! this.#quiet) this.#write(format(this.#color, 'ALERT', task, plugin, message, ...args))
  }

  /** Emit an _error_ message */
  error(task: Task, plugin: Plugin, message: string, ...args: any[]): void {
    this.#write(format(this.#color, 'ERROR', task, plugin, message, ...args))
  }
}
