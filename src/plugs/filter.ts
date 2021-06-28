import { Files } from '../files'
import { getRelativePath } from '../utils/paths'
import { install } from '../pipe'
import { match } from '../utils/match'
import { parseOptions } from '../utils/options'

import type { File } from '../files'
import type { Log } from '../utils/log'
import type { MatchOptions } from '../utils/match'
import type { ParseOptions } from '../utils/options'
import type { Plug } from '../pipe'
import type { Run } from '../run'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    filter: PlugExtension<P, typeof FilterPlug>
  }
}

export class FilterPlug implements Plug {
  #matcher: (path: string) => boolean

  constructor(...args: ParseOptions<MatchOptions>) {
    this.#matcher = match(parseOptions(args))
  }

  protected filter(input: Files, matchOriginalPaths?: boolean): File[] {
    const files: File[] = []
    for (const file of input) {
      const relative = matchOriginalPaths ?
          getRelativePath(input.directory, file.originalPath) :
          getRelativePath(input.directory, file.absolutePath)
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
