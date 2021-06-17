import assert from 'assert'
import type { Plug, Run } from '.'
import { VirtualFileList } from './files'
import { Pipe } from './pipe'
import { getProjectDirectory, getTaskName } from './project'

export type TaskCall = (() => Pipe) & {
  readonly run: (input?: VirtualFileList) => Promise<VirtualFileList>
  readonly task: Task
}

function makeCall(task: Task): TaskCall {
  // Our task call returns a Pipe initially plugged with the task's process
  const call = (): Pipe => Pipe.pipe(task.process.bind(task))
  // The "run()" (convenience) method runs the task from the project directory
  call.run = async (input?: VirtualFileList) =>
    task.process(input || new VirtualFileList(getProjectDirectory()), new TaskRun())
  // And we just remember our task, too, before returning
  call.task = task
  return call
}

class TaskRun implements Run {
  taskNames: readonly string[]

  constructor()
  constructor(run: Run, task: Task)
  constructor(run?: Run, task?: Task) {
    this.taskNames = run ? [ ...run.taskNames, getTaskName(task!) ] : []
  }
}

class Parallel implements Plug {
  #tasks: TaskCall[]

  constructor(tasks: TaskCall[]) {
    this.#tasks = tasks
  }

  async process(input: VirtualFileList, run: Run): Promise<VirtualFileList> {
    // Start each of our taks, processing the same file list, our input
    const promises = this.#tasks.map((task) => task.task.process(input, run))
    // Make sure all tasks run correctly and get all output file lists
    const outputs = await Promise.all(promises)

    // Create a new file list cloning our input
    const result = input.clone()
    // Each file of each output gets added to our output list (in order)
    outputs.forEach((output) => output.list().forEach((file) => result.add(file)))
    // Return our combined result list
    return result
  }
}

export class Task implements Plug {
  #description: string | undefined
  #source: () => Plug

  private constructor(description: string | undefined, source: () => Plug) {
    this.#description = description || undefined // empty string
    this.#source = source
  }

  get description(): string | undefined {
    return this.#description
  }

  process(input: VirtualFileList, run: Run): VirtualFileList | Promise<VirtualFileList> {
    return this.#source().process(input, new TaskRun(run, this))
  }

  /* ======================================================================== */

  static task(source: () => Plug): TaskCall
  static task(description: string, source: () => Plug): TaskCall

  static task(descriptionOrSource: string | (() => Plug), optionalSource?: () => Plug): TaskCall {
    const { description, source } = typeof descriptionOrSource === 'string' ?
        { description: descriptionOrSource, source: optionalSource } :
        { description: undefined, source: descriptionOrSource }
    assert(source, 'Task source missing')
    return makeCall(new Task(description, source))
  }

  /* ======================================================================== */

  static parallel(...tasks: [ TaskCall, ...TaskCall[] ]): TaskCall
  static parallel(description: string, ...tasks: [ TaskCall, ...TaskCall[] ]): TaskCall

  static parallel(first: string | TaskCall, ...calls: TaskCall[]): TaskCall {
    // Parse our arguments, the description is optional and precedes anything else
    const { description, tasks } = typeof first === 'string' ? {
      description: first,
      tasks: calls,
    } : {
      description: '',
      tasks: [ first, ...calls ],
    }

    // Create a new task call
    return makeCall(new Task(description, () => new Parallel(tasks)))
  }
}
