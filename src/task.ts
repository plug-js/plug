import path from 'path'
import assert from 'assert'
import support from 'source-map-support'

import { Log, makeLog } from './log'

import { parseArguments } from './arguments'

import {
  assertArrayOf,
  assertString,
  assertTaskCall,
  isArray,
  isTask,
  isTaskCall,
} from './types'

/* ========================================================================== *
 * INTERNAL FUNCTIONS                                                         *
 * ========================================================================== */

// This is a bit of a _hairy_ function... We use V8's internal stack traces
// processing and sourcemap to get the original source file, line and column.
function caller(): string {
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
    return new Error().stack || /* istanbul ignore next */ '<unknown>'
  } finally {
    // Always restore the old "prepareStackTrace" call
    Error.prepareStackTrace = prepare
  }
}

// Get the name or description property out of a TaskCall possibly overriding it
function getProperty(prop: 'name' | 'description', override?: string, call?: Task | TaskCall): string {
  if (override !== undefined) return override
  if (call) return call[prop] || ''
  return ''
}

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
export type TaskCall = ((this: Task, context: TaskContext) => void | Promise<void>) & {
  /* The _optional_ description for this `TaskSource` */
  description?: string,
}

/* ========================================================================== *
 * EXPORTED "Task" INTERFACE AND CLASS                                        *
 * ========================================================================== */

/** Constructor options for `Task` */
export type TaskOptions = {
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
  /* The name of this `Task` */
  readonly name: string,
  /* The _optional_ description for this `Task` */
  readonly description?: string,
  /* The source location where this `Task` was defined */
  readonly location: string

  /* The `Log` instance associated with this `Task` */
  readonly log: Log
}

export class Task {
  #call?: TaskCall

  /** Empty constructor a `Task` */
  constructor()
  /** Constructor a `Task` with some options */
  constructor(options: TaskOptions)
  /** Constructor a `Task` for a callalble function */
  constructor(call: Task | TaskCall)
  /** Constructor a `Task` for a callalble function, declaring its name */
  constructor(name: string, call: Task | TaskCall)
  /** Constructor a `Task` for a callalble function, declaring its name and description */
  constructor(name: string, description: string, call: Task | TaskCall)

  /* Overloaded constructor */
  constructor(...args: (string | Task | TaskCall | TaskOptions)[]) {
    // Parse our constructor options
    const options = parseArguments<TaskOptions>('call', isTaskCall, args)

    // Name and descriptions can also come from the task/call
    const name = getProperty('name', options.name, options.call)
    const description = getProperty('description', options.description, options.call)

    assertString(name, 'Property "name" is not a string')
    assertString(description, 'Property "description" is not a string')

    // Call must be a valid TaskCall *or* overriden by classes extending this
    if (options.call) {
      const call = options.call
      if (isTask(call)) {
        this.#call = call.#call
      } else {
        assertTaskCall(options.call, 'Property "call" is not a "Task" instance or "TaskCall" function')
        this.#call = call
      }
    } else {
      assert(this.call !== Task.prototype.call, 'Task must be constructed with a "call" option or override the "call" method')
    }

    // The basics of a task....
    Object.defineProperties(this, {
      // Not enumerable, otherwise it'll have to be EVERYWHERE in tests!
      log: { enumerable: false, value: makeLog({ task: this })},
      location: { enumerable: false, value: caller() },
      // The task name is always an enumeragble property
      name: { enumerable: true, value: name },
    })

    // The description, optional, is enumerable, too!
    if (description) Object.defineProperty(this, 'description', { enumerable: true, value: description })
  }

  /** Call the `TaskCall` associated with this `Task` */
  async call(): Promise<void> {
    assert(this.#call, 'No "TaskCall" associated with this "Task"')
    try {
      await this.#call.call(this, { task: this, log: this.log })
    } catch (error) {
      return Promise.reject(error)
    }
  }
}

/* ========================================================================== *
 * EXPORTED "ParentTask" INTERFACE AND CLASS                                  *
 * ========================================================================== */

/** Constructor options for `ParentTask` */
export type ParentTaskOptions = Omit<TaskOptions, 'call'> & {
  /** An array of `Tasks` to be managed by the `ParentTask` */
  subtasks: Task[]
}

/**
 * The `ParentTask` type defines a `Task` parent for other _sub-tasks_.
 */
export interface ParentTask extends Task {
  /** The array of _sub-tasks_ managed by this `ParentTask` */
  readonly subtasks: Task[]
}

export abstract class ParentTask extends Task {
  /** Empty constructor a `ParentTask` */
  constructor()
  /** Constructor a `Task` with some options */
  constructor(options: ParentTaskOptions)
  /** Constructor a `Task` for a callalble function */
  constructor(subtasks: Task[])
  /** Constructor a `Task` for a callalble function, declaring its name */
  constructor(name: string, subtasks: Task[])
  /** Constructor a `Task` for a callalble function, declaring its name and description */
  constructor(name: string, description: string, subtasks: Task[])

  /* Overloaded constructor */
  constructor(...args: (string | Task[] | ParentTaskOptions)[]) {
    const options = parseArguments<ParentTaskOptions>('subtasks', isArray, args)

    // Construct the real task making sure we don't pass any call through
    super(Object.assign({}, options, { call: undefined }))

    // Keep a *COPY* of the Tasks specified at construction
    const subtasks = options.subtasks ? [ ...options.subtasks ] : []
    assertArrayOf(subtasks, Task, 'Property "subtasks" is not an array of "Task" instances')
    Object.defineProperty(this, 'subtasks', { enumerable: true, value: subtasks })
  }
}

/* ========================================================================== */

export class ParallelTask extends ParentTask {
  call() {
    const promises = this.subtasks.map((task) => task.call())
    return Promise.all(promises).then(() => void 0)
  }
}

export class SeriesTask extends ParentTask {
  call() {
    return this.subtasks.reduce((prev, task) => prev.then(() => task.call()), Promise.resolve())
  }
}
