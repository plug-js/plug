import { EOL } from 'os'
import { Plug } from '../pipe'
import { Run } from '../run'
import { inspect } from 'util'
import { isatty } from 'tty'

import { RGB, STYLE } from './colors'

/* ========================================================================== */

/** Our logging levels */
export enum LogLevel {
  DEBUG = 0,
  BASIC = 1,
  ALERT = 2,
  ERROR = 3,
  QUIET = 4,
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
  /** Emit a _debug_ message */
  debug(...args: [ any, ...any ]): void
  /** Emit an _alert_ message */
  alert(...args: [ any, ...any ]): void
  /** Emit an _error_ message */
  error(...args: [ any, ...any ]): void
} & Readonly<Omit<LogOptions, 'write'>>

/**
 * A `Log` configured for a `Run`.
 *
 * This is really just a marker type, to fail compilation when passing around
 * the wrong kind of `Log` between the various components.
 */
export type RunLog = Log & { readonly run: Run }

/**
 * A `Log` configured for `Plug` instances.
 *
 * This is really just a marker type, to fail compilation when passing around
 * the wrong kind of `Log` between the various components.
 */
export type PlugLog = Log & { readonly plug: Plug }

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
    plug: Plug | undefined,
    ...args: [ any, ...any ]
): void {
  // First check if we _really_ have to log this message
  if (level < options.level) return

  // Simplify wrinting colors here
  const colors = options.colors
  const strings: string[] = []
  const push = (col: STYLE | RGB | null, ...args: string[]): void => {
    colors && col ? strings.push(col, ...args) : strings.push(...args)
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
  if (level <= LogLevel.DEBUG) {
    push(RGB['#00005f'], '['); push(RGB['#5f5fff'], 'DEBUG'); push(RGB['#000087'], '] ')
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
    if (plug?.name) {
      push(RGB['#005f00'], '|')
      push(RGB['#00af00'], plug.name)
    }
    push(RGB['#005f00'], '} ')
  } else if (plug?.name) {
    push(RGB['#005f00'], '{')
    push(RGB['#00af00'], plug.name)
    push(RGB['#005f00'], '} ')
  }

  // Reset before giving control to "inspect"
  push(STYLE.RESET)

  // All other arguments
  for (let i = 0, arg = args[0]; i < args.length; arg = args[++ i]) {
    if (i) strings.push(arg instanceof Error ? EOL : ' ')
    strings.push(typeof arg === 'string' ? arg : inspect(arg, { colors }))
  }

  // Close up (always reset, convert to string, write)
  push(STYLE.RESET)
  options.write(strings.join(''))
}

/* ========================================================================== */

/* Create a `Log` for the given `Run` */
export function makeLog(run: Run): RunLog
/* Create a `Log` for the given `Run` and `Plug` instance */
export function makeLog(run: Run, plug: Plug): PlugLog
// overloaded function
export function makeLog(run?: Run, plug?: Plug): Log {
  return Object.defineProperties(emit.bind(undefined, LogLevel.BASIC, run, plug), {
    'debug': { value: emit.bind(undefined, LogLevel.DEBUG, run, plug) },
    'alert': { value: emit.bind(undefined, LogLevel.ALERT, run, plug) },
    'error': { value: emit.bind(undefined, LogLevel.ERROR, run, plug) },
    'colors': { value: options.colors },
    'level': { value: options.level },
    'times': { value: options.times },
    'plug': { value: plug },
    'run': { value: run },
  }) as Log
}

/* A shared log instance not associated with a particular `Run` or `Plug` */
export const log = makeLog(undefined as any)
