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

  // TODO: move me to an utiliy file
  protected filter(input: Files, matchOriginalPaths?: boolean): File[] {
    const files: File[] = []
    if (matchOriginalPaths) {
      for (const file of input) {
        if (! file.originalFile) continue
        const original = file.originalFile.absolutePath
        const relative = getRelativePath(input.directory, original)
        if (this.#matcher(relative)) files.push(file)
      }
    } else {
      for (const file of input) {
        const relative = getRelativePath(input.directory, file.absolutePath)
        if (this.#matcher(relative)) files.push(file)
      }
    }
    return files
  }

  process(input: Files, run: Run, log: Log): Files | Promise<Files> {
    if (! input.length) return input

    const files = this.filter(input)
    const output = input.fork()
    files.forEach((file) => output.add(file))

    log.debug('Forwarding', output.length, 'files out of', input.length,
        '(total of', input.length - output.length, 'files removed)')

    return output
  }
}

export const filter = install('filter', FilterPlug)
