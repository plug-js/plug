import type { File } from '../files'
import type { FilterOptions } from '../types/globs'
import type { Log } from '../utils/log'
import type { Options as MicroMatchOptions } from 'micromatch'
import type { Plug } from '../pipe'
import type { Run } from '../run'

import micromatch from 'micromatch'

import { FILTER_OPTIONS_DEFAULTS } from '../types/globs'
import { Files } from '../files'
import { install } from '../pipe'
import { parseGlobOptions, GlobParameters } from '../utils/globs'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    filter: PlugExtension<P, typeof FilterPlug>
  }
}

export class FilterPlug<Options extends FilterOptions = FilterOptions> implements Plug {
  #options: MicroMatchOptions
  #opts: Options
  #globs: string[]

  constructor(...args: GlobParameters<Options>) {
    const { globs, options = {} as Options } = parseGlobOptions(args)

    this.#globs = globs

    this.#opts = {
      ...FILTER_OPTIONS_DEFAULTS,
      ...options,
    } as Options

    this.#options = {
      basename: this.#opts.baseNameMatch,
      nobrace: !this.#opts.braceExpansion,
      nocase: !this.#opts.caseSensitiveMatch,
      dot: this.#opts.dot,
      noextglob: !this.#opts.extglob,
      noglobstar: !this.#opts.globstar,
      ignore: this.#opts.ignore,
    }
  }

  protected get options(): Options {
    return this.#opts
  }

  protected filter(input: Files): File[] {
    const paths = input.map((file) => file.relativePath)
    const matches = micromatch(paths, this.#globs, this.#options)
    const output: File[] = []
    for (const match of matches) {
      const file = input.get(match)
      // istanbul ignore else - file always exists
      if (file) output.push(file)
    }
    return output
  }

  process(input: Files, run: Run, log: Log): Files {
    if (! input.length) return input

    const files = this.filter(input)
    const output = new Files(input)
    files.forEach((file) => output.add(file))

    log.debug('Forwarding', output.length, 'files out of', input.length,
        '(total of', input.length - output.length, 'files removed)')

    return output
  }
}

export const compile = install('filter', FilterPlug)
