import { expect } from 'chai'

import { Log } from '../src/log'

describe.only('Logger', () => {
  describe('logging levels (default)', () => {
    it('should log', () => {
      const logs: string[] = []
      const log = new Log({ color: false, write: (...args) => void logs.push(...args) })

      log.log(null, null, 'A simple message')
      log.debug(null, null, 'A debug message')
      log.alert(null, null, 'An alert message')
      log.error(null, null, 'An error message')

      expect(logs).to.have.length(3)
      expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} A simple message$/)
      expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] An alert message$/)
      expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
    })

    it('should log debug messages', () => {
      const logs: string[] = []
      const log = new Log({ color: false, debug: true, write: (...args) => void logs.push(...args) })

      log.log(null, null, 'A simple message')
      log.debug(null, null, 'A debug message')
      log.alert(null, null, 'An alert message')
      log.error(null, null, 'An error message')

      expect(logs).to.have.length(4)
      expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} A simple message$/)
      expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[DEBUG\] A debug message$/)
      expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] An alert message$/)
      expect(logs[3]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
    })

    it('should log quietly', () => {
      const logs: string[] = []
      const log = new Log({ color: false, quiet: true, write: (...args) => void logs.push(...args) })

      log.log(null, null, 'A simple message')
      log.debug(null, null, 'A debug message')
      log.alert(null, null, 'An alert message')
      log.error(null, null, 'An error message')

      expect(logs).to.have.length(1)
      expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
    })

    it('should accept but warn when debug and quiet are both specified', () => {
      const logs: string[] = []
      const log = new Log({ color: false, debug: true, quiet: true, write: (...args) => void logs.push(...args) })

      log.log(null, null, 'A simple message')
      log.debug(null, null, 'A debug message')
      log.alert(null, null, 'An alert message')
      log.error(null, null, 'An error message')

      expect(logs).to.have.length(5)
      expect(logs[0]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] Both "quiet" and "debug" logging requested, assuming "debug"$/)
      expect(logs[1]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} A simple message$/)
      expect(logs[2]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[DEBUG\] A debug message$/)
      expect(logs[3]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ALERT\] An alert message$/)
      expect(logs[4]).to.match(/^\d{2}:\d{2}:\d{2}:\d{3} \[ERROR\] An error message$/)
    })
  })

  describe('visual output', () => {
    const log = new Log({ debug: true, quiet: false, color: true })

    it('should log', () => {
      log.log(null, null, 'A simple message', 1, true, { hello: 'world' })
      log.debug(null, null, 'A debug message', 1, true, { hello: 'world' })
      log.alert(null, null, 'An alert message', 1, true, { hello: 'world' })
      log.error(null, null, 'An error message', 1, true, { hello: 'world' })
      log.error(null, null, 'An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
    })

    it('should log from a task', () => {
      log.log(<any> { name: 'theTask' }, null, 'A simple message', 1, true, { hello: 'world' })
      log.debug(<any> { name: 'theTask' }, null, 'A debug message', 1, true, { hello: 'world' })
      log.alert(<any> { name: 'theTask' }, null, 'An alert message', 1, true, { hello: 'world' })
      log.error(<any> { name: 'theTask' }, null, 'An error message', 1, true, { hello: 'world' })
      log.error(<any> { name: 'theTask' }, null, 'An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
    })

    it('should log from a task / plugin', () => {
      log.log(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'A simple message', 1, true, { hello: 'world' })
      log.debug(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'A debug message', 1, true, { hello: 'world' })
      log.alert(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'An alert message', 1, true, { hello: 'world' })
      log.error(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'An error message', 1, true, { hello: 'world' })
      log.error(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
    })
  })
})
