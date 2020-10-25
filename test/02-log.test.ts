import { expect } from 'chai'

import { Log } from '../src/log'

describe.only('Logger', () => {
  //   it('should log', () => {
  //     const logs: string[] = []
  //     const log = new Log({ color: false, write: (...args) => void logs.push(...args) })

  //     log.log('A simple message')
  //     log.debug('A debug message')
  //     log.alert('An alert message')
  //     log.error('An error message')

  //     expect(logs).to.have.length(3)
  //     expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} A simple message$/)
  //     expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] An alert message$/)
  //     expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
  //   })

  //   it('should log debug messages', () => {
  //     const logs: string[] = []
  //     const log = new Log({ color: false, debug: true, write: (...args) => void logs.push(...args) })

  //     log.log('A simple message')
  //     log.debug('A debug message')
  //     log.alert('An alert message')
  //     log.error('An error message')

  //     expect(logs).to.have.length(4)
  //     expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} A simple message$/)
  //     expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[DEBUG\] A debug message$/)
  //     expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] An alert message$/)
  //     expect(logs[3]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
  //   })

  //   it('should log quietly', () => {
  //     const logs: string[] = []
  //     const log = new Log({ color: false, quiet: true, write: (...args) => void logs.push(...args) })

  //     log.log('A simple message')
  //     log.debug('A debug message')
  //     log.alert('An alert message')
  //     log.error('An error message')

  //     expect(logs).to.have.length(1)
  //     expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
  //   })

  //   it('should accept but warn when debug and quiet are both specified', () => {
  //     const logs: string[] = []
  //     const log = new Log({ color: false, debug: true, quiet: true, write: (...args) => void logs.push(...args) })

  //     log.log('A simple message')
  //     log.debug('A debug message')
  //     log.alert('An alert message')
  //     log.error('An error message')

  //     expect(logs).to.have.length(5)
  //     expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] Both "quiet" and "debug" logging requested, assuming "debug"$/)
  //     expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} A simple message$/)
  //     expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[DEBUG\] A debug message$/)
  //     expect(logs[3]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] An alert message$/)
  //     expect(logs[4]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
  //   })
  // })

  it('should log to the console', () => {
    let log = new Log({ level: 0, color: true })

    log.log('A simple message', 1, true, { hello: 'world' })
    log.debug('A debug message', 1, true, { hello: 'world' })
    log.alert('An alert message', 1, true, { hello: 'world' })
    log.error('An error message', 1, true, { hello: 'world' })

    log = log.for(<any> { name: 'theTask' })

    log.log('A task simple message', 1, true, { hello: 'world' })
    log.debug('A task debug message', 1, true, { hello: 'world' })
    log.alert('An task alert message', 1, true, { hello: 'world' })
    log.error('An task error message', 1, true, { hello: 'world' })

    log = log.for(<any> { name: 'anotherTask' }, <any> { name: 'thePlugIn' })

    log.log('A plugin simple message', 1, true, { hello: 'world' })
    log.debug('A plugin debug message', 1, true, { hello: 'world' })
    log.alert('An plugin alert message', 1, true, { hello: 'world' })
    log.error('An plugin error message', 1, true, { hello: 'world' })

    log = log.for()

    log.log('An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
  })
})
