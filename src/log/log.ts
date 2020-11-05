import assert from 'assert'

import { isatty } from 'tty'
import { EOL } from 'os'
import { inspect } from 'util'

import { STYLE, RGB } from './colors'
import { Plugin } from '../plugin'
import { Task } from '../task'

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
  /** The function used to write log entries, defaults to `console.log(...)` */
  write: null | ((data: string) => void)
  /** The _level_ of the messages to log (default: `LogLevel.NORMAL`) */
  level: LogLevel
  /** Whether to log the current time or not (default: `true`) */
  times: boolean
  /** Whether to colorize the output or not (default: `true` if standard output is a _TTY_) */
  colors: boolean
}

/** Our main `Log` type, defining a logger */
export type Log = ((message: string, ...args: any[]) => void) & LogOptions & {
  /** The options configured for the `Log` instance */
  options: Required<Readonly<LogOptions>>

  /** Emit a _debug_ message */
  debug(message: string, ...args: any[]): void
  /** Emit an _alert_ message */
  alert(message: string, ...args: any[]): void
  /** Emit an _error_ message */
  error(message: string, ...args: any[]): void
}

/* Logging context, describing where entries come from and are written to  */
export type LogContext = {
  /** The optional `Task` to contextualize log entries */
  task?: Task
  /** The optional `Plugin` to contextualize log entries */
  plugin?: Plugin
}

/* ========================================================================== */

/* The default configurations from command line */
/* istanbul ignore next -- let's keep this as a "manual" test */
const options: LogOptions = (() => {
  let colors = isatty((<any> process.stdout).fd)
  let level = LogLevel.NORMAL
  let times = true

  for (const option of process.argv) {
    switch (option) {
      case '--color': colors = true; break
      case '--no-color': colors = false; break

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

  return { colors, level, times, write: null }
})()

/* Emit a logging message, properly format */
function emit(level: LogLevel, context: LogContext, message: string, args: any[]) {
  // First check if we _really_ have to log this message
  if (level < options.level) return

  // Simplify wrinting colors here
  const strings: string[] = []
  const u = (what: string) => options.colors ? `${STYLE.UNDERLINE}${what}${STYLE.UNDERLINE_OFF}` : what
  const w = (col: STYLE | RGB | null, ...args: string[]) => {
    if (options.colors && col) strings.push(col)
    strings.push(...args)
  }

  // Options needed for properly logging messages...
  const taskName = context.task ? context.task.name || u('anonymous task') : null
  const pluginName = context.plugin ? context.plugin.name || u('anonymous plugin') : null

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
    w(null, inspect(arg, { colors: options.colors }))
  }

  // Close up (always reset, convert to string, write)
  w(STYLE.RESET)
  const write = options.write || console.log
  write(strings.join(''))
}

/* ========================================================================== */

/* Create a logger with the specified emission context */
export function makeLog(context: LogContext): Log {
  const log = (message: string, ...args: any[]) => emit(LogLevel.NORMAL, context, message, args)
  log.debug = (message: string, ...args: any[]) => emit(LogLevel.DEBUG, context, message, args)
  log.alert = (message: string, ...args: any[]) => emit(LogLevel.ALERT, context, message, args)
  log.error = (message: string, ...args: any[]) => emit(LogLevel.ERROR, context, message, args)

  // Implement our "LogOptions" properties
  return Object.defineProperties(log, {
    write: {
      enumerable: false,
      get: () => options.write,
      set(write: null | ((data: string) => void)) {
        if (write) assert(typeof write === 'function', 'Log writer not a function')
        options.write = write
      }
    },
    level: {
      enumerable: true,
      get: () => options.level,
      set(level: LogLevel) {
        level = parseInt(level.toString())
        if (isNaN(level)) level = LogLevel.NORMAL
        if (level < LogLevel.DEBUG) level = LogLevel.DEBUG
        if (level > LogLevel.QUIET) level = LogLevel.QUIET
        options.level = level
      }
    },
    colors: {
      enumerable: true,
      get: () => options.colors,
      set(colors: boolean) {
        options.colors = !!colors
      }
    },
    times: {
      enumerable: true,
      get: () => options.times,
      set(times: boolean) {
        options.times = !!times
      }
    },
  })
}

/* The exported Log, normally usable by anyone  */
const log: Log = makeLog({})
export default log
