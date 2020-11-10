import {
  Task,
  TaskCall,
  TaskOptions,
  ParentTaskOptions,
  ParallelTask,
  SeriesTask,
} from './task'

import { findCaller } from './utils'

import assert from 'assert'

import { assertString, assertTask, isTask, isTaskCall, isArray } from './types'
import { parseArguments } from './utils'

export type TaskList = (Task | TaskCall | string)[]

type TaskListOptions = Omit<ParentTaskOptions, 'subtasks'> & {
  subtasks?: TaskList
}

/* ========================================================================== */

function parseTaskList(args: (TaskList | string)[], tasks: Map<String, Task>): ParentTaskOptions {
  const options = parseArguments<TaskListOptions>('subtasks', isArray, args)
  const { name, description } = options

  const subtasks: Task[] = options.subtasks?.map((task) => {
    if (isTask(task)) return task
    if (isTaskCall(task)) return new Task(task)
    assertString(task)
    const t = tasks.get(task)
    assert(t, `Unknown task "${task}"`)
    return t
  }) || []

  return { name, description, subtasks }
}


/**
 * The `Plug` interface defines our main registry for `Tasks`
 */
export interface Plug {
  readonly tasks: readonly Task[]



  /* ------------------------------------------------------------------------ */

}

/* ========================================================================== */

export class Plug implements Plug {
  #tasks: Map<string, Task> = new Map()

  constructor() {
    Object.defineProperty(this, 'tasks', { get: () => Array.from(this.#tasks.values()) })
  }

  task(task: TaskCall): Task
  task(name: string, task: TaskCall): Task
  task(name: string, description: string, task: TaskCall): Task

  /* Overloaded `task(...)` definition */
  task(...args: (TaskCall | string)[]): Task {
    const options = parseArguments<TaskOptions>('call', isTaskCall, args)
    const task = new Task(options)

    if (task.name) this.import(task);
    return task
  }

  /* ------------------------------------------------------------------------ */

  /* Overloaded `import(...) definition */
  import(...tasks: Task[]): this {
    for (let task of tasks) {
      assertTask(task)
      assert(task.name, `Cowardly refusing to import an anonymous task\n  declared at: ${task.location}`)

      const prev = this.#tasks.get(task.name)
      if (prev && (prev !== task)) {
        let message = `Duplicate task with name "${task.name}"\n`
        message += `  previously declared at: ${prev.location}\n`
        message += `  current declaration at: ${task.location}`
        throw new assert.AssertionError({ message })
      }
      this.#tasks.set(task.name, task)
    }

    return this
  }

  /* ------------------------------------------------------------------------ */

  parallel(tasks: TaskList): ParallelTask
  parallel(name: string, tasks: TaskList): ParallelTask
  parallel(name: string, description: string, tasks: TaskList): ParallelTask

  /* Overloaded `parallel(...)` definition */
  parallel(...args: (TaskList | string)[]): ParallelTask {
    const task = new ParallelTask(parseTaskList(args, this.#tasks))
    if (task.name) this.import(task)
    return task
  }

  /* ------------------------------------------------------------------------ */

  series(tasks: TaskList): SeriesTask
  series(name: string, tasks: TaskList): SeriesTask
  series(name: string, description: string, tasks: TaskList): SeriesTask

  /* Overloaded `series(...)` definition */
  series(...args: (TaskList | string)[]): SeriesTask {
    const task = new SeriesTask(parseTaskList(args, this.#tasks))
    if (task.name) this.import(task)
    return task
  }
}
