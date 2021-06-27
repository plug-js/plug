import { Log, LogLevel } from '../utils/log'
import type { MochaOptions as Options } from 'mocha'
import type { Plug } from '../pipe'
import type { Run } from '../run'

import type { File, Files } from '../files'
import { install } from '../pipe'

import Mocha from 'mocha'
import { SourceMapsPlug } from './sourcemaps'
import { FilePath, getRelativePath } from '../utils/paths'
import { setupLoader } from '../utils/loader'
import { parseOptions } from '../utils/options'
import { match, Matcher, MatchOptions } from '../utils/match'
import { extname } from 'path'

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

class NullReporter extends Mocha.reporters.Base {
  constructor(runner: Mocha.Runner, options?: Options) {
    super(runner, options)
  }
}

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
    const files: File[] = []
    for (const file of input) {
      if (extname(file.absolutePath) !== '.js') continue
      const path = this.#matchOriginalPaths ? file.originalPath : file.absolutePath
      const relativePath = getRelativePath(input.directory, path)
      if (this.#matcher(relativePath)) files.push(file)
    }

    // Fail if we can't find any test file...
    if (! files.length) run.fail('No test files found')

    // Sort our matching test files before sending them off to Mocha
    files.sort((a, b): number => {
      return this.#matchOriginalPaths ?
        a.originalPath.localeCompare(b.originalPath) :
        a.absolutePath.localeCompare(b.absolutePath)
    })

    // Clone our options and see if we have to report...
    const options = { ...this.#options }
    if (log.level >= LogLevel.QUIET) options.reporter = NullReporter

    // Create Mocha and add all our test files...
    const mocha = new Mocha(options)
    for (const file of files) {
      log.trace(`Mocha testing with "${file.absolutePath}"`)
      mocha.addFile(file.absolutePath)
    }

    const loadables = await new SourceMapsPlug({ sourceMaps: 'inline' }).process(input, run, log)
    const sources = loadables.list().reduce((map, file) =>
      map.set(file.absolutePath, file.contentsSync()), new Map<FilePath, string>())
    setupLoader(sources)

    await mocha.loadFilesAsync()
    setupLoader()

    const failures = await new Promise<number>((resolve, reject) => {
      try {
        mocha.run((failures) => resolve(failures))
      } catch (error) {
        reject(error)
      }
    })

    if (failures) run.fail(`Mocha detected ${failures} test ${failures > 1 ? 'failures' : 'failure'}`)
    log.debug('Mocha processed', files.length, 'test files in', time)
    return input
  }
}

export const mocha = install('mocha', MochaPlug)
