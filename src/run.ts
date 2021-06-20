import { Files } from './files'

/**
 * The `Run` interface describes a contract beteween `Plug`s and `Processor`s
 * and the underlying subsystem actually calling them.
 */
export interface Run {
  readonly taskNames: readonly string[]
}

/** A `Runnable` is a function producing a `Files` instance for a `Run` */
export interface Runnable {
  run(run: Run): Files | Promise<Files>
}
