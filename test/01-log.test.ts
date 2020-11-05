import { expect } from 'chai'
import { isatty } from 'tty'

import { Log, LogLevel, LogOptions, LogContext, makeLog, default as log } from '../src/log/log'

type TestLog = Log & { logs: string[] }
type TestLogContext = { taskName?: string, pluginName?: string }

function makeTestLog(options: Partial<LogOptions> = {}, { taskName, pluginName }: TestLogContext = {}): TestLog {
  const logs: string[] = []

  const context: LogContext = {}
  if (taskName != null) context.task = <any> { name: taskName }
  if (pluginName != null) context.plugin = <any> { name: pluginName }

  const log: TestLog = Object.assign(makeLog(context), {
    write: (what: string) => logs.push(what),
    level: LogLevel.DEBUG,
    colors: false,
    times: false,
    logs: logs,
  }, options)

  return log
}

describe('Logger', () => {
  afterEach(() => {
    Object.assign(log, {
      write: null,
      level: LogLevel.NORMAL,
      colors: isatty((<any> process.stdout).fd),
      times: true,
    })
  })

  it('should have the right defaults and override them', () => {
    expect(log).to.include({
      write: null,
      level: LogLevel.NORMAL,
      colors: isatty((<any> process.stdout).fd),
      times: true,
    })
  })

  it('should normalise options', () => {
    log.level = LogLevel.NORMAL
    expect(log.level).to.eql(LogLevel.NORMAL)
    log.level = -1
    expect(log.level).to.eql(LogLevel.DEBUG)
    log.level = Number.MAX_SAFE_INTEGER
    expect(log.level).to.eql(LogLevel.QUIET)
    log.level = <any> 'FOOBAR'
    expect(log.level).to.eql(LogLevel.NORMAL)

    log.colors = true
    expect(log.colors).to.be.true
    log.colors = <any> ''
    expect(log.colors).to.be.false
    log.colors = <any> 'FOOBAR'
    expect(log.colors).to.be.true

    log.times = true
    expect(log.times).to.be.true
    log.times = <any> ''
    expect(log.times).to.be.false
    log.times = <any> 'FOOBAR'
    expect(log.times).to.be.true
  })

  it('should log at "debug" level', () => {
    const log = makeTestLog({ level: LogLevel.DEBUG })

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
    const log = makeTestLog({ level: LogLevel.NORMAL })

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
    const log = makeTestLog({ level: LogLevel.ALERT })

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
    const log = makeTestLog({ level: LogLevel.ERROR })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([ '[ERROR] An error message' ])
  })

  it('should not log at "quiet" level', () => {
    const log = makeTestLog({ level: LogLevel.QUIET })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).to.eql([])
  })

  it('should log with stack traces', () => {
    const log = makeTestLog()
    const err = new Error('This is a test error')

    log('The test for an Error being logged', 'string', 1, true, err)

    expect(log.logs).to.eql([ 'The test for an Error being logged \'string\' 1 true\n' + err.stack ])
  })

  it('should log with times', () => {
    const log = makeTestLog({ times: true })

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

  it('should log with colors', () => {
    const log = makeTestLog({ colors: true })

    log('Reset before and after')

    const logs = log.logs
    expect(logs).to.have.length(1)
    expect(logs[0]).to.match(/^\u001b\[0m.*Reset before and after\u001b\[0m$/)
  })

  it('should log for tasks and plugins', () => {
    let log = makeTestLog({}, { taskName: 'theTask' })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).eql([
      '{theTask} A simple message',
      '[DEBUG] {theTask} A debug message',
      '[ALERT] {theTask} An alert message',
      '[ERROR] {theTask} An error message'
    ])

    log = makeTestLog({}, { taskName: '' })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).eql([
      '{anonymous task} A simple message',
      '[DEBUG] {anonymous task} A debug message',
      '[ALERT] {anonymous task} An alert message',
      '[ERROR] {anonymous task} An error message'
    ])

    log = makeTestLog({}, { taskName: 'theTask', pluginName: 'thePlugin' })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).eql([
      '{theTask|thePlugin} A simple message',
      '[DEBUG] {theTask|thePlugin} A debug message',
      '[ALERT] {theTask|thePlugin} An alert message',
      '[ERROR] {theTask|thePlugin} An error message'
    ])

    log = makeTestLog({}, { taskName: 'theTask', pluginName: '' })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).eql([
      '{theTask|anonymous plugin} A simple message',
      '[DEBUG] {theTask|anonymous plugin} A debug message',
      '[ALERT] {theTask|anonymous plugin} An alert message',
      '[ERROR] {theTask|anonymous plugin} An error message'
    ])

    log = makeTestLog({}, { pluginName: 'anotherPlugin' })

    log('A simple message')
    log.debug('A debug message')
    log.alert('An alert message')
    log.error('An error message')

    expect(log.logs).eql([
      'A simple message',
      '[DEBUG] A debug message',
      '[ALERT] An alert message',
      '[ERROR] An error message'
    ])
  })

  it('should log to the console with pretty colors', () => {
    log.level = LogLevel.DEBUG
    log.colors = true
    log.times = true

    log('A simple message', 1, true, { hello: 'world' })
    log.debug('A debug message', 1, true, { hello: 'world' })
    log.alert('An alert message', 1, true, { hello: 'world' })
    log.error('An error message', 1, true, { hello: 'world' })

    const log2 = makeLog({ task: <any> { name: 'theTask' } })

    log2('A task simple message', 1, true, { hello: 'world' })
    log2.debug('A task debug message', 1, true, { hello: 'world' })
    log2.alert('A task alert message', 1, true, { hello: 'world' })
    log2.error('A task error message', 1, true, { hello: 'world' })

    const log2b = makeLog({ task: <any> { name: '' } })

    log2b('A task simple message', 1, true, { hello: 'world' })
    log2b.debug('A task debug message', 1, true, { hello: 'world' })
    log2b.alert('A task alert message', 1, true, { hello: 'world' })
    log2b.error('A task error message', 1, true, { hello: 'world' })

    const log3 = makeLog({ task: <any> { name: 'theTask' }, plugin: <any> { name: 'thePlugin' } })

    log3('A plugin simple message', 1, true, { hello: 'world' })
    log3.debug('A plugin debug message', 1, true, { hello: 'world' })
    log3.alert('A plugin alert message', 1, true, { hello: 'world' })
    log3.error('A plugin error message', 1, true, { hello: 'world' })

    const log3b = makeLog({ task: <any> { name: 'theTask' }, plugin: <any> { name: '' } })

    log3b('A plugin simple message', 1, true, { hello: 'world' })
    log3b.debug('A plugin debug message', 1, true, { hello: 'world' })
    log3b.alert('A plugin alert message', 1, true, { hello: 'world' })
    log3b.error('A plugin error message', 1, true, { hello: 'world' })
  })

  it.skip('should log to the console in black and white', () => {
    log.level = LogLevel.DEBUG
    log.colors = false
    log.times = true

    log('A simple message', 1, true, { hello: 'world' })
    log.debug('A debug message', 1, true, { hello: 'world' })
    log.alert('An alert message', 1, true, { hello: 'world' })
    log.error('An error message', 1, true, { hello: 'world' })

    const log2 = makeLog({ task: <any> { name: 'theTask' } })

    log2('A task simple message', 1, true, { hello: 'world' })
    log2.debug('A task debug message', 1, true, { hello: 'world' })
    log2.alert('A task alert message', 1, true, { hello: 'world' })
    log2.error('A task error message', 1, true, { hello: 'world' })

    const log2b = makeLog({ task: <any> { name: '' } })

    log2b('A task simple message', 1, true, { hello: 'world' })
    log2b.debug('A task debug message', 1, true, { hello: 'world' })
    log2b.alert('A task alert message', 1, true, { hello: 'world' })
    log2b.error('A task error message', 1, true, { hello: 'world' })

    const log3 = makeLog({ task: <any> { name: 'theTask' }, plugin: <any> { name: 'thePlugin' } })

    log3('A plugin simple message', 1, true, { hello: 'world' })
    log3.debug('A plugin debug message', 1, true, { hello: 'world' })
    log3.alert('A plugin alert message', 1, true, { hello: 'world' })
    log3.error('A plugin error message', 1, true, { hello: 'world' })

    const log3b = makeLog({ task: <any> { name: 'theTask' }, plugin: <any> { name: '' } })

    log3b('A plugin simple message', 1, true, { hello: 'world' })
    log3b.debug('A plugin debug message', 1, true, { hello: 'world' })
    log3b.alert('A plugin alert message', 1, true, { hello: 'world' })
    log3b.error('A plugin error message', 1, true, { hello: 'world' })
  })
})
