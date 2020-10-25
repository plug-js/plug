import { isatty } from 'tty'
import { EOL } from 'os'
import { inspect } from 'util'

import { Task } from './task'
import { Plugin } from './plugin'
import { STYLE, RGB } from './colors'

/* ========================================================================== */

/** Options to construct `Log` instances */
export enum LogLevel {
  DEBUG = 0,
  NORMAL = 1,
  ALERT = 2,
  ERROR = 3,
  QUIET = 4,
}

/** Options to construct `Log` instances */
export interface LogOptions {
  write?: (data: string) => void
  level?: LogLevel
  color?: boolean
}

/* The default configurations from command line */
/* istanbul ignore next -- let's keep this as a "manual" test */
const defaults: Required<LogOptions> = (() => {
  let color = isatty((<any> process.stdout).fd), level = LogLevel.NORMAL

  for (const option of process.argv) {
    switch (option) {
      case '--color': color = true; break
      case '--no-color': color = false; break

      case '--verbose':
      case '-v': level -= 1; break
      case '-vv': level -= 2; break
      case '-vvv': level -= 3; break
      case '-vvvv': level -= 4; break
      case '-vvvvv': level -= 5; break

      case '--quiet':
      case '-q': level += 1; break
      case '-qq': level += 2; break
      case '-qqq': level += 3; break
      case '-qqqq': level += 4; break
      case '-qqqqq': level += 5; break
    }
  }

  if (level < LogLevel.DEBUG) level = LogLevel.DEBUG
  if (level > LogLevel.QUIET) level = LogLevel.QUIET

  return { color, level, write: console.log.bind(console) }
})()

/* ========================================================================== */

type EmitOptions = Required<LogOptions> & {
  task?: Task
  plugin?: Plugin
}

/* Format format forma */
function emit(options: EmitOptions, message: string, ...args: any[]) {
  const { color, level, task, plugin, write } = options

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
  if (level <= LogLevel.DEBUG) {
    w(RGB['#00005f'], ' ['); w(RGB['#5f5fff'], 'DEBUG'); w(RGB['#000087'], ']')
  } else if (level >= LogLevel.ERROR) {
    w(RGB['#5f0000'], ' ['); w(RGB['#ff0000'], 'ERROR'); w(RGB['#5f0000'], ']')
  } else if (level >= LogLevel.ALERT) {
    w(RGB['#5f5f00'], ' ['); w(RGB['#ffff00'], 'ALERT'); w(RGB['#5f5f00'], ']')
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
  write(strings.join(''))
}

/**
 * A `Task`'s own _execution context_, passed to a `Task` when being invoked.
 *
 * The `name` is declared here as tasks are simple functions which should be
 * invoked with a `void this`.
 */
export interface Log {
  /** Emit a message */
  log(message: string, ...args: any[]): void

  /** Emit a _debug_ message */
  debug(message: string, ...args: any[]): void
  /** Emit an _alert_ message */
  alert(message: string, ...args: any[]): void
  /** Emit an _error_ message */
  error(message: string, ...args: any[]): void
}


export class Log implements Log {
  #options: EmitOptions

  constructor(options?: LogOptions) {
    this.#options = Object.assign({}, defaults, options)
    if (this.#options.level < LogLevel.DEBUG) this.#options.level = LogLevel.DEBUG
    if (this.#options.level > LogLevel.QUIET) this.#options.level = LogLevel.QUIET
  }

  for(task?: Task, plugin?: Plugin): Log {
    const options = Object.assign({}, this.#options)
    options.task = task ? task : undefined
    options.plugin = plugin ? plugin : undefined
    return new Log(options)
  }

  /** Emit a _debug_ message */
  debug(message: string, ...args: any[]): void {
    if (this.#options.level > LogLevel.DEBUG) return
    emit(Object.assign({}, this.#options, { level: LogLevel.DEBUG }), message, ...args)
  }

  /** Emit a message */
  log(message: string, ...args: any[]): void {
    if (this.#options.level > LogLevel.NORMAL) return
    emit(Object.assign({}, this.#options, { level: LogLevel.NORMAL }), message, ...args)
  }

  /** Emit an _alert_ message */
  alert(message: string, ...args: any[]): void {
    if (this.#options.level > LogLevel.ALERT) return
    emit(Object.assign({}, this.#options, { level: LogLevel.ALERT }), message, ...args)
  }

  /** Emit an _error_ message */
  error(message: string, ...args: any[]): void {
    if (this.#options.level > LogLevel.ERROR) return
    emit(Object.assign({}, this.#options, { level: LogLevel.ERROR }), message, ...args)
  }
}
