import type { Plug } from '../pipe'
import type { Run } from '../run'

import { RGB, STYLE } from './colors'
import { inspect } from 'util'
import { isatty } from 'tty'

/* ========================================================================== */

/* Our type to process time markers */
const start = Symbol()
type Marker = { [start]: bigint }

/** Our logging levels */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  BASIC = 2,
  ALERT = 3,
  ERROR = 4,
  QUIET = 5,
}

/** Options to customize logging */
export interface LogOptions {
  /** The function used to write log entries, defaults to `console.log(...)` */
  write: ((data: string) => void)
  /** The _level_ of the messages to log (default: `LogLevel.NORMAL`) */
  level: LogLevel
  /** Whether to log the current time or not (default: `true`) */
  times: boolean
  /** Whether to colorize the output or not (default: `true` if standard output is a _TTY_) */
  colors: boolean
}

/** The main `Log` */
export type Log = ((...args: [ any, ...any ]) => void) & {
  /** Emit a _trace_ message */
  trace(...args: [ any, ...any ]): void
  /** Emit a _debug_ message */
  debug(...args: [ any, ...any ]): void
  /** Emit an _alert_ message */
  alert(...args: [ any, ...any ]): void
  /** Emit an _error_ message */
  error(...args: [ any, ...any ]): void
  /** Write to the log output (mainly for reporting) */
  write(data: string): void
  /** Obtain a marker for logging times */
  start(): Marker
} & Readonly<Omit<LogOptions, 'write'>>

/* ========================================================================== */

/* The default configurations from command line */
export const options: LogOptions = (() => {
  // eslint-disable-next-line no-console
  const write = console.log
  const colors = isatty((<any> process.stdout).fd)
  const times = true

  let level = LogLevel.BASIC
  // istanbul ignore next - processed at strtup...
  switch (process.env.LOG_LEVEL?.toUpperCase()) {
    case 'TRACE': level = LogLevel.TRACE; break
    case 'DEBUG': level = LogLevel.DEBUG; break
    case 'INFO': // alias
    case 'BASIC': level = LogLevel.BASIC; break
    case 'WARN': // alias
    case 'ALERT': level = LogLevel.ALERT; break
    case 'ERROR': level = LogLevel.ERROR; break
    case 'SILENT': // alias
    case 'QUIET': level = LogLevel.QUIET; break
  }

  return { write, level, times, colors }
})()

/* Emit a logging message, properly format */
function emit(
    level: LogLevel,
    run: Run | undefined,
    plug: string | undefined,
    ...args: any[]
): void {
  // First check if we _really_ have to log this message
  if (level < options.level) return
  if (args.length === 0) return

  // Simplify writing with colors, and writing lines
  const colors = options.colors
  const strings: string[] = []
  function push(col: STYLE | RGB | null, ...args: string[]): void {
    colors && col ? strings.push(col, ...args) : strings.push(...args)
  }
  function line(): void {
    push(STYLE.RESET)
    options.write(strings.join(''))
  }

  // Reset our color at the beginning of the line
  push(STYLE.RESET)

  // The current time, if we have to
  if (options.times) {
    const now = new Date()
    push(RGB['#8a8a8a'], now.getHours().toString().padStart(2, '0'))
    push(RGB['#585858'], ':')
    push(RGB['#8a8a8a'], now.getMinutes().toString().padStart(2, '0'))
    push(RGB['#585858'], ':')
    push(RGB['#8a8a8a'], now.getSeconds().toString().padStart(2, '0'))
    push(RGB['#585858'], ':')
    push(RGB['#8a8a8a'], now.getMilliseconds().toString().padStart(3, '0'))
    push(null, ' ')
  }

  // A label unless this is a normal _log_ entry...
  if (level <= LogLevel.TRACE) {
    push(RGB['#005f5f'], '['); push(RGB['#00afaf'], 'TRACE'); push(RGB['#005f5f'], '] ')
  } else if (level <= LogLevel.DEBUG) {
    push(RGB['#0000af'], '['); push(RGB['#5f5fff'], 'DEBUG'); push(RGB['#0000af'], '] ')
  } else if (level >= LogLevel.ERROR) {
    push(RGB['#5f0000'], '['); push(RGB['#ff0000'], 'ERROR'); push(RGB['#5f0000'], '] ')
  } else if (level >= LogLevel.ALERT) {
    push(RGB['#5f5f00'], '['); push(RGB['#ffff00'], 'ALERT'); push(RGB['#5f5f00'], '] ')
  }

  // Tasks and plug
  if (run?.tasks.length) {
    for (let i = 0; i < run.tasks.length; i ++) {
      push(RGB['#005f00'], i ? '|' : '{')
      push(RGB['#00ff00'], run.project.getTaskName(run.tasks[i]))
    }
    // w(RGB['#00ff00'], taskName)
    if (plug) {
      push(RGB['#005f00'], '|')
      push(RGB['#00af00'], plug)
    }
    push(RGB['#005f00'], '} ')
  } else if (plug) {
    push(RGB['#005f00'], '{')
    push(RGB['#00af00'], plug)
    push(RGB['#005f00'], '} ')
  }

  // Reset before giving control to "inspect"
  push(STYLE.RESET)

  // Emit all arguments...
  for (let i = 0, arg = args[0]; i < args.length; arg = args[++ i]) {
    // Break lines on errors, be nice
    if (arg instanceof Error) {
      if (i == 0) { // first in arguments? emit error
        push(null, inspect(arg, { colors }))
        line()
      } else { // not the first? break this line and emit the error
        line()
        emit(level, run, plug, arg)
      }
      // error is emitted, if we have further arguments emit them too
      if ((++i) < args.length) emit(level, run, plug, ...args.slice(i))
      return // nothing else to be done here...
    }

    // Not an error, add a space and continue...
    if (i) strings.push(' ')
    if (arg && (typeof arg === 'object') && (start in arg)) {
      const nanos = process.hrtime.bigint() - arg[start]
      const millis = Number(nanos / 1000n) / 1000
      strings.push(inspect(millis, { colors }), ' ms')
    } else if (typeof arg === 'string') {
      strings.push(arg)
    } else {
      strings.push(inspect(arg, { colors }))
    }
  }

  // Close up (always reset, convert to string, write)
  line()
}

/* ========================================================================== */

/* Create a `Log` for the given `Run` */
export function makeLog(run: Run): Log
/* Create a `Log` for the given `Run` and `Plug` instance */
export function makeLog(run: Run, plug: Plug): Log
// overloaded function
export function makeLog(run?: Run, { name: plug } = {} as Plug): Log {
  const log = (...args: any[]): void => emit(LogLevel.BASIC, run, plug, ...args)
  log.trace = (...args: any[]): void => emit(LogLevel.TRACE, run, plug, ...args)
  log.debug = (...args: any[]): void => emit(LogLevel.DEBUG, run, plug, ...args)
  log.alert = (...args: any[]): void => emit(LogLevel.ALERT, run, plug, ...args)
  log.error = (...args: any[]): void => emit(LogLevel.ERROR, run, plug, ...args)
  log.write = (what: string) => options.level < LogLevel.QUIET ? options.write(what) : undefined
  log.start = () => ({ [start]: process.hrtime.bigint() })
  log.colors = options.colors
  log.level = options.level
  log.times = options.times
  return log
}

/* A shared log instance not associated with a particular `Run` or `Plug` */
export const log = makeLog(undefined as any)
