import path from 'path'
import assert from 'assert'
import support from 'source-map-support'

import { Log, makeLog } from './log/log'

import { assertTask, assertTaskCall, assertString, assertArray } from './types'

/* ========================================================================== *
 * TYPES                                                                      *
 * ========================================================================== */

 /**
 * A `Task`'s own _execution context_, passed to a `TaskCall` when invoked.
 */
export interface TaskContext {
  /** The instance of the task being executed */
  readonly task: Task
  /** A logger configured for the task being executed */
  readonly log: Log
}

/**
 * A `TaskCall` is the basic foundation of a `Task`: a function callable with
 * a `TaskContext` as its only argument.
 */
export type TaskCall = ((this: void, context: TaskContext) => void | Promise<void>) & {
  /* The _optional_ description for this `TaskSource` */
  description?: string,
}

/** Constructor options for `Task` */
export type TaskConstructorOptions = {
  /**
   * The `TaskCall` to be wrapped by this `Task`
   *
   * This can be `undefined` if the `Task` overrides the `call(...)` method
   */
  call?: TaskCall,
  /** The (optiona) _name_ for the `Task` */
  name?: string,
  /** The (optiona) _description_ for the `Task` */
  description?: string
}

/**
 * The `Task` type defines a `TaskCallable` associated with a optional
 * description and optional list of _sub-tasks_.
 */
export interface Task {
  /* Constructor for all `Task` types */
  new (options: TaskConstructorOptions): Task

  /* The name of this `Task` */
  readonly name: string,
  /* The _optional_ description for this `Task` */
  readonly description?: string,
  /* The source location where this `Task` was defined */
  readonly location?: string
}

/** Constructor options for `ParentTask` */
export type ParentTaskConstructorOptions = Omit<TaskConstructorOptions, 'call'> & {
  /** An array of `Tasks` to be managed by the `ParentTask` */
  subtasks: Task[]
}

/**
 * The `ParentTask` type defines a `Task` parent for other _sub-tasks_.
 */
export interface ParentTask extends Task {
  /* Constructor for all `ParentTask` types */
  new (options: ParentTaskConstructorOptions): ParentTask

  /** The array of _sub-tasks_ managed by this `ParentTask` */
  readonly subtasks: Task[]
}

export type TaskList = (Task | TaskCall | string)[]

/* ========================================================================== *
 * INTERNAL FUNCTIONS                                                         *
 * ========================================================================== */

// This is a bit of a _hairy_ function... We use V8's internal stack traces
// processing and sourcemap to get the original source file, line and column.
function caller(): string | undefined {
  // Save the old "prepareStackTrace", likely from "source-map-support"
  const prepare = Error.prepareStackTrace
  try {
    // Inject our new "prepareStackTrace"
    Error.prepareStackTrace = (err, traces) => {
      for (const trace of traces) {
        const source = trace.getFileName()
        // The first location outside of this directory tree is the one matching
        if (source && (! source.startsWith(__dirname + path.sep))) {
          // Use "sourceMapSupport" to map the optionally source-mapped position
          const { source: file, line, column } = support.mapSourcePosition({
            line: trace.getLineNumber() || /* istanbul ignore next */ -1,
            column: trace.getColumnNumber() || /* istanbul ignore next */ -1,
            source,
          })
          // Done, return something compatible with TaskLocation
          const relative = path.relative(process.cwd(), file)
          const resolved = relative.startsWith('..') ? /* istanbul ignore next */ file : relative
          return `${resolved}:${line}:${column}`
        }
      }
    }

    // Create a new stack and return what we got above
    return new Error().stack
  } finally {
    // Always restore the old "prepareStackTrace" call
    Error.prepareStackTrace = prepare
  }
}

// Parse arguments for a parallel/series declaration
function parse(args: (TaskList | string)[]) {
  assert(args.length > 0, 'No arguments specified')

  // The task list is *always* the last argument, sooooo
  const list = args.pop()
  assert(Array.isArray(list), `Tasks list must be an Array: ${typeof list}`)

  // Name and description can be desctructured from the remaining arguments
  const [ name =  '', description = '' ] = args
  assert(typeof name === 'string', `Name must be a string: ${typeof name}`)
  assert(typeof description === 'string', `Description must be a string: ${typeof description}`)

  return { name, description, list }
}

// Get the name or description property out of a TaskCall possibly overriding it
function getProperty(prop: 'name' | 'description', override?: string, call?: TaskCall): string {
  if (override !== undefined) return override
  if (call) return call[prop] || ''
  return ''
}

/* ========================================================================== *
 * EXPORTED "Task" CLASS                                                      *
 * ========================================================================== */

 /* WeakMap of task => taskCall */
const calls = new WeakMap<Task, TaskCall | undefined>()

export class Task {
  /**
   * Create a new `Task` by wrapping a `TaskCall` _function_.
   */
  constructor({ call, name, description }: TaskConstructorOptions) {
    // assertTaskCall(call, 'Property "call" is not a "TaskCall"')
    calls.set(this, call)

    name = getProperty('name', name, call)
    description = getProperty('description', description, call)

    // Name and description can be desctructured from the remaining arguments
    assertString(name, 'Property "name" is not a string')
    assertString(description, 'Property "description" is not a string')

    // The basics of a task....
    Object.defineProperties(this, {
      // Not enumerable, otherwise it'll have to be EVERYWHERE in tests!
      location: { enumerable: false, value: caller() },
      // The task name is always an enumeragble property
      name: { enumerable: true, value: name },
    })

    // The description, optional, is enumerable, too!
    if (description) Object.defineProperty(this, 'description', { enumerable: true, value: description })
  }

  call(context: TaskContext) {
    const call = calls.get(this)
    assertTaskCall(call, 'No "TaskCall" associated with this "Task"')
    return call.call(undefined, context)
  }
}

export abstract class ParentTask extends Task {
  constructor(options: ParentTaskConstructorOptions) {
    // This is our parent task call, just log if we have no sub-tasks
    // const parentCall = (context: TaskContext) => {
    //   if (this.subtasks.length > 0) return call(context)
    //   context.log.alert('Parent task has no subtasks')
    // }

    // Construct the real task making sure we don't pass the call through
    super(Object.assign({}, options, { call: undefined }))

    assertArray(options.subtasks, 'Subtasks must be specified in an Array')

    // Triple check that we only have tasks
    const subtasks = options.subtasks.map((task) => {
      assertTask(task, `A "ParentTask"'s sub-task must be a "Task"`)
      return task
    })

    // Define our list of sub-tasks
    Object.defineProperty(this, 'subtasks', { enumerable: true, value: subtasks })
  }

  abstract call(context: TaskContext): void | Promise<void>
}

export abstract class ParallelTask extends ParentTask {
  constructor(options: ParentTaskConstructorOptions) {
    // This is our task call, parallel execution of tasks
    const call = (context: TaskContext) => {
      const promises = this.subtasks.map((task) => task.call(context))
      return Promise.all(promises).then(() => void 0)
    }

    // Construct the parent task
    super(Object.assign({ call }, options))
  }
}

export abstract class SerialTask extends ParentTask {
  constructor(options: ParentTaskConstructorOptions) {
    // This is our task call, serial execution of tasks
    const call = (context: TaskContext) => {
      return this.subtasks.reduce((prev, task) => prev.then(() => task.call(context)), Promise.resolve())
    }

    // Construct the parent task
    super(Object.assign({ call }, options))
  }
}
