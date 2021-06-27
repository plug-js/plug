import type { Log } from '../utils/log'
import type { MochaOptions as Options } from 'mocha'
import type { Plug } from '../pipe'
import type { Run } from '../run'

import type { Files } from '../files'
import { install } from '../pipe'

import { SourceMapsPlug } from './sourcemaps'
import { FilePath } from '../utils/paths'
import { getRelativePath } from '../utils/paths'
import { parseOptions } from '../utils/options'
import type { Matcher, MatchOptions } from '../utils/match'
import { match } from '../utils/match'
import { extname } from 'path'
import { parallelize } from '../utils/parallelize'
import { runMocha } from '../utils/mocha'

/* ========================================================================== *
 * MOCHA PLUG                                                                 *
 * ========================================================================== */

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    mocha: PlugExtension<P, typeof MochaPlug>
  }
}

interface MochaOptions extends MatchOptions, Options {
  matchOriginalPaths?: boolean,
  reporter?: string,
}

type MochaArguments = [ string, ...string[], MochaOptions ] | [ string, ...string[] ]

export class MochaPlug implements Plug {
  #matchOriginalPaths: boolean
  #options: Mocha.MochaOptions
  #matcher: Matcher

  constructor(...args: MochaArguments) {
    const { globs, options: { matchOriginalPaths, ...options } } =
        parseOptions(args, {
          matchOriginalPaths: true,
        })

    this.#matcher = match({ globs, options })
    this.#matchOriginalPaths = matchOriginalPaths
    this.#options = options
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const time = log.start()

    // We can only run ".js" files, so let's start filtering stuff out...
    const tests = new Set<FilePath>()
    for (const file of input) {
      if (extname(file.absolutePath) !== '.js') continue
      const path = this.#matchOriginalPaths ? file.originalPath : file.absolutePath
      const relativePath = getRelativePath(input.directory, path)
      if (this.#matcher(relativePath)) tests.add(file.absolutePath)
    }

    // Fail if we can't find any test file...
    if (! tests.size) run.fail('No test files found')

    // Prepare our files with source maps
    const files = new Map<FilePath, string>()
    const sources = await new SourceMapsPlug({ sourceMaps: 'inline' }).process(input, run, log)
    await parallelize(sources, async (f) => files.set(f.absolutePath, await f.contents()))

    // Let's prep our mocha run
    const failures = await runMocha({ files: files, tests, options: this.#options })

    // Check for failures
    if (failures) run.fail(`Mocha detected ${failures} test ${failures > 1 ? 'failures' : 'failure'}`)
    log.debug('Mocha processed', tests.size, 'test files in', time)
    return input
  }
}

export const mocha = install('mocha', MochaPlug)
