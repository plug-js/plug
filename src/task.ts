import assert from 'assert'
import { NonEmptyArray, assertNonEmptyArray } from './types'

/* ========================================================================== */

/**
 * A `Task`'s own _execution context_, passed to a `Task` when being invoked.
 *
 * The `name` is declared here as tasks are simple functions which should be
 * invoked with a `void this`.
 */
export interface TaskContext {
  /** The _name_ of the task being executed */
  readonly name: string,

  /** Emit a _debug_ message within the context of the execution of a `Task` */
  debug(message: string, ...args: any[]): void
  /** Emit an _alert_ message within the context of the execution of a `Task` */
  alert(message: string, ...args: any[]): void
  /** Emit an _error_ message within the context of the execution of a `Task` */
  error(message: string, ...args: any[]): void

  /** Emit a message within the context of the execution of a `Task` */
  log(message: string, ...args: any[]): void
}

/**
 * The `Task` type defines a callable (possibly asynchronous) function to
 * be invoked when tasks are executed.
 */
export type Task = ((this: void, context: TaskContext) => void | Promise<void>) & {
  /* The _optional_ description for this `Task` */
  readonly description?: string,
  /* Any _sub-task_ included by this `Task` */
  readonly subtasks?: NonEmptyArray<Task>,
}

/* ========================================================================== */

/* Internal function to parse the arguments of `task`, `parallel` or `series` */
function combine(nameOrTask: string | Task, descriptionOrTask: undefined | string | Task, tasks: Task[]) {
  let name: string | undefined, description: string | undefined

  /* Check our tasks */
  tasks.forEach((task) => assert.strictEqual(typeof task, 'function', 'Task is not a function'))

  /* Check the (optional) description */
  if (typeof descriptionOrTask === 'function') {
    tasks.unshift(descriptionOrTask)
  } else if (typeof descriptionOrTask === 'string') {
    description = descriptionOrTask
  } else {
    assert.strictEqual(typeof descriptionOrTask, 'undefined', 'Second parameter must be a Task or description string')
  }

  /* Check the (optional) name */
  if (typeof nameOrTask === 'function') {
    tasks.unshift(nameOrTask)
  } else if (typeof nameOrTask === 'string') {
    name = nameOrTask
  } else {
    assert.strictEqual(typeof nameOrTask, 'undefined', 'First parameter must be a Task or name string')
  }

  /* Check that we have at least one task to combine and return */
  assertNonEmptyArray(tasks, 'No tasks specified')
  return { name, description, tasks }
}

/* ========================================================================== */

/**
 * Create a new `Task` by wrapping a _function_.
 *
 * @param task - The _function_ to be wrapped by the `Task`
 */
export function task(task: Task): Task

/**
 * Create a new named `Task` by wrapping a _function_.
 *
 * @param name - The _name_ to give to the `Task`
 * @param task - The _function_ to be wrapped by the `Task`
 */
export function task(name: string, task: Task): Task

/**
 * Create a new named `Task` with a description by wrapping a _function_.
 *
 * @param name - The _name_ to give to the `Task`
 * @param description - The _description_ to give to the `Task`
 * @param task - The _function_ to be wrapped by the `Task`
 */
export function task(name: string, description: string, task: Task): Task

/* -------------------------------------------------------------------------- */

/* Overloaded `task(...)` definition */
export function task(nameOrTask: string | Task, descriptionOrTask?: string | Task, extraTask?: Task): Task {
  const { name, description, tasks } = combine(nameOrTask, descriptionOrTask, extraTask ? [ extraTask ] : [])

  /* Wrap the task into a local function so we can have a new name, description */
  const call = tasks[0]
  const task = (context: TaskContext) => call(context)

  /* We always want to have a name for the task */
  Object.defineProperty(task, 'name', { value: name != undefined ? name : call.name || '' })

  /* Description is optional, and injected only if available */
  const taskDescription = description != undefined ? description : call.description || ''
  if (taskDescription) Object.defineProperty(task, 'description', { value: taskDescription })

  /* Done */
  return task
}

/* ========================================================================== */

/**
 * Create a new `Task` executing a number of _sub-tasks_ in parallel.
 *
 * @param tasks - The _functions_ to be wrapped by the `Task`
 */
export function parallel(...tasks: NonEmptyArray<Task>): Task

/**
 * Create a new named `Task` executing a number of _sub-tasks_ in parallel.
 *
 * @param name - The _name_ to give to the `Task`
 * @param tasks - The _functions_ to be wrapped by the `Task`
 */
export function parallel(name: string, ...tasks: NonEmptyArray<Task>): Task

/**
 * Create a new named `Task` with a description executing a number of
 * _sub-tasks_ in parallel.
 *
 * @param name - The _name_ to give to the `Task`
 * @param tasks - The _functions_ to be wrapped by the `Task`
 */
export function parallel(name: string, description: string, ...tasks: NonEmptyArray<Task>): Task

/* -------------------------------------------------------------------------- */

/* Overloaded `parallel(...)` definition */
export function parallel(nameOrTask: string | Task, descriptionOrTask?: string | Task, ...extraTasks: Task[]): Task {
  const { name = '', description = '', tasks } = combine(nameOrTask, descriptionOrTask, extraTasks)

  const parent = task(name, description, async (context: TaskContext) => {
    await Promise.all(tasks.map(async (task) => await task(context)))
  })

  Object.defineProperty(parent, 'subtasks', { value: Object.freeze(tasks) })
  return parent
}

/* ========================================================================== */

/**
 * Create a new `Task` executing a number of _sub-tasks_ in series.
 *
 * @param tasks - The _functions_ to be wrapped by the `Task`
 */
export function series(...tasks: NonEmptyArray<Task>): Task

/**
 * Create a new named `Task` executing a number of _sub-tasks_ in series.
 *
 * @param name - The _name_ to give to the `Task`
 * @param tasks - The _functions_ to be wrapped by the `Task`
 */
export function series(name: string, ...tasks: NonEmptyArray<Task>): Task

/**
 * Create a new named `Task` with a description executing a number of
 * _sub-tasks_ in series.
 *
 * @param name - The _name_ to give to the `Task`
 * @param tasks - The _functions_ to be wrapped by the `Task`
 */
export function series(name: string, description: string, ...tasks: NonEmptyArray<Task>): Task

/* -------------------------------------------------------------------------- */

/* Overloaded `series(...)` definition */
export function series(nameOrTask: string | Task, descriptionOrTask?: string | Task, ...extraTasks: Task[]): Task {
  const { name = '', description = '', tasks } = combine(nameOrTask, descriptionOrTask, extraTasks)

  const parent = task(name, description, async (context: TaskContext) => {
    await tasks.reduce((prev, task) => prev.then(() => task(context)), Promise.resolve())
  })

  Object.defineProperty(parent, 'subtasks', { value: Object.freeze(tasks) })
  return parent
}
