import type { Files } from './files'
import type { Plug } from './pipe'
import type { Task } from './task'
import { Log, makeLog, PlugLog, RunLog } from './utils/log'
import { randomBytes } from 'crypto'

/**
 * The `Run` class describes a contract beteween `Plug`s and `Processor`s
 * and the underlying subsystem actually calling them.
 */
export class Run {
  #log?: RunLog
  #plugLogs = new WeakMap<Plug, PlugLog>()

  readonly id!: RunId
  readonly tasks!: readonly Task[]

  constructor() // hide the (real) next constructor
  constructor(...args: [] | [ Run, Task ]) {
    const [ run, task ] = args

    const id = run ? run.id : new RunId()
    const tasks = run ? [ ...run.tasks ] : []
    if (task) tasks.push(task)

    Object.defineProperties(this, {
      'id': { value: id, enumerable: true },
      'tasks': { value: tasks },
    })
  }

  log(): RunLog
  log(plug: Plug): PlugLog
  log(plug?: Plug): Log {
    if (plug) {
      let log = this.#plugLogs.get(plug)
      if (! log) this.#plugLogs.set(plug, log = makeLog(this, plug))
      return log
    } else {
      if (this.#log) return this.#log
      return this.#log = makeLog(this)
    }
  }

  for(task: Task): Run {
    return new (<any> Run)(this, task)
  }
}

/** The `Runnable` interface defines a way to produce `Files` for a `Run` */
export interface Runnable {
  run(run: Run): Files | Promise<Files>
}

// A run id, as an object for weak maps
class RunId {
  #id = randomBytes(8).toString('hex')

  toString(): string {
    return this.#id
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.#id
  }
}
