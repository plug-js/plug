import type { Files } from './files'
import type { Task } from './task'

/**
 * The `Run` interface describes a contract beteween `Plug`s and `Processor`s
 * and the underlying subsystem actually calling them.
 */
export interface Run {
  readonly id: Symbol
  readonly tasks: readonly Task[]

  for(task: Task): Run
}

/** The `Runnable` interface defines a way to produce `Files` for a `Run` */
export interface Runnable {
  run(run: Run): Files | Promise<Files>
}

/** Create a new `Run` */
export function run(task: Task): Run {
  return new RunImpl(task)
}

// Internal implementation of the `Run` interface
class RunImpl implements Run {
  readonly id!: Symbol
  readonly tasks!: readonly Task[]

  constructor(task: Task, run?: Run) {
    const id = run ? run.id : Symbol()
    const tasks = run ? [ ...run.tasks, task ] : [ task ]

    Object.defineProperties(this, {
      'id': { value: id },
      'tasks': { value: tasks },
    })
  }

  for(task: Task): Run {
    return new RunImpl(task, this)
  }
}
