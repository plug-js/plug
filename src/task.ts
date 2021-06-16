import assert from 'assert'
import { Plug } from '.'
import { VirtualFileList } from './files'
import { Pipe } from './pipe'
import { getProjectDirectory } from './project'

export type TaskCall = (() => Pipe) & {
  readonly run: () => Promise<VirtualFileList>
  readonly task: Task
}

export class Task implements Plug {
  #description: string | undefined
  #source: () => Pipe

  private constructor(source: () => Pipe, description?: string) {
    this.#description = description || undefined // empty string
    this.#source = source
  }

  get description(): string | undefined {
    return this.#description
  }

  process(input: VirtualFileList): Promise<VirtualFileList> {
    return this.#source().process(input)
  }

  /* ======================================================================== */

  static task(source: () => Pipe): TaskCall
  static task(description: string, source: () => Pipe): TaskCall

  static task(descriptionOrSource: string | (() => Pipe), optionalSource?: () => Pipe): TaskCall {
    const { description, source } = typeof descriptionOrSource === 'string' ?
        { description: descriptionOrSource, source: optionalSource } :
        { description: undefined, source: descriptionOrSource }
    assert(source, 'Task source missing')

    // Create our task, with its source and description
    const task = new Task(source, description)

    // Our task call returns a Pipe initially plugged with the task's process
    const call = (): Pipe => Pipe.pipe().plug(task.process.bind(task))
    // The "run()" (convenience) method runs the task from the project directory
    call.run = () => task.process(new VirtualFileList(getProjectDirectory()))
    // And we just remember our task, too, before returning
    call.task = task
    return call
  }
}
