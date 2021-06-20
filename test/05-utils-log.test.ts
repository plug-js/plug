import { expect } from 'chai'
import { Files } from '../src/files'
import { Plug } from '../src/pipe'
import { setTaskName } from '../src/project'
import { Run } from '../src/run'
import { Task } from '../src/task'

import {
  LogLevel,
  LogOptions,
  RunLog,
  makeLog,
  options,
} from '../src/utils/log'
import { DirectoryPath } from '../src/utils/paths'

type TestLog = RunLog & { logs: string[] }

function makeTestLog(opts: Partial<Omit<LogOptions, 'colors'>>): TestLog {
  const lines: string[] = []

  Object.assign(options, opts, {
    write: lines.push.bind(lines),
    colors: false,
  })

  const log = makeLog() as TestLog
  log.logs = lines
  return log
}

describe('Log', () => {
  // Default log options to restore after each test
  const defaults = Object.assign({}, options)

  // Convenience plugs and tasks for tests
  const plug1: Plug = { process: (i) => i, name: 'myplug' }
  const task1: Task = { run: () => new Files('/foo' as DirectoryPath) }
  const task2: Task = { run: () => new Files('/foo' as DirectoryPath) }
  setTaskName(task1, 'mytask1')
  setTaskName(task2, 'mytask2')

  afterEach(() => {
    Object.assign(options, defaults)
  })

  it('should log at "debug" level', () => {
    const log = makeTestLog({ level: LogLevel.DEBUG, times: false })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([
      'A simple message',
      '[DEBUG] A debug message',
      '[ALERT] An alert message',
      '[ERROR] An error message',
    ])
  })

  it('should log at "normal" level', () => {
    const log = makeTestLog({ level: LogLevel.BASIC, times: false })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([
      'A simple message',
      '[ALERT] An alert message',
      '[ERROR] An error message',
    ])
  })

  it('should log at "alert" level', () => {
    const log = makeTestLog({ level: LogLevel.ALERT, times: false })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([
      '[ALERT] An alert message',
      '[ERROR] An error message',
    ])
  })

  it('should log at "error" level', () => {
    const log = makeTestLog({ level: LogLevel.ERROR, times: false })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([ '[ERROR] An error message' ])
  })

  it('should not log at "quiet" level', () => {
    const log = makeTestLog({ level: LogLevel.QUIET, times: false })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([])
  })

  it('should log with stack traces', () => {
    const log = makeTestLog({ level: LogLevel.BASIC, times: false })
    const err = new Error('This is a test error')
    log('This is a test message', 'string', 1, true, err)
    expect(log.logs).to.eql([ 'This is a test message \'string\' 1 true\n' + err.stack ])
  })

  it('should log with times', () => {
    const log = makeTestLog({ level: LogLevel.DEBUG, times: true })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    const logs = log.logs
    expect(logs).to.have.length(4)
    expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}.\d{3} A simple message$/)
    expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}.\d{3} \[DEBUG\] A debug message$/)
    expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}.\d{3} \[ALERT\] An alert message$/)
    expect(logs[3]).to.match(/^\d{2}:\d{2}:\d{2}.\d{3} \[ERROR\] An error message$/)
  })

  it('should log to the console', () => {
    options.level = LogLevel.DEBUG
    options.times = true

    function test(level: LogLevel, colors: boolean): void {
      options.colors = colors
      let run = new Run('/foo' as DirectoryPath)
      for (const task of [ undefined, task1, task2 ]) {
        if (task) run = run.for(task)
        for (const plug of [ undefined, plug1 ]) {
          const log = makeLog(run, plug as Plug)
          switch (level) {
            case LogLevel.BASIC: log('A simple message', 1, true, { hello: 'world' }); break
            case LogLevel.DEBUG: log.debug('A debug message', 1, true, { hello: 'world' }); break
            case LogLevel.ALERT: log.alert('An alert message', 1, true, { hello: 'world' }); break
            case LogLevel.ERROR: log.error('An error message', 1, true, { hello: 'world' }); break
          }
        }
      }
    }
    test(LogLevel.BASIC, true)
    test(LogLevel.DEBUG, true)
    test(LogLevel.ALERT, true)
    test(LogLevel.ERROR, true)
    // test(LogLevel.BASIC, false)
    // test(LogLevel.DEBUG, false)
    // test(LogLevel.ALERT, false)
    // test(LogLevel.ERROR, false)
  })
})
