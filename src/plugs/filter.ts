import type { FilterOptions } from '../types/globs'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import type { Options } from 'micromatch'

import micromatch from 'micromatch'

import { FILTER_OPTIONS_DEFAULTS } from '../types/globs'
import { Files } from '../files'
import { install } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    filter: PlugExtension<P, typeof FilterPlug>
  }
}

type FilterArguments = [ string, ...string[], FilterOptions ] | [ string, ...string[] ]

export class FilterPlug implements Plug {
  #options: Options
  #globs: string[]

  constructor(...args: FilterArguments) {
    const last = args.splice(-1)[0]

    const { globs, options } = typeof last === 'string' ? {
      globs: [ ...args as string[], last ],
      options: {} as FilterOptions,
    } : {
      globs: [ ...args as string[] ],
      options: last,
    }

    this.#globs = globs

    const optionsWithDefaults = {
      ...FILTER_OPTIONS_DEFAULTS,
      ...options,
    }

    this.#options = {
      basename: optionsWithDefaults.baseNameMatch,
      nobrace: !optionsWithDefaults.braceExpansion,
      nocase: !optionsWithDefaults.caseSensitiveMatch,
      dot: optionsWithDefaults.dot,
      noextglob: !optionsWithDefaults.extglob,
      noglobstar: !optionsWithDefaults.globstar,
      ignore: optionsWithDefaults.ignore,
    }
  }

  protected filter(input: Files): Files {
    const paths = input.map((file) => file.relativePath)
    const matches = micromatch(paths, this.#globs, this.#options)
    const output = new Files(input)
    for (const match of matches) {
      const file = input.get(match)
      // istanbul ignore else - file always exists
      if (file) output.add(file)
    }
    return output
  }

  process(input: Files, run: Run, log: Log): Files {
    const output = this.filter(input)
    log.debug('Forwarding', output.length, 'files out of', input.length,
        '(total of', input.length - output.length, 'files removed)')
    return output
  }
}

export const compile = install('filter', FilterPlug)
