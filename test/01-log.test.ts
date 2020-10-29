import { expect } from 'chai'
import { isatty } from 'tty'

import { makeLog, makeTestLog, LogLevel } from '../src/log/log'

describe('Logger', () => {
  it('should have the right defaults and override them', () => {
    expect(makeLog().options).to.eql({
      level: LogLevel.NORMAL,
      color: isatty((<any> process.stdout).fd),
      times: true,
      taskName: null,
      pluginName: null,
    })

    expect(makeTestLog().options).to.eql({
      level: LogLevel.DEBUG,
      color: false,
      times: false,
      taskName: null,
      pluginName: null,
    })
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

  it('should log with timestamps', () => {
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

  it('should log with color', () => {
    const log = makeTestLog({ color: true })

    log('Reset before and after')

    const logs = log.logs
    expect(logs).to.have.length(1)
    expect(logs[0]).to.match(/^\u001b\[0m.*Reset before and after\u001b\[0m$/)
  })

  it('should log for tasks and plugins', () => {
    let log = makeTestLog({ taskName: 'theTask' })

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

    log = makeTestLog({ taskName: 'theTask', pluginName: 'thePlugin' })

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

    log = makeTestLog({ pluginName: 'anotherPlugin' })

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
    let log = makeLog({ level: -1, color: true })

    log('A simple message', 1, true, { hello: 'world' })
    log.debug('A debug message', 1, true, { hello: 'world' })
    log.alert('An alert message', 1, true, { hello: 'world' })
    log.error('An error message', 1, true, { hello: 'world' })

    log = makeLog({ taskName: 'theTask' })

    log('A task simple message', 1, true, { hello: 'world' })
    log.debug('A task debug message', 1, true, { hello: 'world' })
    log.alert('A task alert message', 1, true, { hello: 'world' })
    log.error('A task error message', 1, true, { hello: 'world' })

    log = makeLog({ taskName: 'anotherTask', pluginName: 'thePlugIn' })

    log('A plugin simple message', 1, true, { hello: 'world' })
    log.debug('A plugin debug message', 1, true, { hello: 'world' })
    log.alert('A plugin alert message', 1, true, { hello: 'world' })
    log.error('A plugin error message', 1, true, { hello: 'world' })
  })
})
