import { Files } from '../files'
import { install } from '../pipe'

import type { ParseOptions } from '../utils/options'
import type { Plug } from '../pipe'
import { FilterOptions } from '../utils/filter'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    filter: PlugExtension<P, typeof FilterPlug>
  }
}

export class FilterPlug implements Plug {
  #arguments: ParseOptions<FilterOptions>

  constructor(...args: ParseOptions<FilterOptions>) {
    this.#arguments = args
  }

  process(input: Files): Files {
    if (! input.length) return input
    const output = input.fork()

    for (const file of input.filter(...this.#arguments)) output.add(file)
    return output
  }
}

export const filter = install('filter', FilterPlug)
