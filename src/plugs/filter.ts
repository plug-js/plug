import type { File } from '../files'
import type { FilterOptions } from '../types/globs'
import type { Log } from '../utils/log'
import type { Matcher } from 'picomatch'
import type { Plug } from '../pipe'
import type { Run } from '../run'

import picomatch from 'picomatch'

import { FILTER_OPTIONS_DEFAULTS } from '../types/globs'
import { Files } from '../files'
import { install } from '../pipe'
import { parseGlobOptions, GlobParameters } from '../utils/globs'
import { getRelativePath } from '../utils/paths'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    filter: PlugExtension<P, typeof FilterPlug>
  }
}

export class FilterPlug<Options extends FilterOptions = FilterOptions> implements Plug {
  #matcher: Matcher
  #options?: Options
  #globs: string[]

  constructor(...args: GlobParameters<Options>) {
    const { globs, options } = parseGlobOptions(args)

    this.#globs = globs
    this.#options = options

    const filterOptions = {
      ...FILTER_OPTIONS_DEFAULTS,
      ...options,
    }

    const matchOptions = {
      basename: filterOptions.baseNameMatch,
      nobrace: !filterOptions.braceExpansion,
      nocase: !filterOptions.caseSensitiveMatch,
      dot: filterOptions.dot,
      noextglob: !filterOptions.extglob,
      noglobstar: !filterOptions.globstar,
      ignore: filterOptions.ignore,
    }

    this.#matcher = picomatch(globs, matchOptions)
  }

  protected get options(): Options {
    return this.#options!
  }

  protected filter(input: Files, matchOriginalPaths?: boolean): File[] {
    const files: File[] = []
    for (const file of input) {
      const relative = matchOriginalPaths ?
          getRelativePath(input.directory, file.originalPath) :
          file.relativePath
      if (this.#matcher(relative)) files.push(file)
    }
    return files
  }

  process(input: Files, run: Run, log: Log): Files | Promise<Files> {
    if (! input.length) return input

    const files = this.filter(input)
    const output = new Files(input)
    files.forEach((file) => output.add(file))

    log.debug('Forwarding', output.length, 'files out of', input.length,
        '(total of', input.length - output.length, 'files removed)')

    return output
  }
}

export const filter = install('filter', FilterPlug)
