import { Plug } from '../src/pipe'
import { expect } from 'chai'
import { mock } from './support'
import { LogLevel, LogOptions, RunLog, makeLog, options } from '../src/utils/log'

type TestLog = RunLog & { logs: string[] }

function makeTestLog(opts: Partial<Omit<LogOptions, 'colors'>>): TestLog {
  const lines: string[] = []

  Object.assign(options, opts, {
    write: lines.push.bind(lines),
    colors: false,
  })

  const log = makeLog(undefined as any) as TestLog
  log.logs = lines
  return log
}

describe('Log', () => {
  // Default log options to restore after each test
  const defaults = Object.assign({}, options)

  afterEach(() => {
    Object.assign(options, defaults)
  })

  it('should not log when nothing is specified', () => {
    const log = makeTestLog({ level: LogLevel.DEBUG, times: false })
    ;(<any> log)() // this goes agains typing, but you never know...
    expect(log.logs).to.eql([])
  })

  it('should log at "debug" level', () => {
    const log = makeTestLog({ level: LogLevel.TRACE, times: false })

    log('A simple message')
    log.trace('A trace message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([
      'A simple message',
      '[TRACE] A trace message',
      '[DEBUG] A debug message',
      '[ALERT] An alert message',
      '[ERROR] An error message',
    ])
  })

  it('should log at "debug" level', () => {
    const log = makeTestLog({ level: LogLevel.DEBUG, times: false })

    log('A simple message')
    log.trace('A trace message')
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
    log.trace('A trace message')
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
    log.trace('A trace message')
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
    log.trace('A trace message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([ '[ERROR] An error message' ])
  })

  it('should not log at "quiet" level', () => {
    const log = makeTestLog({ level: LogLevel.QUIET, times: false })

    log('A simple message')
    log.trace('A trace message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([])
  })

  it('should log with stack traces', () => {
    const log = makeTestLog({ level: LogLevel.BASIC, times: false })
    const err = new Error('This is a test error')

    log(err) // Only an error
    expect(log.logs).to.eql([ err.stack ])
    log.logs.splice(0) // Wipe logs for next

    log('Test', 1, true, err) // Error at the end
    expect(log.logs).to.eql([ 'Test 1 true', err.stack ])
    log.logs.splice(0) // Wipe logs for next

    log(err, 'Test', 1, true) // Error at the beginning
    expect(log.logs).to.eql([ err.stack, 'Test 1 true' ])
    log.logs.splice(0) // Wipe logs for next

    log('Test', 1, true, err, 'More', 2, false) // Error at the beginning
    expect(log.logs).to.eql([ 'Test 1 true', err.stack, 'More 2 false' ])
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
    const plug1: Plug = { process: (i) => i, name: 'myplug' }
    options.level = LogLevel.TRACE
    options.times = true

    function test(level: LogLevel, colors: boolean): void {
      options.colors = colors
      let { run, tasks: { task1, task2 } } = mock('/foo', 'task1', 'task2')
      for (const task of [ undefined, task1, task2 ]) {
        if (task) run = run.for(task)
        for (const plug of [ undefined, plug1 ]) {
          const log = makeLog(run, plug as Plug)
          switch (level) {
            case LogLevel.BASIC: log('A simple message', 1, true, { hello: 'world' }); break
            case LogLevel.TRACE: log.trace('A debug message', 1, true, { hello: 'world' }); break
            case LogLevel.DEBUG: log.debug('A debug message', 1, true, { hello: 'world' }); break
            case LogLevel.ALERT: log.alert('An alert message', 1, true, { hello: 'world' }); break
            case LogLevel.ERROR: log.error('An error message', 1, true, { hello: 'world' }); break
          }
        }
      }
    }
    test(LogLevel.BASIC, true)
    test(LogLevel.TRACE, true)
    test(LogLevel.DEBUG, true)
    test(LogLevel.ALERT, true)
    test(LogLevel.ERROR, true)
    // test(LogLevel.BASIC, false)
    // test(LogLevel.DEBUG, false)
    // test(LogLevel.ALERT, false)
    // test(LogLevel.ERROR, false)
  })
})
