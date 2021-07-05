import Mocha from 'mocha'

import { LogLevel, log, logOptions } from '../utils/log'
import { fork } from 'child_process'
import { setupLoader } from '../utils/loader'

import type { FilePath, DirectoryPath } from '../utils/paths'
import type { LogOptions } from '../utils/log'
import type { MochaOptions } from 'mocha'

class NullReporter extends Mocha.reporters.Base {
  constructor(runner: Mocha.Runner, options?: MochaOptions) {
    super(runner, options)
  }
}

if (require.main === module) {
  // istanbul ignore next - can't test for this...
  const timeout = setTimeout(() => {
    log.error('Mocha child timeout waiting for message')
    process.exit(2)
  }, 10000)

  process.on('message', (message: MochaMessage) => {
    clearTimeout(timeout) // we received our message, thanks!
    try {
      const { files: files, tests, options, log: { level, colors, times } } = message

      // Setup our logging and reporting options
      logOptions.colors = colors
      logOptions.times = times
      logOptions.level = level

      // Should we use our "null" reporter (be silent!)
      // istanbul ignore else - always running silent
      if (level === LogLevel.QUIET) options.reporter = NullReporter

      // Setup our loader with the appropriate scripts
      const scripts = new Map<FilePath, string>()
      for (const path in files) {
        scripts.set(path as FilePath, files[path])
      }
      setupLoader(scripts)

      // Prep mocha with its options and files
      const mocha = new Mocha(message.options)
      for (const test of tests.sort()) mocha.addFile(test)

      // Run mocha and report back failures
      const runner = mocha.run(() => {
        process.send?.(runner.stats)
        process.exit(0)
      })
    } catch (error) {
      log.error('Error starting mocha', error)
      process.exit(1)
    }
  })
}

interface MochaMessage {
  log: Pick<LogOptions, 'level' | 'times' | 'colors'>,
  files: Record<string, string>,
  tests: string[],
  options: MochaOptions,
}

export interface MochaRun {
  options: MochaOptions,
  files: Map<FilePath, string>,
  tests: Set<FilePath>,
}

export function runMocha(run: MochaRun, coverageDir?: DirectoryPath): Promise<Mocha.Stats> {
  return new Promise<Mocha.Stats>((resolve, reject) => {
    let stats: (Mocha.Stats | undefined)

    const message: MochaMessage = {
      log: {
        colors: logOptions.colors,
        times: logOptions.times,
        level: logOptions.level,
      },
      options: run.options,
      files: {},
      tests: [],
    }

    run.files.forEach((code, name) => message.files[name] = code)
    run.tests.forEach((name) => message.tests.push(name))

    const child = fork(__filename, { stdio: 'inherit', env: {
      NODE_V8_COVERAGE: coverageDir,
      ...process.env,
    } })

    child.on('message', (message: Mocha.Stats) => stats = message)
    child.on('spawn', () => child.send(message))
    // istanbul ignore next - we test the basics, not all message paths
    child.on('close', (code, signal) => {
      if (code === 0) {
        if (!stats) return reject(new Error('Mocha produced no stats'))
        return resolve(stats)
      }
      if (signal) reject(new Error(`Mocha exited due to signal ${signal}`))
      else reject(new Error(`Mocha failed with error code ${code || -1}`))
    })
  })
}
