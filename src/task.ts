import assert from 'assert'
import { VirtualFileList } from './files'
import { Pipe } from './pipe'

type TaskCall = (() => Pipe) & {
  readonly task: Task
}

export class Task {
  #description: string | undefined
  #source: () => Pipe

  private constructor(source: () => Pipe, description?: string) {
    this.#description = description
    this.#source = source
  }

  get description(): string | undefined {
    return this.#description
  }

  run(): Promise<VirtualFileList> {
    return Pipe.run(this.#source())
  }

  /* ======================================================================== */

  static task(source: () => Pipe): TaskCall
  static task(description: string, source: () => Pipe): TaskCall

  static task(descriptionOrSource: string | (() => Pipe), optionalSource?: () => Pipe): TaskCall {
    const { description, source } = typeof descriptionOrSource === 'string' ?
      { description: descriptionOrSource, source: optionalSource } :
      { description: undefined, source: descriptionOrSource }
    assert(source, 'Task source missing')

    const task = new Task(source, description)

    const pipe = new Pipe(task.run.bind(task))

    function call(): Pipe {
      return pipe
    }
    call.task = task

    return call
  }
}
