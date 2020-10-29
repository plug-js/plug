import { isatty } from 'tty'
import { EOL } from 'os'
import { inspect } from 'util'

import { STYLE, RGB } from './colors'

/* ========================================================================== */

/** Our logging levels */
export enum LogLevel {
  DEBUG = 0,
  NORMAL = 1,
  ALERT = 2,
  ERROR = 3,
  QUIET = 4,
}

/** Options to customize the logger */
export interface LogOptions {
  /** The _level_ of the messages to log (default: `LogLevel.NORMAL`) */
  level?: LogLevel
  /** Whether to log the current time or not (default: `true`) */
  times?: boolean
  /** Whether to colorize the output or not (default: `true` if standard output is a _TTY_) */
  color?: boolean
  /** The _name_ of the `Task` to log before any other message */
  taskName?: string | null
  /** The _name_ of the `Plugin` to log before any other message */
  pluginName?: string | null
}

/** Our logging function, with sub-functions for various gravity */
export type Log = ((message: string, ...args: any[]) => void) & {
  /** The options configured for this `Log` instance */
  readonly options: Required<Readonly<LogOptions>>

  /** Emit a _debug_ message */
  debug(message: string, ...args: any[]): void
  /** Emit an _alert_ message */
  alert(message: string, ...args: any[]): void
  /** Emit an _error_ message */
  error(message: string, ...args: any[]): void
}

/** A log for testing purposes */
export type TestLog = Log & {
  /** An array of logs entries logged by this `Log`, reset upon read */
  readonly logs: string[]
}

/* ========================================================================== */

/* The `EmitOptions` type encloses what's required to _emit_ a log entry */
type EmitOptions = Required<LogOptions> & {
  write: (data: string) => void
}

/* The default configurations from command line */
/* istanbul ignore next -- let's keep this as a "manual" test */
const defaults: EmitOptions = (() => {
  let color = isatty((<any> process.stdout).fd)
  let level = LogLevel.NORMAL
  let times = true

  for (const option of process.argv) {
    switch (option) {
      case '--color': color = true; break
      case '--no-color': color = false; break

      case '--times': times = true; break
      case '--no-times': times = false; break

      case '--verbose': level -= 1; break
      case '--quiet': level += 1; break

      default:
        if (/^-q+$/.test(option)) level += (option.length - 1)
        if (/^-v+$/.test(option)) level -= (option.length - 1)
        break
    }
  }

  if (level < LogLevel.DEBUG) level = LogLevel.DEBUG
  if (level > LogLevel.QUIET) level = LogLevel.QUIET

  const write = console.log.bind(console)
  return { color, level, times, write, taskName: null, pluginName: null }
})()

/* Emit a logging message, properly format */
function emit(level: LogLevel, options: EmitOptions, message: string, args: any[]) {
  // First check if we _really_ have to log this message
  if (level < options.level) return

  // Options needed for properly logging messages...
  const { color, taskName, pluginName, write } = options

  // Simplify wrinting colors here
  const strings: string[] = []
  const w = (col: STYLE | RGB | null, ...args: string[]) => {
    if (color && col) strings.push(col)
    strings.push(...args)
  }

  // Reset our color at the beginning of the line
  w(STYLE.RESET)

  // The current time, if we have to
  if (options.times) {
    const now = new Date()
    w(RGB['#8a8a8a'], now.getHours().toString().padStart(2, '0'))
    w(RGB['#585858'], ':')
    w(RGB['#8a8a8a'], now.getMinutes().toString().padStart(2, '0'))
    w(RGB['#585858'], ':')
    w(RGB['#8a8a8a'], now.getSeconds().toString().padStart(2, '0'))
    w(RGB['#585858'], ':')
    w(RGB['#8a8a8a'], now.getMilliseconds().toString().padStart(3, '0'))
    w(null, ' ')
  }

  // A label unless this is a normal _log_ entry...
  if (level <= LogLevel.DEBUG) {
    w(RGB['#00005f'], '['); w(RGB['#5f5fff'], 'DEBUG'); w(RGB['#000087'], '] ')
  } else if (level >= LogLevel.ERROR) {
    w(RGB['#5f0000'], '['); w(RGB['#ff0000'], 'ERROR'); w(RGB['#5f0000'], '] ')
  } else if (level >= LogLevel.ALERT) {
    w(RGB['#5f5f00'], '['); w(RGB['#ffff00'], 'ALERT'); w(RGB['#5f5f00'], '] ')
  }

  // Task and plugin
  if (taskName) {
    w(RGB['#005f00'], '{')
    w(RGB["#00ff00"], taskName)
    if (pluginName) {
      w(RGB['#005f00'], '|')
      w(RGB['#00af00'], pluginName)
    }
    w(RGB['#005f00'], '} ')
  }

  // Message, the least with "w(...)"
  w(STYLE.RESET, message)

  // All other arguments
  for (const arg of args) {
    w(null, arg instanceof Error ? EOL : ' ')
    w(null, inspect(arg, { colors: color }))
  }

  // Close up (always reset, convert to string, write)
  w(STYLE.RESET)
  write(strings.join(''))
}

/* ========================================================================== */

export function makeLog(maybeOptions: LogOptions = {}): Log {
  const options = Object.assign({}, defaults, maybeOptions)

  /* Logging at various levels */
  const log = (message: string, ...args: any[]) => emit(LogLevel.NORMAL, options, message, args)
  log.debug = (message: string, ...args: any[]) => emit(LogLevel.DEBUG, options, message, args)
  log.alert = (message: string, ...args: any[]) => emit(LogLevel.ALERT, options, message, args)
  log.error = (message: string, ...args: any[]) => emit(LogLevel.ERROR, options, message, args)

  /* Options */
  log.options = Object.freeze({
    level: options.level,
    color: options.color,
    times: options.times,
    taskName: options.taskName,
    pluginName: options.pluginName,
  })

  /* Return our log */
  return log
}

export function makeTestLog(maybeOptions: LogOptions = {}): TestLog {
  const logs: string[] = []

  const options = Object.assign({
    write: logs.push.bind(logs),
    level: LogLevel.DEBUG,
    color: false,
    times: false,
    taskName: null,
    pluginName: null,
  }, maybeOptions)

  return Object.defineProperty(makeLog(options), 'logs', { get: () => logs.splice(0) })
}
