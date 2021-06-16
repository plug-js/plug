import assert from 'assert'
import { VirtualFileList } from './files'
import { Pipe } from './pipe'

type TaskCall = (() => Pipe) & {
  readonly run: () => Promise<void>
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
    // return Pipe.run(this.#source())\
    throw new Error()
  }

  /* ======================================================================== */

  static task(source: () => Pipe): TaskCall
  static task(description: string, source: () => Pipe): TaskCall

  static task(descriptionOrSource: string | (() => Pipe), optionalSource?: () => Pipe): TaskCall {
    // const { description, source } = typeof descriptionOrSource === 'string' ?
    //   { description: descriptionOrSource, source: optionalSource } :
    //   { description: undefined, source: descriptionOrSource }
    // assert(source, 'Task source missing')

    // const task = new Task(source, description)

    // const call = (): Pipe => new Pipe(() => task.run())
    // call.run = () => task.run().then(() => void 0)
    // call.task = task

    // return call

    throw new Error('')
  }
}
