import { randomBytes } from 'crypto'
import { inspect } from 'util'
import type { Files } from './files'
import type { Task } from './task'

/**
 * The `Run` class describes a contract beteween `Plug`s and `Processor`s
 * and the underlying subsystem actually calling them.
 */
export class Run {
  readonly id!: RunId
  readonly tasks!: readonly Task[]

  constructor() // hide the next constructor
  constructor(...args: [ Run, Task ] | []) {
    const [ run, task ] = args

    const id = run ? run.id : new RunId()
    const tasks = run ? [ ...run.tasks ] : []
    if (task) tasks.push(task)

    Object.defineProperties(this, {
      'id': { value: id, enumerable: true },
      'tasks': { value: tasks },
    })
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

  [inspect.custom](): string {
    return this.#id
  }
}
