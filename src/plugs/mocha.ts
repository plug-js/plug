import { extname } from 'path'
import { getRelativePath } from '../utils/paths'
import { install } from '../pipe'
import { match } from '../utils/match'
import { parallelize } from '../utils/parallelize'
import { parseOptions } from '../utils/options'
import { runMocha } from '../detached/mocha'
import { writeSourceMap } from '../files/sourcemap'

import type { FilePath } from '../utils/paths'
import type { Files } from '../files'
import type { Log } from '../utils/log'
import type { Matcher, MatchOptions } from '../utils/match'
import type { MochaOptions as Options } from 'mocha'
import type { Plug } from '../pipe'
import type { Run } from '../run'

/* ========================================================================== *
 * MOCHA PLUG                                                                 *
 * ========================================================================== */

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    mocha: PlugExtension<P, typeof MochaPlug>
  }
}

export interface MochaOptions extends MatchOptions, Options {
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

  // A simple wrapper to `runMocha(...)` in our detached runners for testing!
  protected runMocha(...args: Parameters<typeof runMocha>): ReturnType<typeof runMocha> {
    return runMocha(...args)
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const time = log.start()

    // We can only run ".js" files, so let's start filtering stuff out...
    const tests = new Set<FilePath>()
    for (const file of input) {
      if (extname(file.absolutePath) !== '.js') continue
      const path = this.#matchOriginalPaths ?
          file.originalFile?.absolutePath :
          file.absolutePath
      if (! path) continue
      const relativePath = getRelativePath(input.directory, path)
      if (this.#matcher(relativePath)) tests.add(file.absolutePath)
    }

    // Fail if we can't find any test file...
    if (! tests.size) run.fail('No test files found')

    // Prepare our files with source maps
    const files = new Map<FilePath, string>()
    await parallelize(input, async (file) => {
      if (extname(file.absolutePath) !== '.js') return
      const outputs = await writeSourceMap(file.absolutePath, file, {
        sourceMaps: 'inline', // inline source maps, easier for node to find them
        combineSourceMaps: true, // produce combined source maps for mocha
      }) // default, inline!
      for (const [ path, contents ] of outputs) files.set(path, contents)
    })

    // Let's prep our mocha run
    const failures = await this.runMocha({ files: files, tests, options: this.#options })

    // Check for failures
    if (failures) run.fail(`Mocha detected ${failures} test ${failures > 1 ? 'failures' : 'failure'}`)
    log.debug('Mocha processed', tests.size, 'test files in', time)
    return input
  }
}

export const mocha = install('mocha', MochaPlug)
