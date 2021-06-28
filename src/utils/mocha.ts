import Mocha from 'mocha'

import { LogLevel, log, logOptions } from './log'
import { fork } from 'child_process'
import { setupLoader } from './loader'

import type { FilePath, DirectoryPath } from './paths'
import type { LogOptions } from './log'
import type { MochaOptions } from 'mocha'

class NullReporter extends Mocha.reporters.Base {
  constructor(runner: Mocha.Runner, options?: MochaOptions) {
    super(runner, options)
  }
}

if (require.main === module) {
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
      mocha.run((failures) => {
        process.send?.(failures)
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

export function runMocha(run: MochaRun, coverageDir?: DirectoryPath): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let failures = -1

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

    child.on('message', (message: number) => failures = message)
    child.on('spawn', () => child.send(message))
    child.on('close', (code, signal) => {
      if (code === 0) return resolve(failures)
      if (signal) reject(new Error(`Mocha exited due to signal ${signal}`))
      else reject(new Error(`Mocha failed with code ${code || -1}`))
    })
  })
}