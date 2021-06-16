import assert from 'assert'
import { Pipeline } from './pipeline'

type TaskSource = (() => Pipeline) | Pipeline

export class PlugTask extends Pipeline {
  #description: string | undefined

  protected constructor(source: TaskSource, description?: string) {
    super(() => Pipeline.run(typeof source === 'function' ? source() : source))
    this.#description = description
  }

  get description(): string | undefined {
    return this.#description
  }

  run(): Promise<void> {
    return Pipeline.run(this).then(() => {})
  }

  /* ======================================================================== */

  static task(source: TaskSource): () => PlugTask
  static task(description: string, source: TaskSource): () => PlugTask

  static task(descriptionOrSource: string | TaskSource, optionalSource?: TaskSource): () => PlugTask {
    const { description, source } = typeof descriptionOrSource === 'string' ?
      { description: descriptionOrSource, source: optionalSource } :
      { description: undefined, source: descriptionOrSource }
    assert(source, 'Task source missing')
    // return new PlugTask(source, description)
    throw new Error()
  }
}
